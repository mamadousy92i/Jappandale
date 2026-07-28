from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageThread

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
def test_creation_dun_fil_et_dun_message():
    owner = make_user("owner-msg1@test.sn", User.Role.PORTEUR)
    other = make_user("other-msg1@test.sn")
    campaign = make_campaign(owner)

    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Bonjour !")

    assert message.read_at is None
    assert thread.messages.count() == 1


@pytest.mark.django_db
def test_unicite_campagne_autre_utilisateur():
    owner = make_user("owner-msg2@test.sn", User.Role.PORTEUR)
    other = make_user("other-msg2@test.sn")
    campaign = make_campaign(owner)
    MessageThread.objects.create(campaign=campaign, other_user=other)

    with pytest.raises(IntegrityError):
        MessageThread.objects.create(campaign=campaign, other_user=other)
