from django.db.models import F, Sum

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute
from apps.scoring.services import compute_score


def build_passport_data(porteur):
    """Agrège l'historique financier consolidé d'un porteur (données déjà présentes dans la plateforme).

    Fonction pure : ne persiste rien, ne modifie aucun état.
    """
    score_value, _ = compute_score(porteur)

    campaigns = Campaign.objects.filter(owner=porteur)
    campaigns_total = campaigns.count()
    campaigns_published = campaigns.filter(
        status__in=[Campaign.Status.PUBLIEE, Campaign.Status.CLOTUREE]
    ).count()
    closed = campaigns.filter(status=Campaign.Status.CLOTUREE)
    campaigns_closed_success = closed.filter(collected_amount__gte=F("goal_amount")).count()
    campaigns_rejected_or_suspended = campaigns.filter(
        status__in=[Campaign.Status.REJETEE, Campaign.Status.SUSPENDUE]
    ).count()

    confirmed_contributions = Contribution.objects.filter(
        campaign__owner=porteur, status=Contribution.Status.CONFIRMEE
    )
    total_collected = confirmed_contributions.aggregate(total=Sum("amount"))["total"] or 0
    confirmed_contributions_count = confirmed_contributions.count()
    distinct_contributors = confirmed_contributions.values("contributor_id").distinct().count()

    disputes = Dispute.objects.filter(contribution__campaign__owner=porteur)
    disputes_received = disputes.count()
    disputes_accepted = disputes.filter(status=Dispute.Status.ACCEPTE).count()
    disputes_accepted_rate = (
        round(disputes_accepted / disputes_received, 2) if disputes_received else 0.0
    )

    porteur_name = porteur.organization_name or f"{porteur.first_name} {porteur.last_name}".strip() or porteur.email

    return {
        "porteur_name": porteur_name,
        "porteur_city": porteur.city,
        "member_since": porteur.date_joined.date().isoformat(),
        "score": score_value,
        "campaigns_total": campaigns_total,
        "campaigns_published": campaigns_published,
        "campaigns_closed_success": campaigns_closed_success,
        "campaigns_rejected_or_suspended": campaigns_rejected_or_suspended,
        "total_collected": total_collected,
        "confirmed_contributions_count": confirmed_contributions_count,
        "distinct_contributors": distinct_contributors,
        "disputes_received": disputes_received,
        "disputes_accepted_rate": disputes_accepted_rate,
    }
