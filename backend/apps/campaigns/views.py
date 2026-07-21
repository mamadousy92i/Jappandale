from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Campaign
from .permissions import IsOwner, IsValidatedPorteur
from .serializers import (
    CampaignDetailSerializer,
    CampaignListSerializer,
    CampaignUpdateSerializer,
    CampaignWriteSerializer,
)

PUBLIC_STATUSES = (Campaign.Status.PUBLIEE, Campaign.Status.CLOTUREE)


class CampaignViewSet(viewsets.ModelViewSet):
    """CRUD des campagnes : lecture publique, écriture réservée aux porteurs validés."""

    lookup_field = "slug"
    permission_classes = [IsValidatedPorteur, IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        base = Campaign.objects.select_related("owner")
        if self.action == "mine":
            return base.filter(owner=self.request.user)
        if self.action == "retrieve":
            # Campagnes publiques, plus celles du porteur connecté (pour édition).
            visible = Q(status__in=PUBLIC_STATUSES)
            if self.request.user.is_authenticated:
                visible |= Q(owner=self.request.user)
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
        if campaign.status not in (Campaign.Status.BROUILLON, Campaign.Status.REJETEE):
            raise ValidationError(
                "Seule une campagne en brouillon ou rejetée peut être modifiée."
            )
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def submit(self, request, slug=None):
        campaign = self.get_object()
        if campaign.owner_id != request.user.id:
            raise PermissionDenied("Cette campagne ne vous appartient pas.")
        if campaign.status not in (Campaign.Status.BROUILLON, Campaign.Status.REJETEE):
            raise ValidationError("Cette campagne ne peut pas être soumise à modération.")
        campaign.status = Campaign.Status.EN_MODERATION
        campaign.moderation_note = ""
        campaign.save(update_fields=["status", "moderation_note"])
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
