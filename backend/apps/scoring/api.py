"""Interface publique du moteur Score Jappandale®.

Ce module est le SEUL point d'entrée que les autres apps du projet sont
autorisées à importer pour interagir avec le scoring : elles ne doivent
jamais importer directement `apps.scoring.models` ou `apps.scoring.services`.

Cette frontière permet de faire évoluer le moteur de calcul (algorithme,
poids, ou même son extraction en service déployé indépendamment) sans avoir
à modifier le reste de l'application — seul ce module (et son pendant HTTP,
`apps.scoring.internal_views`) aurait alors à changer.
"""

from .models import Score, ScoringSettings
from .services import compute_score, refresh_score

__all__ = [
    "compute_score_value",
    "get_latest_score",
    "get_scoring_settings",
    "record_manual_override",
    "refresh_score",
]


def compute_score_value(porteur):
    """Recalcule le score courant d'un porteur, sans le persister."""
    value, _breakdown = compute_score(porteur)
    return value


def get_latest_score(porteur):
    """Dernier score persisté pour ce porteur, ou None s'il n'en a jamais eu."""
    return Score.objects.filter(porteur=porteur).first()


def get_scoring_settings():
    """Réglages courants (poids et plafonds) du moteur de scoring."""
    return ScoringSettings.get_solo()


def record_manual_override(*, porteur, override_value, note, admin_user):
    """Enregistre une revue qualitative humaine du score d'un porteur."""
    value, breakdown = compute_score(porteur)
    return Score.objects.create(
        porteur=porteur,
        value=value,
        breakdown=breakdown,
        is_manual_override=True,
        override_value=override_value,
        override_note=note,
        override_by=admin_user,
    )
