from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign, Reward

User = get_user_model()


def _porteur_valide(email="porteur@test.sn"):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        first_name="Awa",
        last_name="Diop",
        email_verified_at=timezone.now(),
    )


def _creer_campagne(owner, **overrides):
    defaults = dict(
        title="Atelier de couture solidaire",
        summary="Équiper un atelier de couture.",
        description="Description détaillée.",
        location="Médina, Dakar",
        beneficiaries="10 apprenties",
        funding_plan="Machines — 400 000 F CFA",
        project_timeline="Semaine 1 : achat du matériel",
        category="ARTISANAT",
        campaign_type=Campaign.CampaignType.DON_CONTREPARTIE,
        goal_amount=500000,
        status=Campaign.Status.BROUILLON,
        deadline=timezone.localdate() + timedelta(days=30),
    )
    defaults.update(overrides)
    return Campaign.objects.create(owner=owner, **defaults)


@pytest.mark.django_db
def test_creation_campagne_don_libre_par_defaut():
    client = APIClient()
    client.force_authenticate(_porteur_valide())
    response = client.post(
        "/api/campaigns/",
        {
            "title": "Boutique de quartier",
            "summary": "Ouvrir une boutique.",
            "description": "Description.",
            "location": "Pikine, Dakar",
            "beneficiaries": "La famille et le quartier",
            "funding_plan": "Stock initial",
            "project_timeline": "Semaine 1",
            "category": "COMMERCE",
            "goal_amount": 300000,
            "deadline": (timezone.localdate() + timedelta(days=20)).isoformat(),
        },
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["campaign_type"] == Campaign.CampaignType.DON_LIBRE


@pytest.mark.django_db
def test_porteur_cree_une_contrepartie():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(
        f"/api/campaigns/{campagne.slug}/rewards/",
        {
            "title": "Sac cousu main",
            "description": "Un sac fabriqué par l'atelier.",
            "minimum_amount": 15000,
            "quantity_limit": 20,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["title"] == "Sac cousu main"
    assert response.data["remaining"] == 20
    assert Reward.objects.filter(campaign=campagne).count() == 1


@pytest.mark.django_db
def test_contrepartie_refusee_sur_campagne_don_libre():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, campaign_type=Campaign.CampaignType.DON_LIBRE)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(
        f"/api/campaigns/{campagne.slug}/rewards/",
        {"title": "Sac", "minimum_amount": 10000},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_contrepartie_refusee_pour_non_proprietaire():
    porteur = _porteur_valide()
    autre = _porteur_valide(email="autre@test.sn")
    campagne = _creer_campagne(porteur)
    client = APIClient()
    client.force_authenticate(autre)

    response = client.post(
        f"/api/campaigns/{campagne.slug}/rewards/",
        {"title": "Sac", "minimum_amount": 10000},
        format="json",
    )

    assert response.status_code in (403, 404)


@pytest.mark.django_db
def test_contrepartie_refusee_sur_campagne_publiee():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(
        f"/api/campaigns/{campagne.slug}/rewards/",
        {"title": "Sac", "minimum_amount": 10000},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_montant_minimum_contrepartie_valide():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(
        f"/api/campaigns/{campagne.slug}/rewards/",
        {"title": "Sac", "minimum_amount": 100},
        format="json",
    )

    assert response.status_code == 400
    assert "minimum_amount" in response.data


@pytest.mark.django_db
def test_modification_contrepartie():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur)
    reward = Reward.objects.create(campaign=campagne, title="Sac", minimum_amount=10000)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.patch(
        f"/api/campaigns/{campagne.slug}/rewards/{reward.id}/",
        {"title": "Sac artisanal"},
        format="json",
    )

    assert response.status_code == 200
    reward.refresh_from_db()
    assert reward.title == "Sac artisanal"


@pytest.mark.django_db
def test_suppression_contrepartie_non_reservee():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur)
    reward = Reward.objects.create(campaign=campagne, title="Sac", minimum_amount=10000)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.delete(f"/api/campaigns/{campagne.slug}/rewards/{reward.id}/")

    assert response.status_code == 204
    assert not Reward.objects.filter(pk=reward.pk).exists()


@pytest.mark.django_db
def test_suppression_contrepartie_reservee_refusee():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur)
    reward = Reward.objects.create(
        campaign=campagne, title="Sac", minimum_amount=10000, quantity_limit=5, quantity_claimed=1
    )
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.delete(f"/api/campaigns/{campagne.slug}/rewards/{reward.id}/")

    assert response.status_code == 400
    assert Reward.objects.filter(pk=reward.pk).exists()


@pytest.mark.django_db
def test_contrepartie_visible_dans_le_detail_public():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    Reward.objects.create(
        campaign=campagne, title="Sac", minimum_amount=10000, quantity_limit=3, quantity_claimed=1
    )

    response = APIClient().get(f"/api/campaigns/{campagne.slug}/")

    assert response.status_code == 200
    assert len(response.data["rewards"]) == 1
    assert response.data["rewards"][0]["remaining"] == 2
    assert response.data["rewards"][0]["sold_out"] is False


@pytest.mark.django_db
def test_reward_sold_out_quand_quantite_epuisee():
    reward = Reward(minimum_amount=5000, quantity_limit=2, quantity_claimed=2)
    assert reward.sold_out is True
    assert reward.remaining == 0


@pytest.mark.django_db
def test_reward_illimitee_sans_quantite():
    reward = Reward(minimum_amount=5000, quantity_limit=None, quantity_claimed=10)
    assert reward.sold_out is False
    assert reward.remaining is None
