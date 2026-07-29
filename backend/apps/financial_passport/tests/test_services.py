from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute
from apps.financial_passport.services import build_passport_data

User = get_user_model()


def make_porteur(email, **overrides):
    values = {
        "role": User.Role.PORTEUR,
        "kyc_status": User.KycStatus.VALIDE,
        "first_name": "Awa",
        "last_name": "Ndiaye",
        "city": "Dakar",
        "email_verified_at": timezone.now(),
    }
    values.update(overrides)
    return User.objects.create_user(email=email, password="MotDePasse123!", **values)


def make_campaign(owner, **overrides):
    values = {
        "title": "Cantine scolaire de quartier",
        "summary": "Financer du matériel pour la cantine scolaire.",
        "description": "Un projet concret porté par les habitants du quartier.",
        "category": Campaign.Category.EDUCATION,
        "goal_amount": 50_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


@pytest.mark.django_db
def test_agregat_dun_porteur_sans_historique():
    porteur = make_porteur("porteur-agg1@test.sn")

    data = build_passport_data(porteur)

    assert data["campaigns_total"] == 0
    assert data["total_collected"] == 0
    assert data["distinct_contributors"] == 0
    assert data["disputes_received"] == 0
    assert data["disputes_accepted_rate"] == 0.0
    assert data["porteur_city"] == "Dakar"
    assert 0 <= data["score"] <= 100


@pytest.mark.django_db
def test_agregat_reflete_les_campagnes_et_contributions():
    porteur = make_porteur("porteur-agg2@test.sn")
    contributor1 = make_porteur("contrib-agg2a@test.sn", role=User.Role.CONTRIBUTEUR)
    contributor2 = make_porteur("contrib-agg2b@test.sn", role=User.Role.CONTRIBUTEUR)
    campaign = make_campaign(porteur, status=Campaign.Status.CLOTUREE, collected_amount=60_000)
    Contribution.objects.create(
        contributor=contributor1, campaign=campaign, amount=30_000, status=Contribution.Status.CONFIRMEE
    )
    Contribution.objects.create(
        contributor=contributor2, campaign=campaign, amount=30_000, status=Contribution.Status.CONFIRMEE
    )

    data = build_passport_data(porteur)

    assert data["campaigns_total"] == 1
    assert data["campaigns_closed_success"] == 1
    assert data["total_collected"] == 60_000
    assert data["distinct_contributors"] == 2
    assert data["confirmed_contributions_count"] == 2


@pytest.mark.django_db
def test_agregat_reflete_le_taux_de_litiges_acceptes():
    porteur = make_porteur("porteur-agg3@test.sn")
    contributor = make_porteur("contrib-agg3@test.sn", role=User.Role.CONTRIBUTEUR)
    campaign = make_campaign(porteur)
    contribution = Contribution.objects.create(
        contributor=contributor, campaign=campaign, amount=20_000, status=Contribution.Status.CONFIRMEE
    )
    Dispute.objects.create(
        contribution=contribution,
        reporter=contributor,
        reason=Dispute.Reason.AUTRE,
        details="Détails.",
        status=Dispute.Status.ACCEPTE,
    )

    data = build_passport_data(porteur)

    assert data["disputes_received"] == 1
    assert data["disputes_accepted_rate"] == 1.0
