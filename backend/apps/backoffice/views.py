import mimetypes
import csv

from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction
from django.db.models import Sum
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.campaigns.models import Campaign, CampaignAuditLog, CampaignReport
from apps.contributions.models import Contribution
from apps.core.models import SupportReply, SupportRequest
from apps.core.email import send_branded_email
from apps.kyc.models import KycAuditLog, KycDocument
from apps.kyc.services import missing_required_documents
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .permissions import IsJappandaleAdmin
from .serializers import (
    CampaignDecisionSerializer,
    CampaignWorkflowSerializer,
    KycDecisionSerializer,
    ReportReviewSerializer,
    SupportReplySerializer,
    SupportReviewSerializer,
    UserManagementSerializer,
    WorkAssignmentSerializer,
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


def _admin_or_none(admin_id):
    if admin_id is None:
        return None
    return get_object_or_404(User, pk=admin_id, role=User.Role.ADMIN, is_active=True)


class DashboardView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def get(self, request):
        confirmed = Contribution.objects.filter(status=Contribution.Status.CONFIRMEE)
        pending_kyc = (
            User.objects.filter(kyc_status=User.KycStatus.EN_ATTENTE)
            .select_related("kyc_assigned_to")
            .prefetch_related("kyc_documents")
            .order_by("date_joined")[:30]
        )
        managed_campaigns = (
            Campaign.objects.filter(
                status__in=[
                    Campaign.Status.EN_MODERATION,
                    Campaign.Status.PUBLIEE,
                    Campaign.Status.SUSPENDUE,
                ]
            )
            .select_related("owner", "moderation_assigned_to")
            .order_by("-updated_at")[:100]
        )
        open_reports = (
            CampaignReport.objects.exclude(
                status__in=[CampaignReport.Status.RESOLU, CampaignReport.Status.CLASSE]
            )
            .select_related("campaign", "reporter", "assigned_to")
            .order_by("created_at")[:30]
        )
        open_support = (
            SupportRequest.objects.exclude(status=SupportRequest.Status.RESOLUE)
            .select_related("user", "assigned_to")
            .prefetch_related("replies__sender")
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
                    "suspended_campaigns": Campaign.objects.filter(
                        status=Campaign.Status.SUSPENDUE
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
                        "assigned_to": _person(user.kyc_assigned_to) if user.kyc_assigned_to else None,
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
                        "status": campaign.status,
                        "status_display": campaign.get_status_display(),
                        "suspension_note": campaign.suspension_note,
                        "assigned_to": _person(campaign.moderation_assigned_to) if campaign.moderation_assigned_to else None,
                        "audit": [
                            {
                                "action": event.get_action_display(),
                                "note": event.note,
                                "actor": event.actor.email if event.actor else "Système",
                                "created_at": event.created_at,
                            }
                            for event in campaign.audit_logs.select_related("actor").all()[:5]
                        ],
                    }
                    for campaign in managed_campaigns
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
                        "assigned_to": _person(report.assigned_to) if report.assigned_to else None,
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
                        "assigned_to": _person(support.assigned_to) if support.assigned_to else None,
                        "replies": [
                            {
                                "id": reply.id,
                                "subject": reply.subject,
                                "message": reply.message,
                                "sender": reply.sender.email,
                                "delivery_status": reply.delivery_status,
                                "created_at": reply.created_at,
                            }
                            for reply in support.replies.select_related("sender").all()
                        ],
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
                "admins": [
                    _person(admin)
                    for admin in User.objects.filter(
                        role=User.Role.ADMIN, is_active=True
                    ).order_by("first_name", "email")
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
        previous_status = campaign.status
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
        CampaignAuditLog.objects.create(
            campaign=campaign,
            actor=request.user,
            action=(
                CampaignAuditLog.Action.PUBLISHED
                if published
                else CampaignAuditLog.Action.REJECTED
            ),
            previous_status=previous_status,
            new_status=decision,
            note=note,
        )
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
        if "assigned_to" in serializer.validated_data:
            report.assigned_to = _admin_or_none(serializer.validated_data["assigned_to"])
        report.save(update_fields=["status", "admin_note", "assigned_to", "updated_at"])
        return Response({"detail": "Signalement mis à jour."})


class SupportReviewView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def patch(self, request, request_id):
        serializer = SupportReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        support = get_object_or_404(SupportRequest, pk=request_id)
        support.status = serializer.validated_data["status"]
        support.admin_note = serializer.validated_data.get("admin_note", "").strip()
        if "assigned_to" in serializer.validated_data:
            support.assigned_to = _admin_or_none(serializer.validated_data["assigned_to"])
        support.save(update_fields=["status", "admin_note", "assigned_to", "updated_at"])
        return Response({"detail": "Demande d’assistance mise à jour."})


class WorkAssignmentView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def post(self, request):
        serializer = WorkAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        kind = serializer.validated_data["kind"]
        object_id = serializer.validated_data["object_id"]
        admin = _admin_or_none(serializer.validated_data.get("admin_id"))
        mapping = {
            "kyc": (User, "kyc_assigned_to"),
            "campaign": (Campaign, "moderation_assigned_to"),
            "report": (CampaignReport, "assigned_to"),
            "support": (SupportRequest, "assigned_to"),
        }
        model, field = mapping[kind]
        obj = get_object_or_404(model, pk=object_id)
        setattr(obj, field, admin)
        obj.save(update_fields=[field])
        return Response({"detail": "Attribution mise à jour."})


class CampaignWorkflowView(APIView):
    permission_classes = [IsJappandaleAdmin]

    @transaction.atomic
    def post(self, request, campaign_id):
        serializer = CampaignWorkflowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = get_object_or_404(Campaign, pk=campaign_id)
        action = serializer.validated_data["action"]
        note = serializer.validated_data.get("note", "").strip()
        previous_status = campaign.status
        if action == "SUSPEND" and campaign.status == Campaign.Status.PUBLIEE:
            campaign.status = Campaign.Status.SUSPENDUE
            campaign.suspension_note = note
            campaign.suspended_at = timezone.now()
            audit_action = CampaignAuditLog.Action.SUSPENDED
        elif action == "REACTIVATE" and campaign.status == Campaign.Status.SUSPENDUE:
            campaign.status = Campaign.Status.PUBLIEE
            campaign.suspension_note = ""
            campaign.suspended_at = None
            audit_action = CampaignAuditLog.Action.REACTIVATED
        elif action == "CLOSE" and campaign.status in (
            Campaign.Status.PUBLIEE,
            Campaign.Status.SUSPENDUE,
        ):
            campaign.status = Campaign.Status.CLOTUREE
            campaign.suspension_note = note
            audit_action = CampaignAuditLog.Action.CLOSED
        else:
            return Response(
                {"action": ["Cette transition n’est pas autorisée pour ce statut."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        campaign.save(
            update_fields=["status", "suspension_note", "suspended_at", "updated_at"]
        )
        CampaignAuditLog.objects.create(
            campaign=campaign,
            actor=request.user,
            action=audit_action,
            previous_status=previous_status,
            new_status=campaign.status,
            note=note,
        )
        notify_user(
            recipient=campaign.owner,
            kind={
                "SUSPEND": Notification.Kind.CAMPAIGN_SUSPENDED,
                "REACTIVATE": Notification.Kind.CAMPAIGN_REACTIVATED,
                "CLOSE": Notification.Kind.CAMPAIGN_CLOSED,
            }[action],
            subject=f"Statut mis à jour : {campaign.title}",
            message=(
                f"La campagne « {campaign.title} » est maintenant {campaign.get_status_display().lower()}."
                + (f" Motif : {note}" if note else "")
            ),
            action_url="/compte",
        )
        return Response({"detail": "Statut de la campagne mis à jour."})


class SupportReplyView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def post(self, request, request_id):
        serializer = SupportReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        support = get_object_or_404(SupportRequest, pk=request_id)
        delivery_status = SupportReply.DeliveryStatus.SENT
        delivery_error = ""
        try:
            send_branded_email(
                subject=serializer.validated_data["subject"],
                message=serializer.validated_data["message"],
                recipient_list=[support.email],
                headline="Réponse de l’équipe Jappandale",
                eyebrow="SERVICE D’ASSISTANCE",
                fail_silently=False,
            )
        except Exception as error:
            delivery_status = SupportReply.DeliveryStatus.FAILED
            delivery_error = str(error)[:255]
        reply = SupportReply.objects.create(
            support_request=support,
            sender=request.user,
            recipient_email=support.email,
            subject=serializer.validated_data["subject"],
            message=serializer.validated_data["message"],
            delivery_status=delivery_status,
            delivery_error=delivery_error,
        )
        if delivery_status == SupportReply.DeliveryStatus.FAILED:
            return Response(
                {"detail": "La réponse est enregistrée mais l’e-mail n’a pas été envoyé."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        support.status = SupportRequest.Status.EN_COURS
        support.assigned_to = request.user
        support.save(update_fields=["status", "assigned_to", "updated_at"])
        return Response({"id": reply.id, "detail": "Réponse envoyée et enregistrée."})


class UserListView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def get(self, request):
        queryset = User.objects.all().order_by("-date_joined")
        search = request.query_params.get("search", "").strip()
        role = request.query_params.get("role", "").strip()
        active = request.query_params.get("active", "").strip().lower()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
            )
        if role in User.Role.values:
            queryset = queryset.filter(role=role)
        if active in ("true", "false"):
            queryset = queryset.filter(is_active=active == "true")
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        page_size = 20
        count = queryset.count()
        start = (page - 1) * page_size
        results = queryset[start : start + page_size]
        return Response(
            {
                "count": count,
                "page": page,
                "pages": max((count + page_size - 1) // page_size, 1),
                "results": [
                    {
                        **_person(user),
                        "is_active": user.is_active,
                        "email_verified": user.is_email_verified,
                        "kyc_status": user.kyc_status,
                        "date_joined": user.date_joined,
                        "last_login": user.last_login,
                    }
                    for user in results
                ],
            }
        )


class UserManagementView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def patch(self, request, user_id):
        serializer = UserManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_object_or_404(User, pk=user_id)
        if user == request.user and serializer.validated_data.get("is_active") is False:
            return Response(
                {"is_active": ["Vous ne pouvez pas désactiver votre propre compte."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user == request.user and serializer.validated_data.get("role") not in (
            None,
            User.Role.ADMIN,
        ):
            return Response(
                {"role": ["Vous ne pouvez pas retirer vos propres droits administrateur."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        fields = []
        for field in ("role", "is_active"):
            if field in serializer.validated_data:
                setattr(user, field, serializer.validated_data[field])
                fields.append(field)
        if fields:
            user.save(update_fields=fields)
        return Response({"detail": "Compte utilisateur mis à jour."})


class ExportTicketView(APIView):
    permission_classes = [IsJappandaleAdmin]
    allowed_kinds = {"users", "campaigns", "contributions", "reports", "support"}

    def post(self, request, kind):
        if kind not in self.allowed_kinds:
            return Response(status=status.HTTP_404_NOT_FOUND)
        token = signing.dumps(
            {"kind": kind, "admin_id": request.user.id}, salt="jappandale-export"
        )
        return Response({"url": f"/api/backoffice/exports/download/{token}/"})


class ExportDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            payload = signing.loads(token, salt="jappandale-export", max_age=300)
        except (signing.BadSignature, signing.SignatureExpired):
            return Response(status=status.HTTP_404_NOT_FOUND)
        admin = User.objects.filter(
            pk=payload.get("admin_id"), role=User.Role.ADMIN, is_active=True
        ).first()
        kind = payload.get("kind")
        if not admin or kind not in ExportTicketView.allowed_kinds:
            return Response(status=status.HTTP_404_NOT_FOUND)
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="jappandale-{kind}.csv"'
        response.write("\ufeff")
        writer = csv.writer(response, delimiter=";")
        if kind == "users":
            writer.writerow(["E-mail", "Prénom", "Nom", "Rôle", "Actif", "E-mail vérifié", "KYC", "Inscription"])
            for user in User.objects.all().order_by("-date_joined"):
                writer.writerow([user.email, user.first_name, user.last_name, user.get_role_display(), "Oui" if user.is_active else "Non", "Oui" if user.is_email_verified else "Non", user.get_kyc_status_display(), user.date_joined.isoformat()])
        elif kind == "campaigns":
            writer.writerow(["Titre", "Porteur", "Statut", "Objectif", "Collecté", "Échéance"])
            for item in Campaign.objects.select_related("owner"):
                writer.writerow([item.title, item.owner.email, item.get_status_display(), item.goal_amount, item.collected_amount, item.deadline.isoformat()])
        elif kind == "contributions":
            writer.writerow(["Référence", "Campagne", "Contributeur", "Montant", "Statut", "Date"])
            for item in Contribution.objects.select_related("campaign", "contributor"):
                writer.writerow([item.public_reference, item.campaign.title, item.contributor.email, item.amount, item.get_status_display(), item.created_at.isoformat()])
        elif kind == "reports":
            writer.writerow(["Campagne", "Auteur", "Motif", "Statut", "Date"])
            for item in CampaignReport.objects.select_related("campaign", "reporter"):
                writer.writerow([item.campaign.title, item.reporter.email, item.get_reason_display(), item.get_status_display(), item.created_at.isoformat()])
        else:
            writer.writerow(["Nom", "E-mail", "Objet", "Statut", "Date"])
            for item in SupportRequest.objects.all():
                writer.writerow([item.name, item.email, item.subject, item.get_status_display(), item.created_at.isoformat()])
        return response
