from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import notify_admins

from . import services
from .models import FinancingScheme, SchemeReferral
from .permissions import IsPorteur
from .serializers import EligibleSchemeSerializer, SchemeReferralSerializer


class FinancingSchemeListView(APIView):
    """Dispositifs publiés du Guichet Unique, avec l'éligibilité du porteur courant."""

    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def get(self, request):
        schemes = FinancingScheme.objects.filter(status=FinancingScheme.Status.PUBLIE)
        evaluations = services.annotate_eligibility(schemes, request.user)
        payload = []
        for scheme, eligible, reasons in evaluations:
            data = EligibleSchemeSerializer(scheme).data
            data["eligible"] = eligible
            data["ineligibility_reasons"] = reasons
            payload.append(data)
        payload.sort(key=lambda item: (not item["eligible"], item["name"]))
        return Response(payload)


class ExpressInterestView(APIView):
    """Manifestation d'intérêt d'un porteur pour un dispositif : crée l'orientation."""

    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def post(self, request, scheme_id):
        try:
            scheme = FinancingScheme.objects.get(
                pk=scheme_id, status=FinancingScheme.Status.PUBLIE
            )
        except FinancingScheme.DoesNotExist:
            raise ValidationError("Ce dispositif n'est pas disponible.")

        reasons = services.eligibility_reasons(scheme, request.user)
        if reasons:
            raise ValidationError(
                {"detail": "Vous ne remplissez pas les critères d'éligibilité.", "reasons": reasons}
            )

        existing = SchemeReferral.objects.filter(
            scheme=scheme, porteur=request.user, status__in=SchemeReferral.OPEN_STATUSES
        ).first()
        if existing:
            return Response(SchemeReferralSerializer(existing).data)

        referral = SchemeReferral.objects.create(scheme=scheme, porteur=request.user)
        notify_admins(
            subject="Nouvelle orientation au Guichet Unique",
            message=(
                f"{request.user.email} a manifesté son intérêt pour le dispositif "
                f"« {scheme.name} »."
            ),
        )
        return Response(SchemeReferralSerializer(referral).data, status=status.HTTP_201_CREATED)


class MyReferralsView(APIView):
    """Historique des orientations du porteur connecté."""

    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def get(self, request):
        referrals = (
            SchemeReferral.objects.filter(porteur=request.user)
            .select_related("scheme")
        )
        return Response(SchemeReferralSerializer(referrals, many=True).data)
