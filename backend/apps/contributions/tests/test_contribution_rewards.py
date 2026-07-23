from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign, Reward
from apps.contributions.models import Contribution
from apps.contributions.services import refund_contribution

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR, kyc=User.KycStatus.VALIDE):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=kyc,
        first_name="Aminata",
        last_name="Ndiaye",
        email_verified_at=timezone.now(),
    )


def make_campaign(owner, **overrides):
    values = {
        "title": "Atelier de couture solidaire",
        "summary": "Équiper un atelier de couture.",
        "description": "Description détaillée.",
        "category": Campaign.Category.ARTISANAT,
        "campaign_type": Campaign.CampaignType.DON_CONTREPARTIE,
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
def test_contribution_avec_contrepartie_valide():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    reward = Reward.objects.create(
        campaign=campaign, title="Sac cousu main", minimum_amount=15000, quantity_limit=5
    )

    response = authenticated_client(contributor).post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 15000, "reward_id": reward.id},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["reward"]["title"] == "Sac cousu main"


@pytest.mark.django_db
def test_contribution_montant_insuffisant_pour_contrepartie():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    reward = Reward.objects.create(campaign=campaign, title="Sac", minimum_amount=15000)

    response = authenticated_client(contributor).post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10000, "reward_id": reward.id},
        format="json",
    )

    assert response.status_code == 400
    assert "amount" in response.data


@pytest.mark.django_db
def test_contribution_contrepartie_epuisee_refusee():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    reward = Reward.objects.create(
        campaign=campaign,
        title="Sac",
        minimum_amount=10000,
        quantity_limit=1,
        quantity_claimed=1,
    )

    response = authenticated_client(contributor).post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10000, "reward_id": reward.id},
        format="json",
    )

    assert response.status_code == 400
    assert "reward_id" in response.data


@pytest.mark.django_db
def test_contribution_contrepartie_sur_campagne_don_libre_refusee():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner, campaign_type=Campaign.CampaignType.DON_LIBRE)
    autre_campagne = make_campaign(owner, title="Autre", campaign_type=Campaign.CampaignType.DON_CONTREPARTIE)
    reward = Reward.objects.create(campaign=autre_campagne, title="Sac", minimum_amount=10000)

    response = authenticated_client(contributor).post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10000, "reward_id": reward.id},
        format="json",
    )

    assert response.status_code == 400
    assert "reward_id" in response.data


@pytest.mark.django_db
def test_confirmation_incremente_la_quantite_reservee():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    reward = Reward.objects.create(
        campaign=campaign, title="Sac", minimum_amount=10000, quantity_limit=2
    )
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10000, "reward_id": reward.id},
        format="json",
    )

    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    reward.refresh_from_db()
    assert reward.quantity_claimed == 1
    assert reward.remaining == 1


@pytest.mark.django_db
def test_remboursement_libere_la_contrepartie():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    reward = Reward.objects.create(
        campaign=campaign, title="Sac", minimum_amount=10000, quantity_limit=1
    )
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10000, "reward_id": reward.id},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    contribution = Contribution.objects.get(public_reference=created.data["public_reference"])

    assert refund_contribution(contribution) is True
    reward.refresh_from_db()
    assert reward.quantity_claimed == 0
    assert reward.sold_out is False
