from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import MessageThread
from apps.notifications.models import Notification

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
def test_utilisateur_kyc_valide_peut_creer_un_fil():
    owner = make_user("owner-t1@test.sn", User.Role.PORTEUR)
    other = make_user("other-t1@test.sn")
    campaign = make_campaign(owner)

    response = authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour, une question sur votre projet."},
        format="json",
    )

    assert response.status_code == 201
    assert MessageThread.objects.filter(campaign=campaign, other_user=other).exists()
    assert Notification.objects.filter(
        recipient=owner, kind=Notification.Kind.MESSAGE_RECEIVED
    ).exists()


@pytest.mark.django_db
def test_utilisateur_non_kyc_valide_ne_peut_pas_creer_un_fil():
    owner = make_user("owner-t2@test.sn", User.Role.PORTEUR)
    other = make_user("other-t2@test.sn", kyc=User.KycStatus.EN_ATTENTE)
    campaign = make_campaign(owner)

    response = authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_porteur_ne_peut_pas_creer_un_fil_sur_sa_propre_campagne():
    owner = make_user("owner-t3@test.sn", User.Role.PORTEUR)
    campaign = make_campaign(owner)

    response = authenticated_client(owner).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_fil_refuse_sur_campagne_en_brouillon():
    owner = make_user("owner-t4@test.sn", User.Role.PORTEUR)
    other = make_user("other-t4@test.sn")
    campaign = make_campaign(owner, status=Campaign.Status.BROUILLON)

    response = authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_liste_des_fils_pour_le_porteur_et_lautre_utilisateur():
    owner = make_user("owner-t5@test.sn", User.Role.PORTEUR)
    other = make_user("other-t5@test.sn")
    campaign = make_campaign(owner)
    authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    owner_response = authenticated_client(owner).get("/api/messagerie/threads/")
    other_response = authenticated_client(other).get("/api/messagerie/threads/")

    assert owner_response.status_code == 200
    assert len(owner_response.data) == 1
    assert other_response.status_code == 200
    assert len(other_response.data) == 1
    assert owner_response.data[0]["other_participant"]["id"] == other.id
    assert other_response.data[0]["other_participant"]["id"] == owner.id
