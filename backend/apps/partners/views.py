from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.backoffice.permissions import IsJappandaleAdmin
from apps.campaigns.models import Campaign
from apps.campaigns.serializers import CampaignListSerializer
from apps.guichet.models import FinancingScheme
from apps.guichet.serializers import FinancingSchemeSerializer, FinancingSchemeWriteSerializer
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import PartnerProjectInterest, ProjectDocument
from .permissions import IsValidatedPartner, IsValidatedPorteur
from .serializers import (
    PartnerInterestCreateSerializer,
    PartnerProjectInterestSerializer,
    ProjectDocumentCreateSerializer,
    ProjectDocumentSerializer,
)


def _is_admin(user):
    return user.is_authenticated and user.role == user.Role.ADMIN


class PartnerDashboardView(APIView):
    permission_classes = [IsValidatedPartner]

    def get(self, request):
        projects = Campaign.objects.filter(status=Campaign.Status.PUBLIEE).select_related("owner")
        category = request.query_params.get("category")
        search = request.query_params.get("search")
        location = request.query_params.get("location")
        if category:
            projects = projects.filter(category=category)
        if search:
            projects = projects.filter(title__icontains=search)
        if location:
            projects = projects.filter(location__icontains=location)
        return Response(
            {
                "campaigns": CampaignListSerializer(projects, many=True).data,
                "interests": PartnerProjectInterestSerializer(
                    request.user.project_interests.select_related("campaign", "campaign__owner"), many=True
                ).data,
                "schemes": FinancingSchemeSerializer(
                    FinancingScheme.objects.filter(created_by=request.user), many=True
                ).data,
            }
        )


class PartnerInterestListCreateView(APIView):
    permission_classes = [IsValidatedPartner]

    def get(self, request):
        interests = request.user.project_interests.select_related("campaign", "campaign__owner")
        return Response(PartnerProjectInterestSerializer(interests, many=True).data)

    def post(self, request):
        serializer = PartnerInterestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = get_object_or_404(
            Campaign, slug=serializer.validated_data["campaign_slug"], status=Campaign.Status.PUBLIEE
        )
        interest, created = PartnerProjectInterest.objects.get_or_create(
            partner=request.user,
            campaign=campaign,
            defaults={"note": serializer.validated_data.get("note", "")},
        )
        if created:
            notify_user(
                recipient=campaign.owner,
                kind=Notification.Kind.MESSAGE_RECEIVED,
                subject="Un partenaire s'intéresse à votre projet",
                message=f"{request.user.organization_name or request.user.email} a manifesté son intérêt pour « {campaign.title} ».",
                action_url=f"/campagnes/{campaign.slug}",
            )
        return Response(
            PartnerProjectInterestSerializer(interest).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PartnerSchemeListCreateView(APIView):
    permission_classes = [IsValidatedPartner]

    def get(self, request):
        return Response(
            FinancingSchemeSerializer(FinancingScheme.objects.filter(created_by=request.user), many=True).data
        )

    def post(self, request):
        serializer = FinancingSchemeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        values["status"] = FinancingScheme.Status.BROUILLON
        scheme = FinancingScheme.objects.create(created_by=request.user, **values)
        return Response(FinancingSchemeSerializer(scheme).data, status=status.HTTP_201_CREATED)


class PartnerSchemeDetailView(APIView):
    permission_classes = [IsValidatedPartner]

    def patch(self, request, scheme_id):
        scheme = get_object_or_404(FinancingScheme, pk=scheme_id, created_by=request.user)
        serializer = FinancingSchemeWriteSerializer(scheme, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        values.pop("status", None)
        for field, value in values.items():
            setattr(scheme, field, value)
        scheme.status = FinancingScheme.Status.BROUILLON
        scheme.save()
        return Response(FinancingSchemeSerializer(scheme).data)


class ProjectDocumentListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsValidatedPorteur()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        documents = ProjectDocument.objects.select_related("campaign", "uploaded_by")
        campaign_slug = request.query_params.get("campaign")
        if campaign_slug:
            documents = documents.filter(campaign__slug=campaign_slug)
        if _is_admin(request.user):
            pass
        elif request.user.role == request.user.Role.PORTEUR:
            documents = documents.filter(campaign__owner=request.user)
        elif request.user.role == request.user.Role.PARTENAIRE:
            if not (
                request.user.is_email_verified
                and request.user.kyc_status == request.user.KycStatus.VALIDE
            ):
                raise PermissionDenied("Votre compte partenaire doit être vérifié.")
            documents = documents.filter(
                campaign__status=Campaign.Status.PUBLIEE, shared_with_partners=True
            )
        else:
            documents = documents.none()
        return Response(ProjectDocumentSerializer(documents, many=True).data)

    def post(self, request):
        serializer = ProjectDocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = get_object_or_404(Campaign, slug=serializer.validated_data.pop("campaign_slug"))
        if campaign.owner_id != request.user.id:
            raise PermissionDenied("Vous ne pouvez ajouter un document qu'à vos propres projets.")
        document = serializer.save(campaign=campaign, uploaded_by=request.user)
        return Response(ProjectDocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class ProjectDocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_document(self, request, document_id):
        document = get_object_or_404(ProjectDocument.objects.select_related("campaign"), pk=document_id)
        if _is_admin(request.user) or document.campaign.owner_id == request.user.id:
            return document
        if (
            request.user.role == request.user.Role.PARTENAIRE
            and request.user.is_email_verified
            and request.user.kyc_status == request.user.KycStatus.VALIDE
            and document.shared_with_partners
            and document.campaign.status == Campaign.Status.PUBLIEE
        ):
            return document
        raise PermissionDenied("Vous n'avez pas accès à ce document.")

    def delete(self, request, document_id):
        document = self._get_document(request, document_id)
        if not (_is_admin(request.user) or document.campaign.owner_id == request.user.id):
            raise PermissionDenied("Vous ne pouvez pas supprimer ce document.")
        document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectDocumentFileView(ProjectDocumentDetailView):
    def get(self, request, document_id):
        document = self._get_document(request, document_id)
        return FileResponse(document.file.open("rb"), as_attachment=True, filename=document.file.name.rsplit("/", 1)[-1])


class AdminPartnerInterestListView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def get(self, request):
        interests = PartnerProjectInterest.objects.select_related("partner", "campaign").all()
        return Response(
            [
                {
                    "id": interest.id,
                    "partner": {
                        "id": interest.partner_id,
                        "name": interest.partner.organization_name or interest.partner.email,
                        "type": interest.partner.get_partner_type_display(),
                    },
                    "campaign": {"slug": interest.campaign.slug, "title": interest.campaign.title},
                    "status": interest.status,
                    "status_display": interest.get_status_display(),
                    "created_at": interest.created_at,
                }
                for interest in interests
            ]
        )
