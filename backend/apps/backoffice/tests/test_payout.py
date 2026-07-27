from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="gestion-payout@test.sn", password="MotDePasse123!")


def _campagne_cloturee_avec_contribution(montant=20_000):
    owner = User.objects.create_user(
        email="owner-bo@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    contributor = User.objects.create_user(
        email="contrib-bo@test.sn",
        password="MotDePasse123!",
        kyc_status=User.KycStatus.VALIDE,
        email_verified_at=timezone.now(),
    )
    campaign = Campaign.objects.create(
        owner=owner,
        title="Projet clôturé",
        summary="Résumé.",
        description="Description.",
        category=Campaign.Category.EDUCATION,
        goal_amount=100_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )
    client = APIClient()
    client.force_authenticate(contributor)
    created = client.post(
        "/api/contributions/", {"campaign_slug": campaign.slug, "amount": montant}, format="json"
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    return campaign


@pytest.mark.django_db
def test_reversement_refuse_a_un_non_admin():
    campaign = _campagne_cloturee_avec_contribution()
    client = APIClient()
    client.force_authenticate(campaign.owner)

    response = client.post(f"/api/backoffice/campaigns/{campaign.id}/reverser/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_declenche_le_reversement():
    campaign = _campagne_cloturee_avec_contribution(montant=20_000)
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(f"/api/backoffice/campaigns/{campaign.id}/reverser/")

    assert response.status_code == 200
    contribution = Contribution.objects.get(campaign=campaign)
    assert contribution.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution.payout_released_by_id == admin.id


@pytest.mark.django_db
def test_reversement_refuse_si_campagne_pas_cloturee():
    owner = User.objects.create_user(
        email="owner-bo2@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    campaign = Campaign.objects.create(
        owner=owner,
        title="Projet en cours",
        summary="Résumé.",
        description="Description.",
        category=Campaign.Category.EDUCATION,
        goal_amount=100_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(f"/api/backoffice/campaigns/{campaign.id}/reverser/")

    assert response.status_code == 400
