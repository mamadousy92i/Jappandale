import logging

from django.conf import settings
from rest_framework import permissions
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution

from . import paytech
from .services import handle_ipn, start_contribution_payment, start_fee_payment

logger = logging.getLogger(__name__)


class PaymentConfigView(APIView):
    """Indique au frontend comment payer et combien coûtent les frais de dossier."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "provider": "PAYTECH" if paytech.is_active() else "SIMULATED",
                "dossier_fee_amount": settings.DOSSIER_FEE_AMOUNT,
            }
        )


class ContributionPaymentStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reference):
        contribution = (
            Contribution.objects.select_related("campaign", "contributor")
            .filter(public_reference=reference, contributor=request.user)
            .first()
        )
        if contribution is None:
            return Response({"detail": "Contribution introuvable."}, status=404)
        return Response({"redirect_url": start_contribution_payment(contribution=contribution)})


class FeePaymentStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        campaign = Campaign.objects.filter(slug=slug, owner=request.user).first()
        if campaign is None:
            return Response({"detail": "Campagne introuvable."}, status=404)
        return Response(
            {"redirect_url": start_fee_payment(campaign=campaign, user=request.user)}
        )


class PaytechIpnView(APIView):
    """Notification serveur de PayTech : la SEULE chose qui confirme un paiement.

    Aucune session ni jeton CSRF (c'est PayTech qui appelle) : l'authenticité repose
    entièrement sur la signature HMAC. Sans signature valide, rien n'est modifié.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    parser_classes = [FormParser, MultiPartParser, JSONParser]

    def post(self, request):
        if not paytech.is_active() or not paytech.verify_ipn(request.data):
            logger.warning("IPN PayTech rejetée (signature invalide ou PayTech inactif).")
            return Response({"detail": "Signature invalide."}, status=403)
        return Response({"detail": handle_ipn(request.data)})
