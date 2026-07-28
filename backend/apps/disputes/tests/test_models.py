from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute

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
def test_creation_dun_litige():
    owner = make_user("owner-d1@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-d1@test.sn")
    campaign = make_campaign(owner)
    contribution = Contribution.objects.create(
        contributor=contributor,
        campaign=campaign,
        amount=20_000,
        status=Contribution.Status.CONFIRMEE,
    )

    dispute = Dispute.objects.create(
        contribution=contribution,
        reporter=contributor,
        reason=Dispute.Reason.AUTRE,
        details="Le porteur ne répond plus.",
    )

    assert dispute.status == Dispute.Status.OUVERT
    assert dispute.resolved_at is None
    assert contribution.disputes.count() == 1
