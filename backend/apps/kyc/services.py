from apps.accounts.models import User

from .models import KycDocument

DocumentType = KycDocument.DocumentType

# Parcours KYC différencié par profil (§5.1 du cahier des charges) : chaque
# exigence est satisfaite dès qu'au moins un des types listés a été déposé.
_BASE_REQUIREMENTS = [
    {
        "key": "identite",
        "label": "une carte nationale d'identité ou un passeport",
        "any_of": (DocumentType.CNI, DocumentType.PASSEPORT),
    },
    {
        "key": "selfie",
        "label": "un selfie de vérification",
        "any_of": (DocumentType.SELFIE,),
    },
]

_PORTEUR_REQUIREMENTS = _BASE_REQUIREMENTS + [
    {
        "key": "activite",
        "label": "un justificatif d'activité",
        "any_of": (DocumentType.JUSTIFICATIF_ACTIVITE,),
    },
]


def get_required_documents(role):
    """Exigences KYC pour un rôle donné (le porteur a un parcours renforcé)."""
    if role == User.Role.PORTEUR:
        return _PORTEUR_REQUIREMENTS
    return _BASE_REQUIREMENTS


def missing_required_documents(user):
    """Retourne les libellés des pièces manquantes avant qu'un KYC puisse être validé."""
    uploaded_types = set(user.kyc_documents.values_list("document_type", flat=True))
    return [
        requirement["label"]
        for requirement in get_required_documents(user.role)
        if not uploaded_types.intersection(requirement["any_of"])
    ]


def build_checklist(user):
    """Représentation structurée du dossier KYC, pour l'espace personnel."""
    uploaded_types = set(user.kyc_documents.values_list("document_type", flat=True))
    return [
        {
            "key": requirement["key"],
            "label": requirement["label"],
            "document_types": list(requirement["any_of"]),
            "satisfied": bool(uploaded_types.intersection(requirement["any_of"])),
        }
        for requirement in get_required_documents(user.role)
    ]
