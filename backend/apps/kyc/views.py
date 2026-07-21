from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User

from .models import KycDocument
from .serializers import KycDocumentSerializer


def _kyc_state(user):
    """Représentation du KYC d'un utilisateur : statut + documents."""
    documents = KycDocumentSerializer(
        user.kyc_documents.all(), many=True, context={"request": None}
    ).data
    return {"kyc_status": user.kyc_status, "documents": documents}


class KycView(APIView):
    """Consultation (GET) et soumission (POST multipart) du KYC courant."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        return Response(_kyc_state(request.user))

    def post(self, request):
        serializer = KycDocumentSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        # Une nouvelle soumission remet le dossier en attente de revue.
        if request.user.kyc_status in (
            User.KycStatus.NON_SOUMIS,
            User.KycStatus.REJETE,
        ):
            request.user.kyc_status = User.KycStatus.EN_ATTENTE
            request.user.save(update_fields=["kyc_status"])

        return Response(_kyc_state(request.user), status=status.HTTP_201_CREATED)
