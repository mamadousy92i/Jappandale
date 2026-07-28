from django.db import transaction as db_transaction
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution
from apps.contributions.services import recalculate_campaign_total
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import Dispute


@db_transaction.atomic
def resolve_dispute_accepted(*, dispute, actor):
    """Accepte un litige : force le remboursement administratif de la contribution."""
    contribution = Contribution.objects.select_for_update().get(pk=dispute.contribution_id)
    campaign = Campaign.objects.select_for_update().get(pk=contribution.campaign_id)
    now = timezone.now()

    contribution.status = Contribution.Status.REMBOURSEE
    contribution.refunded_at = now
    contribution.save(update_fields=["status", "refunded_at"])
    recalculate_campaign_total(campaign)

    dispute.status = Dispute.Status.ACCEPTE
    dispute.resolved_at = now
    dispute.save(update_fields=["status", "resolved_at"])

    notify_user(
        recipient=contribution.contributor,
        kind=Notification.Kind.DISPUTE_RESOLVED,
        subject="Votre litige a été accepté",
        message=(
            f"Votre litige sur la contribution de {contribution.amount} FCFA à "
            f"« {campaign.title} » a été accepté. Le remboursement est enregistré."
        ),
        action_url="/compte?onglet=contributions",
    )
    notify_user(
        recipient=campaign.owner,
        kind=Notification.Kind.DISPUTE_RESOLVED,
        subject="Un litige a été accepté sur votre campagne",
        message=(
            f"Un litige a été accepté sur une contribution de {contribution.amount} FCFA à "
            f"« {campaign.title} ». Elle est désormais marquée remboursée."
        ),
        action_url="/compte",
    )
    return dispute
