from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.notifications.services import notify_admins

from .models import KycAuditLog, KycDocument
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
        previous_status = request.user.kyc_status
        document = serializer.save(user=request.user)

        # Toute nouvelle pièce doit être revue, même après une validation précédente.
        request.user.kyc_status = User.KycStatus.EN_ATTENTE
        request.user.kyc_review_note = ""
        request.user.kyc_reviewed_at = None
        request.user.kyc_reviewed_by = None
        request.user.save(
            update_fields=[
                "kyc_status",
                "kyc_review_note",
                "kyc_reviewed_at",
                "kyc_reviewed_by",
            ]
        )

        KycAuditLog.objects.create(
            user=request.user,
            actor=request.user,
            document=document,
            action=KycAuditLog.Action.DOCUMENT_SUBMITTED,
            previous_status=previous_status,
            new_status=request.user.kyc_status,
        )
        notify_admins(
            subject="Nouveau dossier KYC à vérifier",
            message=f"{request.user.email} a transmis une pièce d’identité.",
        )

        return Response(_kyc_state(request.user), status=status.HTTP_201_CREATED)
