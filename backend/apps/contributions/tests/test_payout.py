from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution, PlatformSettings

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR, kyc=User.KycStatus.VALIDE):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=kyc,
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


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_confirmation_calcule_la_commission_et_le_montant_net():
    PlatformSettings.get_solo()  # taux par défaut 5 %
    owner = make_user("owner-p1@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p1@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )

    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    contribution = Contribution.objects.get(public_reference=created.data["public_reference"])
    assert contribution.commission_rate_applied == Decimal("0.05")
    assert contribution.commission_amount == 1_000
    assert contribution.net_amount == 19_000
    assert contribution.payout_status == Contribution.PayoutStatus.EN_SEQUESTRE


@pytest.mark.django_db
def test_taux_fige_ne_change_pas_retroactivement():
    settings_obj = PlatformSettings.get_solo()
    owner = make_user("owner-p2@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p2@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    settings_obj.commission_rate = Decimal("0.20")
    settings_obj.save(update_fields=["commission_rate"])

    contribution = Contribution.objects.get(public_reference=created.data["public_reference"])
    assert contribution.commission_rate_applied == Decimal("0.05")
    assert contribution.commission_amount == 1_000


@pytest.mark.django_db
def test_montant_public_collecte_reste_brut():
    owner = make_user("owner-p3@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p3@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    campaign.refresh_from_db()
    assert campaign.collected_amount == 20_000
