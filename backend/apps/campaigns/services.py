from django.db.models import F, Q
from django.utils import timezone

from .models import Campaign


def close_finished_campaigns():
    """Clôture les campagnes arrivées à échéance ou ayant atteint leur objectif."""
    today = timezone.localdate()
    return Campaign.objects.filter(status=Campaign.Status.PUBLIEE).filter(
        Q(deadline__lt=today) | Q(collected_amount__gte=F("goal_amount"))
    ).update(status=Campaign.Status.CLOTUREE)
