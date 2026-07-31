from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.backoffice.permissions import IsJappandaleAdmin
from django.utils import timezone

from . import services
from .models import FinancingScheme, SchemeReferral
from .serializers import (
    FinancingSchemeSerializer,
    FinancingSchemeWriteSerializer,
    SchemeReferralAdminSerializer,
)


class AdminFinancingSchemeListView(APIView):
    """Référentiel des dispositifs — liste et création (YAMB, pour compte des partenaires)."""

    permission_classes = [IsJappandaleAdmin]

    def get(self, request):
        schemes = FinancingScheme.objects.all()
        return Response(FinancingSchemeSerializer(schemes, many=True).data)

    def post(self, request):
        serializer = FinancingSchemeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scheme = serializer.save(created_by=request.user)
        return Response(FinancingSchemeSerializer(scheme).data, status=status.HTTP_201_CREATED)


class AdminFinancingSchemeDetailView(APIView):
    """Modification d'un dispositif existant."""

    permission_classes = [IsJappandaleAdmin]

    def patch(self, request, scheme_id):
        scheme = get_object_or_404(FinancingScheme, pk=scheme_id)
        serializer = FinancingSchemeWriteSerializer(scheme, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        was_published = scheme.status == FinancingScheme.Status.PUBLIE
        scheme = serializer.save()
        if scheme.status == FinancingScheme.Status.PUBLIE and not was_published:
            scheme.published_at = timezone.now()
            scheme.save(update_fields=["published_at"])
        return Response(FinancingSchemeSerializer(scheme).data)


class AdminSchemeReferralListView(APIView):
    """Historique des orientations, avec filtre optionnel par dispositif."""

    permission_classes = [IsJappandaleAdmin]

    def get(self, request):
        referrals = SchemeReferral.objects.select_related("scheme", "porteur")
        scheme_id = request.query_params.get("scheme")
        if scheme_id:
            referrals = referrals.filter(scheme_id=scheme_id)
        return Response(SchemeReferralAdminSerializer(referrals, many=True).data)


class AdminSchemeReferralDetailView(APIView):
    """Mise à jour du suivi d'une orientation (statut, note)."""

    permission_classes = [IsJappandaleAdmin]

    def patch(self, request, referral_id):
        referral = get_object_or_404(SchemeReferral, pk=referral_id)
        new_status = request.data.get("status")
        if new_status is not None and new_status not in SchemeReferral.Status.values:
            raise ValidationError({"status": ["Statut invalide."]})
        if new_status is not None:
            referral.status = new_status
        if "note" in request.data:
            referral.note = request.data.get("note", "")
        referral.updated_by = request.user
        referral.save(update_fields=["status", "note", "updated_by", "updated_at"])
        return Response(SchemeReferralAdminSerializer(referral).data)


class AdminGuichetStatsView(APIView):
    """Vue consolidée : référentiel, orientations en cours et taux de transformation."""

    permission_classes = [IsJappandaleAdmin]

    def get(self, request):
        schemes = FinancingScheme.objects.all()
        per_scheme = [
            {
                "scheme_id": scheme.id,
                "scheme_name": scheme.name,
                **services.transformation_stats(scheme),
            }
            for scheme in schemes
        ]
        return Response(
            {
                "global": services.transformation_stats(),
                "published_schemes": schemes.filter(status=FinancingScheme.Status.PUBLIE).count(),
                "open_referrals": SchemeReferral.objects.filter(
                    status__in=SchemeReferral.OPEN_STATUSES
                ).count(),
                "per_scheme": per_scheme,
            }
        )
