"""Moteur de matching du Guichet Unique du Financement.

Confronte le profil d'un porteur de projet (Score Jappandale, statut KYC,
diaspora, ville, catégories et objectifs de ses campagnes) aux critères
d'éligibilité déclarés par chaque dispositif de financement publié.
"""

from apps.accounts.models import User
from apps.campaigns.models import Campaign
from apps.scoring import api as scoring_api

from .models import FinancingScheme


def _porteur_campaign_categories(porteur):
    return set(Campaign.objects.filter(owner=porteur).values_list("category", flat=True))


def _porteur_goal_amounts(porteur):
    return list(Campaign.objects.filter(owner=porteur).values_list("goal_amount", flat=True))


def eligibility_reasons(scheme, porteur, *, score_value=None, categories=None, goal_amounts=None):
    """Liste des critères non satisfaits par ce porteur pour ce dispositif.

    Une liste vide signifie que le porteur est éligible. Fonction pure,
    utilisée aussi bien pour filtrer que pour expliquer un refus à l'écran.
    """
    if score_value is None:
        score_value = scoring_api.compute_score_value(porteur)
    reasons = []

    if score_value < scheme.min_score:
        reasons.append(
            f"Score Jappandale insuffisant (minimum requis : {scheme.min_score})"
        )

    if scheme.requires_kyc_valide and porteur.kyc_status != User.KycStatus.VALIDE:
        reasons.append("Identité non vérifiée (KYC validé requis)")

    if scheme.diaspora_requirement == FinancingScheme.DiasporaRequirement.DIASPORA_UNIQUEMENT:
        if not porteur.is_diaspora:
            reasons.append("Réservé aux porteurs de la diaspora")
    elif scheme.diaspora_requirement == FinancingScheme.DiasporaRequirement.DIASPORA_EXCLUE:
        if porteur.is_diaspora:
            reasons.append("Non accessible aux porteurs de la diaspora")

    if scheme.eligible_categories:
        categories = _porteur_campaign_categories(porteur) if categories is None else categories
        if not categories & set(scheme.eligible_categories):
            reasons.append("Aucune de vos campagnes n'appartient aux catégories éligibles")

    if scheme.eligible_regions:
        city = (porteur.city or "").strip().lower()
        regions = {region.strip().lower() for region in scheme.eligible_regions}
        if not city or city not in regions:
            reasons.append("Votre ville n'est pas couverte par ce dispositif")

    if scheme.min_goal_amount is not None or scheme.max_goal_amount is not None:
        goal_amounts = _porteur_goal_amounts(porteur) if goal_amounts is None else goal_amounts
        floor = scheme.min_goal_amount or 0
        ceiling = scheme.max_goal_amount or float("inf")
        if not any(floor <= amount <= ceiling for amount in goal_amounts):
            reasons.append("Aucune de vos campagnes n'entre dans la fourchette de montant éligible")

    return reasons


def eligible_schemes_for(porteur):
    """Dispositifs publiés pour lesquels ce porteur est éligible, triés par
    score minimum requis décroissant (les plus exigeants — et généralement
    les plus intéressants — en premier)."""
    score_value = scoring_api.compute_score_value(porteur)
    categories = _porteur_campaign_categories(porteur)
    goal_amounts = _porteur_goal_amounts(porteur)
    schemes = FinancingScheme.objects.filter(status=FinancingScheme.Status.PUBLIE)
    return [
        scheme
        for scheme in schemes
        if not eligibility_reasons(
            scheme, porteur, score_value=score_value, categories=categories, goal_amounts=goal_amounts
        )
    ]


def annotate_eligibility(schemes, porteur):
    """Pour chaque dispositif fourni, calcule l'éligibilité et les raisons de
    refus éventuelles. Retourne une liste de tuples (scheme, eligible, reasons)."""
    score_value = scoring_api.compute_score_value(porteur)
    categories = _porteur_campaign_categories(porteur)
    goal_amounts = _porteur_goal_amounts(porteur)
    results = []
    for scheme in schemes:
        reasons = eligibility_reasons(
            scheme, porteur, score_value=score_value, categories=categories, goal_amounts=goal_amounts
        )
        results.append((scheme, not reasons, reasons))
    return results


def transformation_stats(scheme=None):
    """Taux de transformation des orientations : accepté / total (hors intérêts encore ouverts).

    Si `scheme` est fourni, restreint le calcul à ce dispositif ; sinon,
    calcule un taux global sur l'ensemble du Guichet Unique.
    """
    from .models import SchemeReferral

    referrals = SchemeReferral.objects.all()
    if scheme is not None:
        referrals = referrals.filter(scheme=scheme)
    total = referrals.count()
    accepted = referrals.filter(status=SchemeReferral.Status.ACCEPTE).count()
    closed = referrals.exclude(status__in=SchemeReferral.OPEN_STATUSES).count()
    return {
        "total_referrals": total,
        "accepted": accepted,
        "transformation_rate": round(accepted / closed, 2) if closed else None,
    }
