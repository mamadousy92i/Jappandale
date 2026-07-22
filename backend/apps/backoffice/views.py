import mimetypes

from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction
from django.db.models import Sum
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.campaigns.models import Campaign, CampaignReport
from apps.contributions.models import Contribution
from apps.core.models import SupportRequest
from apps.kyc.models import KycAuditLog, KycDocument
from apps.kyc.services import missing_required_documents
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .permissions import IsJappandaleAdmin
from .serializers import (
    CampaignDecisionSerializer,
    KycDecisionSerializer,
    ReportReviewSerializer,
    SupportReviewSerializer,
)

User = get_user_model()


def _person(user):
    return {
        "id": user.id,
        "name": f"{user.first_name} {user.last_name}".strip() or user.email,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
    }


class DashboardView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def get(self, request):
        confirmed = Contribution.objects.filter(status=Contribution.Status.CONFIRMEE)
        pending_kyc = (
            User.objects.filter(kyc_status=User.KycStatus.EN_ATTENTE)
            .prefetch_related("kyc_documents")
            .order_by("date_joined")[:30]
        )
        pending_campaigns = (
            Campaign.objects.filter(status=Campaign.Status.EN_MODERATION)
            .select_related("owner")
            .order_by("created_at")[:30]
        )
        open_reports = (
            CampaignReport.objects.exclude(
                status__in=[CampaignReport.Status.RESOLU, CampaignReport.Status.CLASSE]
            )
            .select_related("campaign", "reporter")
            .order_by("created_at")[:30]
        )
        open_support = (
            SupportRequest.objects.exclude(status=SupportRequest.Status.RESOLUE)
            .select_related("user")
            .order_by("created_at")[:30]
        )
        recent_contributions = confirmed.select_related("campaign", "contributor")[:10]

        return Response(
            {
                "metrics": {
                    "pending_kyc": User.objects.filter(
                        kyc_status=User.KycStatus.EN_ATTENTE
                    ).count(),
                    "pending_campaigns": Campaign.objects.filter(
                        status=Campaign.Status.EN_MODERATION
                    ).count(),
                    "open_reports": CampaignReport.objects.exclude(
                        status__in=[CampaignReport.Status.RESOLU, CampaignReport.Status.CLASSE]
                    ).count(),
                    "open_support": SupportRequest.objects.exclude(
                        status=SupportRequest.Status.RESOLUE
                    ).count(),
                    "published_campaigns": Campaign.objects.filter(
                        status=Campaign.Status.PUBLIEE
                    ).count(),
                    "users": User.objects.filter(is_active=True).count(),
                    "confirmed_contributions": confirmed.count(),
                    "confirmed_amount": confirmed.aggregate(total=Sum("amount"))["total"] or 0,
                },
                "kyc": [
                    {
                        "user": _person(user),
                        "submitted_at": max(
                            (document.uploaded_at for document in user.kyc_documents.all()),
                            default=user.date_joined,
                        ),
                        "documents": [
                            {
                                "id": document.id,
                                "type": document.document_type,
                                "type_display": document.get_document_type_display(),
                                "file_url": (
                                    "/api/backoffice/kyc-documents/"
                                    + signing.dumps(
                                        {"document_id": document.id}, salt="jappandale-kyc-file"
                                    )
                                    + "/file/"
                                ),
                            }
                            for document in user.kyc_documents.all()
                        ],
                    }
                    for user in pending_kyc
                ],
                "campaigns": [
                    {
                        "id": campaign.id,
                        "slug": campaign.slug,
                        "title": campaign.title,
                        "summary": campaign.summary,
                        "category": campaign.get_category_display(),
                        "location": campaign.location,
                        "goal_amount": campaign.goal_amount,
                        "owner": _person(campaign.owner),
                        "submitted_at": campaign.updated_at,
                    }
                    for campaign in pending_campaigns
                ],
                "reports": [
                    {
                        "id": report.id,
                        "campaign": {"slug": report.campaign.slug, "title": report.campaign.title},
                        "reporter": _person(report.reporter),
                        "reason": report.get_reason_display(),
                        "details": report.details,
                        "status": report.status,
                        "admin_note": report.admin_note,
                        "created_at": report.created_at,
                    }
                    for report in open_reports
                ],
                "support": [
                    {
                        "id": support.id,
                        "name": support.name,
                        "email": support.email,
                        "subject": support.subject,
                        "message": support.message,
                        "status": support.status,
                        "admin_note": support.admin_note,
                        "created_at": support.created_at,
                    }
                    for support in open_support
                ],
                "recent_contributions": [
                    {
                        "reference": str(contribution.public_reference),
                        "campaign": contribution.campaign.title,
                        "contributor": contribution.contributor.email,
                        "amount": contribution.amount,
                        "confirmed_at": contribution.confirmed_at,
                    }
                    for contribution in recent_contributions
                ],
            }
        )


class KycDocumentFileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            payload = signing.loads(token, salt="jappandale-kyc-file", max_age=600)
        except (signing.BadSignature, signing.SignatureExpired):
            return Response(status=status.HTTP_404_NOT_FOUND)
        document = get_object_or_404(KycDocument, pk=payload.get("document_id"))
        content_type = mimetypes.guess_type(document.file.name)[0] or "application/octet-stream"
        return FileResponse(
            document.file.open("rb"),
            content_type=content_type,
            as_attachment=False,
            filename=document.file.name.rsplit("/", 1)[-1],
        )


class KycDecisionView(APIView):
    permission_classes = [IsJappandaleAdmin]

    @transaction.atomic
    def post(self, request, user_id):
        serializer = KycDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_object_or_404(User, pk=user_id, kyc_status=User.KycStatus.EN_ATTENTE)
        decision = serializer.validated_data["decision"]
        note = serializer.validated_data.get("note", "").strip()
        if decision == User.KycStatus.VALIDE:
            missing = missing_required_documents(user)
            if missing:
                return Response(
                    {"documents": ["Pièces manquantes : " + ", ".join(missing)]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        previous_status = user.kyc_status
        user.kyc_status = decision
        user.kyc_review_note = note
        user.kyc_reviewed_at = timezone.now()
        user.kyc_reviewed_by = request.user
        user.save(
            update_fields=["kyc_status", "kyc_review_note", "kyc_reviewed_at", "kyc_reviewed_by"]
        )
        validated = decision == User.KycStatus.VALIDE
        KycAuditLog.objects.create(
            user=user,
            actor=request.user,
            action=KycAuditLog.Action.VALIDATED if validated else KycAuditLog.Action.REJECTED,
            previous_status=previous_status,
            new_status=decision,
            note=note,
        )
        notify_user(
            recipient=user,
            kind=Notification.Kind.KYC_VALIDATED if validated else Notification.Kind.KYC_REJECTED,
            subject="Votre identité a été validée" if validated else "Votre dossier KYC doit être complété",
            message=(
                "Votre vérification d’identité est validée."
                if validated
                else f"Votre dossier a été rejeté. Motif : {note}"
            ),
            action_url="/compte",
        )
        return Response({"detail": "Décision KYC enregistrée."})


class CampaignDecisionView(APIView):
    permission_classes = [IsJappandaleAdmin]

    @transaction.atomic
    def post(self, request, campaign_id):
        serializer = CampaignDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = get_object_or_404(
            Campaign, pk=campaign_id, status=Campaign.Status.EN_MODERATION
        )
        decision = serializer.validated_data["decision"]
        note = serializer.validated_data.get("note", "").strip()
        campaign.status = decision
        campaign.moderation_note = note if decision == Campaign.Status.REJETEE else ""
        update_fields = ["status", "moderation_note"]
        published = decision == Campaign.Status.PUBLIEE
        if published:
            campaign.published_at = timezone.now()
            update_fields.append("published_at")
        campaign.save(update_fields=update_fields)
        notify_user(
            recipient=campaign.owner,
            kind=(
                Notification.Kind.CAMPAIGN_PUBLISHED
                if published
                else Notification.Kind.CAMPAIGN_REJECTED
            ),
            subject="Votre campagne est publiée" if published else "Votre campagne doit être corrigée",
            message=(
                f"La campagne « {campaign.title} » est maintenant visible au public."
                if published
                else f"La campagne « {campaign.title} » a été rejetée. Motif : {note}"
            ),
            action_url=f"/campagnes/{campaign.slug}" if published else "/compte",
        )
        return Response({"detail": "Décision de modération enregistrée."})


class ReportReviewView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def patch(self, request, report_id):
        serializer = ReportReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = get_object_or_404(CampaignReport, pk=report_id)
        report.status = serializer.validated_data["status"]
        report.admin_note = serializer.validated_data.get("admin_note", "").strip()
        report.save(update_fields=["status", "admin_note", "updated_at"])
        return Response({"detail": "Signalement mis à jour."})


class SupportReviewView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def patch(self, request, request_id):
        serializer = SupportReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        support = get_object_or_404(SupportRequest, pk=request_id)
        support.status = serializer.validated_data["status"]
        support.admin_note = serializer.validated_data.get("admin_note", "").strip()
        support.save(update_fields=["status", "admin_note", "updated_at"])
        return Response({"detail": "Demande d’assistance mise à jour."})
