from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution, Transaction
from apps.contributions.services import refund_contribution
from apps.notifications.models import Notification

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
        "title": "Cantine scolaire de quartier",
        "summary": "Financer du matériel pour la cantine scolaire.",
        "description": "Un projet concret porté par les habitants du quartier.",
        "category": Campaign.Category.EDUCATION,
        "goal_amount": 100_000,
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
def test_kyc_valide_peut_initier_une_contribution():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)

    response = authenticated_client(contributor).post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10_000, "anonymous": True},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["status"] == Contribution.Status.INITIEE
    assert response.data["transaction"]["status"] == Transaction.Status.INITIEE
    assert Contribution.objects.filter(campaign=campaign, amount=10_000).exists()


@pytest.mark.django_db
def test_kyc_non_valide_ne_peut_pas_contribuer():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user(
        "pending@test.sn", kyc=User.KycStatus.EN_ATTENTE
    )
    campaign = make_campaign(owner)

    response = authenticated_client(contributor).post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10_000},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_porteur_ne_peut_pas_contribuer_a_sa_propre_campagne():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    campaign = make_campaign(owner)

    response = authenticated_client(owner).post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10_000},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_paiement_simule_confirme_met_a_jour_la_collecte_une_seule_fois():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 25_000},
        format="json",
    )
    url = f"/api/contributions/{created.data['public_reference']}/confirm/"

    first = client.post(url, {"outcome": "SUCCESS"}, format="json")
    second = client.post(url, {"outcome": "SUCCESS"}, format="json")

    campaign.refresh_from_db()
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.data["status"] == Contribution.Status.CONFIRMEE
    assert campaign.collected_amount == 25_000
    assert Notification.objects.filter(
        recipient=contributor, kind=Notification.Kind.CONTRIBUTION_CONFIRMED
    ).exists()
    assert Notification.objects.filter(
        recipient=owner, kind=Notification.Kind.CONTRIBUTION_RECEIVED
    ).exists()


@pytest.mark.django_db
def test_paiement_simule_echoue_ne_change_pas_la_collecte():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 10_000},
        format="json",
    )

    response = client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "FAILURE"},
        format="json",
    )

    campaign.refresh_from_db()
    assert response.data["status"] == Contribution.Status.ECHOUEE
    assert campaign.collected_amount == 0


@pytest.mark.django_db
def test_remboursement_recalcule_le_total():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 30_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    contribution = Contribution.objects.get(
        public_reference=created.data["public_reference"]
    )

    assert refund_contribution(contribution) is True
    campaign.refresh_from_db()
    assert campaign.collected_amount == 0
    assert Contribution.objects.get(pk=contribution.pk).status == Contribution.Status.REMBOURSEE


@pytest.mark.django_db
def test_listes_contributions_respectent_les_proprietaires():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    outsider = make_user("outsider@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 8_000},
        format="json",
    )

    assert len(client.get("/api/contributions/mine/").data) == 1
    assert len(authenticated_client(owner).get("/api/contributions/received/").data) == 1
    assert authenticated_client(outsider).get("/api/contributions/mine/").data == []
    assert authenticated_client(outsider).get("/api/contributions/received/").data == []


@pytest.mark.django_db
def test_detail_public_masque_le_nom_d_une_contribution_anonyme():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contributor@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 12_000, "anonymous": True},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    response = APIClient().get(f"/api/campaigns/{campaign.slug}/")

    assert response.data["recent_contributors"] == [
        {
            "display_name": "Anonyme",
            "amount": 12_000,
            "confirmed_at": response.data["recent_contributors"][0]["confirmed_at"],
        }
    ]
