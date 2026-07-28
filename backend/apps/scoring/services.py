import math

from django.contrib.auth import get_user_model
from django.db.models import F, Sum
from django.utils import timezone

from apps.campaigns.models import Campaign, CampaignReport
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute

from .models import Score, ScoringSettings

User = get_user_model()


def compute_score(porteur, settings=None):
    """Calcule le Score Jappandale d'un porteur à partir de son historique réel.

    Retourne un tuple (value: int borné 0-100, breakdown: dict du détail des facteurs).
    Fonction pure : ne persiste rien, ne modifie aucun état.
    """
    settings = settings or ScoringSettings.get_solo()
    breakdown = {"base": float(settings.score_base)}
    value = float(settings.score_base)

    kyc_bonus = float(settings.poids_kyc) if porteur.kyc_status == User.KycStatus.VALIDE else 0.0
    value += kyc_bonus
    breakdown["kyc"] = round(kyc_bonus, 2)

    months = max((timezone.now() - porteur.date_joined).days / 30, 0)
    anciennete_bonus = min(months / 12, 1) * float(settings.poids_anciennete_max)
    value += anciennete_bonus
    breakdown["anciennete"] = round(anciennete_bonus, 2)

    campaigns = Campaign.objects.filter(owner=porteur)
    published_or_closed = campaigns.filter(
        status__in=[Campaign.Status.PUBLIEE, Campaign.Status.CLOTUREE]
    ).count()
    activite_bonus = min(published_or_closed, 5) / 5 * float(settings.poids_activite_max)
    value += activite_bonus
    breakdown["activite"] = round(activite_bonus, 2)

    closed = campaigns.filter(status=Campaign.Status.CLOTUREE)
    closed_count = closed.count()
    successful_count = closed.filter(collected_amount__gte=F("goal_amount")).count()
    taux_reussite = successful_count / closed_count if closed_count else 0
    reussite_bonus = taux_reussite * float(settings.poids_reussite_max)
    value += reussite_bonus
    breakdown["reussite"] = round(reussite_bonus, 2)

    total_collecte = (
        Contribution.objects.filter(
            campaign__owner=porteur, status=Contribution.Status.CONFIRMEE
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )
    montant_bonus = min(math.log10(total_collecte + 1) / 7, 1) * float(settings.poids_montant_max)
    value += montant_bonus
    breakdown["montant_collecte"] = round(montant_bonus, 2)

    contributions_recues = Contribution.objects.filter(
        campaign__owner=porteur, status=Contribution.Status.CONFIRMEE
    ).count()
    litiges_acceptes = Dispute.objects.filter(
        contribution__campaign__owner=porteur, status=Dispute.Status.ACCEPTE
    ).count()
    taux_litige = litiges_acceptes / contributions_recues if contributions_recues else 0
    litige_penalite = taux_litige * float(settings.penalite_litige_max)
    value -= litige_penalite
    breakdown["litiges"] = round(-litige_penalite, 2)

    signalements_resolus = CampaignReport.objects.filter(
        campaign__owner=porteur, status=CampaignReport.Status.RESOLU
    ).count()
    signalement_penalite = min(
        signalements_resolus * float(settings.penalite_signalement_unite),
        float(settings.penalite_signalement_max),
    )
    value -= signalement_penalite
    breakdown["signalements"] = round(-signalement_penalite, 2)

    campagnes_rejetees = campaigns.filter(
        status__in=[Campaign.Status.REJETEE, Campaign.Status.SUSPENDUE]
    ).count()
    rejet_penalite = min(
        campagnes_rejetees * float(settings.penalite_campagne_rejetee_unite),
        float(settings.penalite_campagne_rejetee_max),
    )
    value -= rejet_penalite
    breakdown["campagnes_rejetees"] = round(-rejet_penalite, 2)

    value = max(0, min(100, round(value)))
    return value, breakdown


def refresh_score(porteur):
    """Calcule et persiste une nouvelle ligne Score pour ce porteur."""
    value, breakdown = compute_score(porteur)
    return Score.objects.create(porteur=porteur, value=value, breakdown=breakdown)
