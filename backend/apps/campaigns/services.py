from django.db.models import F, Q
from django.utils import timezone

from .models import Campaign, CampaignAuditLog


def close_finished_campaigns():
    """Clôture les campagnes arrivées à échéance ou ayant atteint leur objectif."""
    today = timezone.localdate()
    campaigns = Campaign.objects.filter(status=Campaign.Status.PUBLIEE).filter(
        Q(deadline__lt=today) | Q(collected_amount__gte=F("goal_amount"))
    )
    count = 0
    for campaign in campaigns:
        campaign.status = Campaign.Status.CLOTUREE
        campaign.save(update_fields=["status", "updated_at"])
        CampaignAuditLog.objects.create(
            campaign=campaign,
            actor=None,
            action=CampaignAuditLog.Action.CLOSED,
            previous_status=Campaign.Status.PUBLIEE,
            new_status=Campaign.Status.CLOTUREE,
            note="Clôture automatique à l’échéance ou à l’atteinte de l’objectif.",
        )
        count += 1
    return count
