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

_ACTIVITE_REQUIREMENT = {
    "key": "activite",
    "label": "un justificatif d'activité",
    "any_of": (DocumentType.JUSTIFICATIF_ACTIVITE,),
}

# Vérification renforcée pour la diaspora (§5.1) : justificatif de résidence
# à l'étranger et justificatif de l'origine des fonds.
_DIASPORA_REQUIREMENTS = [
    {
        "key": "residence",
        "label": "un justificatif de résidence à l'étranger",
        "any_of": (DocumentType.JUSTIFICATIF_RESIDENCE,),
    },
    {
        "key": "origine_fonds",
        "label": "un justificatif de l'origine des fonds",
        "any_of": (DocumentType.JUSTIFICATIF_ORIGINE_FONDS,),
    },
]


def get_required_documents(user):
    """Exigences KYC pour un utilisateur : le porteur et la diaspora ont un
    parcours renforcé, cumulable."""
    requirements = list(_BASE_REQUIREMENTS)
    if user.role == User.Role.PORTEUR:
        requirements.append(_ACTIVITE_REQUIREMENT)
    if user.is_diaspora:
        requirements.extend(_DIASPORA_REQUIREMENTS)
    return requirements


def missing_required_documents(user):
    """Retourne les libellés des pièces manquantes avant qu'un KYC puisse être validé."""
    uploaded_types = set(user.kyc_documents.values_list("document_type", flat=True))
    return [
        requirement["label"]
        for requirement in get_required_documents(user)
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
        for requirement in get_required_documents(user)
    ]
