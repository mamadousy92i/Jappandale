from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageReport, MessageThread

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
def test_signalement_dun_message():
    owner = make_user("owner-r1@test.sn", User.Role.PORTEUR)
    other = make_user("other-r1@test.sn")
    campaign = make_campaign(owner)
    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Contenu litigieux")

    response = authenticated_client(owner).post(
        f"/api/messagerie/messages/{message.id}/report/",
        {"reason": "CONTENU_INAPPROPRIE", "details": "Message déplacé."},
        format="json",
    )

    assert response.status_code == 201
    report = MessageReport.objects.get(message=message)
    assert report.reporter == owner
    assert report.status == MessageReport.Status.NOUVEAU


@pytest.mark.django_db
def test_un_tiers_ne_peut_pas_signaler_un_message_hors_de_son_fil():
    owner = make_user("owner-r2@test.sn", User.Role.PORTEUR)
    other = make_user("other-r2@test.sn")
    tiers = make_user("tiers-r2@test.sn")
    campaign = make_campaign(owner)
    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Contenu")

    response = authenticated_client(tiers).post(
        f"/api/messagerie/messages/{message.id}/report/",
        {"reason": "AUTRE", "details": "Détails."},
        format="json",
    )

    assert response.status_code == 404
