from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import Campaign, CampaignAuditLog, CampaignReport
from apps.notifications.services import notify_admins
from .permissions import IsOwner, IsValidatedPorteur
from .serializers import (
    CampaignDetailSerializer,
    CampaignListSerializer,
    CampaignReportSerializer,
    CampaignUpdateSerializer,
    CampaignWriteSerializer,
)
from .services import close_finished_campaigns

PUBLIC_STATUSES = (Campaign.Status.PUBLIEE, Campaign.Status.CLOTUREE)


class CampaignViewSet(viewsets.ModelViewSet):
    """CRUD des campagnes : lecture publique, écriture réservée aux porteurs validés."""

    lookup_field = "slug"
    permission_classes = [IsValidatedPorteur, IsOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_scope = None

    def get_queryset(self):
        close_finished_campaigns()
        base = Campaign.objects.select_related("owner")
        if self.action == "mine":
            return base.filter(owner=self.request.user)
        if self.action == "retrieve":
            # Campagnes publiques, plus celles du porteur connecté (pour édition).
            visible = Q(status__in=PUBLIC_STATUSES)
            if self.request.user.is_authenticated:
                visible |= Q(owner=self.request.user)
                if self.request.user.is_staff or self.request.user.role == "ADMIN":
                    visible |= Q(
                        status__in=[
                            Campaign.Status.EN_MODERATION,
                            Campaign.Status.SUSPENDUE,
                        ]
                    )
            return base.filter(visible)
        if self.action == "list":
            queryset = base.filter(status__in=PUBLIC_STATUSES)
            category = self.request.query_params.get("category")
            search = self.request.query_params.get("search")
            if category:
                queryset = queryset.filter(category=category)
            if search:
                queryset = queryset.filter(title__icontains=search)
            return queryset
        return base

    def get_serializer_class(self):
        if self.action in ("list", "mine"):
            return CampaignListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CampaignWriteSerializer
        return CampaignDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, status=Campaign.Status.BROUILLON)

    def update(self, request, *args, **kwargs):
        campaign = self.get_object()
        if campaign.status not in (
            Campaign.Status.BROUILLON,
            Campaign.Status.REJETEE,
            Campaign.Status.SUSPENDUE,
        ):
            raise ValidationError(
                "Seule une campagne en brouillon, rejetée ou suspendue peut être modifiée."
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        campaign = self.get_object()
        if campaign.status not in (Campaign.Status.BROUILLON, Campaign.Status.REJETEE):
            raise ValidationError(
                "Seule une campagne en brouillon ou rejetée peut être supprimée."
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def submit(self, request, slug=None):
        campaign = self.get_object()
        if campaign.owner_id != request.user.id:
            raise PermissionDenied("Cette campagne ne vous appartient pas.")
        if campaign.status not in (
            Campaign.Status.BROUILLON,
            Campaign.Status.REJETEE,
            Campaign.Status.SUSPENDUE,
        ):
            raise ValidationError("Cette campagne ne peut pas être soumise à modération.")
        required_fields = {
            "location": "Indiquez la localisation du projet.",
            "beneficiaries": "Précisez les bénéficiaires attendus.",
            "funding_plan": "Détaillez l'utilisation prévue des fonds.",
            "project_timeline": "Décrivez les étapes prévues du projet.",
        }
        missing = {
            field: message
            for field, message in required_fields.items()
            if not getattr(campaign, field).strip()
        }
        if missing:
            raise ValidationError(missing)
        previous_status = campaign.status
        campaign.status = Campaign.Status.EN_MODERATION
        campaign.moderation_note = ""
        campaign.suspension_note = ""
        campaign.save(
            update_fields=["status", "moderation_note", "suspension_note"]
        )
        CampaignAuditLog.objects.create(
            campaign=campaign,
            actor=request.user,
            action=CampaignAuditLog.Action.SUBMITTED,
            previous_status=previous_status,
            new_status=campaign.status,
        )
        notify_admins(
            subject="Nouvelle campagne à modérer",
            message=f"La campagne « {campaign.title} » vient d’être soumise.",
        )
        return Response(CampaignDetailSerializer(campaign).data)

    @action(detail=True, methods=["post"], url_path="updates")
    def add_update(self, request, slug=None):
        campaign = self.get_object()
        if campaign.owner_id != request.user.id:
            raise PermissionDenied("Cette campagne ne vous appartient pas.")
        if campaign.status != Campaign.Status.PUBLIEE:
            raise ValidationError("Seule une campagne publiée peut recevoir une actualité.")
        serializer = CampaignUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(campaign=campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        throttle_classes=[ScopedRateThrottle],
        throttle_scope="campaign_report",
        url_path="report",
    )
    def report(self, request, slug=None):
        if not request.user.is_email_verified:
            raise PermissionDenied("Vérifiez votre adresse e-mail avant de signaler une campagne.")
        campaign = self.get_object()
        if campaign.owner_id == request.user.id:
            raise ValidationError("Vous ne pouvez pas signaler votre propre campagne.")
        if CampaignReport.objects.filter(campaign=campaign, reporter=request.user).exists():
            raise ValidationError("Vous avez déjà signalé cette campagne.")
        serializer = CampaignReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(campaign=campaign, reporter=request.user)
        notify_admins(
            subject="Nouveau signalement de campagne",
            message=f"La campagne « {campaign.title} » a été signalée : {report.get_reason_display()}.",
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
