from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone

from apps.campaigns.models import Campaign, Reward
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import Contribution, PayoutAuditLog, PlatformSettings, Transaction
from .providers import PaymentResult, SimulatedPaymentProvider


def recalculate_campaign_total(campaign):
    total = (
        Contribution.objects.filter(
            campaign=campaign, status=Contribution.Status.CONFIRMEE
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )
    campaign.collected_amount = total
    if total >= campaign.goal_amount and campaign.status == Campaign.Status.PUBLIEE:
        campaign.status = Campaign.Status.CLOTUREE
        campaign.save(update_fields=["collected_amount", "status"])
    else:
        campaign.save(update_fields=["collected_amount"])
    return total


@db_transaction.atomic
def create_pending_contribution(*, contributor, campaign, amount, anonymous, reward=None):
    contribution = Contribution.objects.create(
        contributor=contributor,
        campaign=campaign,
        reward=reward,
        amount=amount,
        anonymous=anonymous,
    )
    Transaction.objects.create(contribution=contribution)
    return contribution


@db_transaction.atomic
def process_simulated_payment(*, contribution, outcome):
    locked = Contribution.objects.select_for_update().get(pk=contribution.pk)
    campaign = Campaign.objects.select_for_update().get(pk=locked.campaign_id)
    goal_was_reached = campaign.collected_amount >= campaign.goal_amount

    if locked.status != Contribution.Status.INITIEE:
        return locked

    reward = None
    if locked.reward_id:
        reward = Reward.objects.select_for_update().get(pk=locked.reward_id)

    result = SimulatedPaymentProvider().process(outcome)
    if result.success and reward is not None and reward.sold_out:
        result = PaymentResult(success=False, failure_reason="Contrepartie épuisée.")

    now = timezone.now()
    payment_transaction = Transaction.objects.select_for_update().get(
        contribution=locked
    )
    payment_transaction.processed_at = now

    if result.success:
        locked.status = Contribution.Status.CONFIRMEE
        locked.confirmed_at = now
        payment_transaction.status = Transaction.Status.CONFIRMEE
        payment_transaction.failure_reason = ""
        commission_rate = PlatformSettings.get_solo().commission_rate
        locked.commission_rate_applied = commission_rate
        locked.commission_amount = round(locked.amount * commission_rate)
        locked.net_amount = locked.amount - locked.commission_amount
        locked.save(
            update_fields=[
                "status",
                "confirmed_at",
                "commission_rate_applied",
                "commission_amount",
                "net_amount",
            ]
        )
        if reward is not None:
            reward.quantity_claimed += 1
            reward.save(update_fields=["quantity_claimed"])
        notify_user(
            recipient=locked.contributor,
            kind=Notification.Kind.CONTRIBUTION_CONFIRMED,
            subject="Votre contribution est confirmée",
            message=f"Votre contribution de {locked.amount:,} FCFA à « {campaign.title} » est confirmée.",
            action_url=f"/campagnes/{campaign.slug}",
        )
        notify_user(
            recipient=campaign.owner,
            kind=Notification.Kind.CONTRIBUTION_RECEIVED,
            subject="Nouvelle contribution reçue",
            message=f"Votre campagne « {campaign.title} » a reçu une contribution de {locked.amount:,} FCFA.",
            action_url="/compte",
        )
    else:
        locked.status = Contribution.Status.ECHOUEE
        payment_transaction.status = Transaction.Status.ECHOUEE
        payment_transaction.failure_reason = result.failure_reason
        locked.save(update_fields=["status"])

    payment_transaction.save(
        update_fields=["status", "failure_reason", "processed_at"]
    )
    recalculate_campaign_total(campaign)
    campaign.refresh_from_db(fields=["status", "collected_amount"])
    if (
        result.success
        and not goal_was_reached
        and campaign.collected_amount >= campaign.goal_amount
    ):
        notify_user(
            recipient=campaign.owner,
            kind=Notification.Kind.GOAL_REACHED,
            subject="Objectif de campagne atteint",
            message=f"La campagne « {campaign.title} » a atteint son objectif de collecte.",
            action_url=f"/campagnes/{campaign.slug}",
        )
    return locked


@db_transaction.atomic
def refund_contribution(contribution):
    locked = Contribution.objects.select_for_update().get(pk=contribution.pk)
    campaign = Campaign.objects.select_for_update().get(pk=locked.campaign_id)
    if locked.status != Contribution.Status.CONFIRMEE:
        return False
    if locked.payout_status != Contribution.PayoutStatus.EN_SEQUESTRE:
        return False

    now = timezone.now()
    locked.status = Contribution.Status.REMBOURSEE
    locked.refunded_at = now
    locked.save(update_fields=["status", "refunded_at"])
    payment_transaction = Transaction.objects.select_for_update().get(
        contribution=locked
    )
    payment_transaction.status = Transaction.Status.REMBOURSEE
    payment_transaction.processed_at = now
    payment_transaction.save(update_fields=["status", "processed_at"])
    if locked.reward_id:
        reward = Reward.objects.select_for_update().get(pk=locked.reward_id)
        reward.quantity_claimed = max(reward.quantity_claimed - 1, 0)
        reward.save(update_fields=["quantity_claimed"])
    recalculate_campaign_total(campaign)
    return True


@db_transaction.atomic
def release_campaign_payout(*, campaign, actor):
    """Marque en lot les contributions confirmées d'une campagne comme reversées."""
    if campaign.status != Campaign.Status.CLOTUREE:
        raise ValueError("Seule une campagne clôturée peut faire l'objet d'un reversement.")

    contributions = list(
        Contribution.objects.select_for_update().filter(
            campaign=campaign,
            status=Contribution.Status.CONFIRMEE,
            payout_status=Contribution.PayoutStatus.EN_SEQUESTRE,
        )
    )
    if not contributions:
        raise ValueError("Aucune contribution en séquestre à reverser pour cette campagne.")

    now = timezone.now()
    gross_amount = sum(c.amount for c in contributions)
    commission_amount = sum(c.commission_amount for c in contributions)
    net_amount = sum(c.net_amount for c in contributions)

    for contribution in contributions:
        contribution.payout_status = Contribution.PayoutStatus.REVERSEE
        contribution.payout_released_at = now
        contribution.payout_released_by = actor
        contribution.save(
            update_fields=["payout_status", "payout_released_at", "payout_released_by"]
        )

    log = PayoutAuditLog.objects.create(
        campaign=campaign,
        actor=actor,
        contributions_count=len(contributions),
        gross_amount=gross_amount,
        commission_amount=commission_amount,
        net_amount=net_amount,
    )
    notify_user(
        recipient=campaign.owner,
        kind=Notification.Kind.PAYOUT_RELEASED,
        subject="Les fonds de votre campagne ont été reversés",
        message=(
            f"Les fonds de la campagne « {campaign.title} » ont été reversés : "
            f"{net_amount} FCFA net, pour {len(contributions)} contribution(s)."
        ),
        action_url="/compte?onglet=contributions",
    )
    return log
