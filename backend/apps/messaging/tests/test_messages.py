from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageThread
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


def _creer_fil(owner, other, campaign):
    client = authenticated_client(other)
    response = client.post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour, une question."},
        format="json",
    )
    return MessageThread.objects.get(pk=response.data["id"])


@pytest.mark.django_db
def test_le_porteur_peut_repondre_a_un_fil():
    owner = make_user("owner-m1@test.sn", User.Role.PORTEUR)
    other = make_user("other-m1@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    response = authenticated_client(owner).post(
        f"/api/messagerie/threads/{thread.id}/messages/",
        {"body": "Merci pour votre question, je réponds tout de suite."},
        format="json",
    )

    assert response.status_code == 201
    assert thread.messages.count() == 2
    assert Notification.objects.filter(
        recipient=other, kind=Notification.Kind.MESSAGE_RECEIVED
    ).count() == 1


@pytest.mark.django_db
def test_un_tiers_ne_peut_pas_consulter_le_fil():
    owner = make_user("owner-m2@test.sn", User.Role.PORTEUR)
    other = make_user("other-m2@test.sn")
    tiers = make_user("tiers-m2@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    response = authenticated_client(tiers).get(f"/api/messagerie/threads/{thread.id}/messages/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_consulter_le_fil_marque_les_messages_recus_comme_lus():
    owner = make_user("owner-m3@test.sn", User.Role.PORTEUR)
    other = make_user("other-m3@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    authenticated_client(owner).get(f"/api/messagerie/threads/{thread.id}/messages/")

    message = Message.objects.get(thread=thread, sender=other)
    message.refresh_from_db()
    assert message.read_at is not None


@pytest.mark.django_db
def test_lecture_ne_marque_pas_ses_propres_messages():
    owner = make_user("owner-m4@test.sn", User.Role.PORTEUR)
    other = make_user("other-m4@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    authenticated_client(other).get(f"/api/messagerie/threads/{thread.id}/messages/")

    message = Message.objects.get(thread=thread, sender=other)
    message.refresh_from_db()
    assert message.read_at is None
