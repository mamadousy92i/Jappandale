from apps.accounts.models import User

from .models import KycDocument


def missing_required_documents(user):
    """Retourne les pièces manquantes avant qu'un KYC puisse être validé."""
    uploaded_types = set(user.kyc_documents.values_list("document_type", flat=True))
    missing = []
    identity_types = {
        KycDocument.DocumentType.CNI,
        KycDocument.DocumentType.PASSEPORT,
    }
    if not uploaded_types.intersection(identity_types):
        missing.append("une carte nationale d'identité ou un passeport")
    if (
        user.role == User.Role.PORTEUR
        and KycDocument.DocumentType.JUSTIFICATIF_ACTIVITE not in uploaded_types
    ):
        missing.append("un justificatif d'activité")
    return missing
