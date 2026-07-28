from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute
from apps.disputes.services import resolve_dispute_accepted
from apps.notifications.models import Notification

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=User.KycStatus.VALIDE,
        first_name="Awa",
        last_name="Ndiaye",
        email_verified_at=timezone.now(),
    )


def make_campaign(owner, **overrides):
    values = {
        "title": "Cantine scolaire de quartier",
        "summary": "Financer du matériel pour la cantine scolaire.",
        "description": "Un projet concret porté par les habitants du quartier.",
        "category": Campaign.Category.EDUCATION,
        "goal_amount": 500_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


@pytest.mark.django_db
def test_resolution_acceptee_force_remboursee_meme_si_deja_reversee():
    owner = make_user("owner-res1@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-res1@test.sn", User.Role.ADMIN)
    contributor = make_user("contrib-res1@test.sn")
    campaign = make_campaign(owner)
    contribution = Contribution.objects.create(
        contributor=contributor,
        campaign=campaign,
        amount=20_000,
        status=Contribution.Status.CONFIRMEE,
        payout_status=Contribution.PayoutStatus.REVERSEE,
        commission_amount=1_000,
        net_amount=19_000,
    )
    campaign.collected_amount = 20_000
    campaign.save(update_fields=["collected_amount"])
    dispute = Dispute.objects.create(
        contribution=contribution, reporter=contributor, reason=Dispute.Reason.AUTRE, details="Détails."
    )

    resolve_dispute_accepted(dispute=dispute, actor=admin)

    contribution.refresh_from_db()
    dispute.refresh_from_db()
    campaign.refresh_from_db()
    assert contribution.status == Contribution.Status.REMBOURSEE
    assert contribution.refunded_at is not None
    assert dispute.status == Dispute.Status.ACCEPTE
    assert dispute.resolved_at is not None
    assert campaign.collected_amount == 0
    assert Notification.objects.filter(
        recipient=contributor, kind=Notification.Kind.DISPUTE_RESOLVED
    ).exists()
    assert Notification.objects.filter(
        recipient=owner, kind=Notification.Kind.DISPUTE_RESOLVED
    ).exists()
