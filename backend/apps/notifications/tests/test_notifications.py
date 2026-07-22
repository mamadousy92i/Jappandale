import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.notifications.services import notify_user

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="awa@test.sn", password="MotDePasse123!", first_name="Awa"
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_notification_est_persistante_et_envoyee(user):
    notification = notify_user(
        recipient=user,
        kind=Notification.Kind.ACCOUNT_CREATED,
        subject="Bienvenue",
        message="Votre compte est prêt.",
        action_url="/compte",
    )

    assert notification.delivery_status == Notification.DeliveryStatus.SENT
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [user.email]


@pytest.mark.django_db
def test_utilisateur_ne_voit_que_ses_notifications(user):
    other = User.objects.create_user(email="other@test.sn", password="MotDePasse123!")
    Notification.objects.create(
        recipient=user,
        kind=Notification.Kind.ACCOUNT_CREATED,
        subject="Pour Awa",
        message="Message",
    )
    Notification.objects.create(
        recipient=other,
        kind=Notification.Kind.ACCOUNT_CREATED,
        subject="Pour un autre",
        message="Message",
    )

    response = client_for(user).get("/api/notifications/")

    assert response.status_code == 200
    assert [item["subject"] for item in response.data] == ["Pour Awa"]


@pytest.mark.django_db
def test_lecture_notification_met_a_jour_le_compteur(user):
    notification = Notification.objects.create(
        recipient=user,
        kind=Notification.Kind.ACCOUNT_CREATED,
        subject="À lire",
        message="Message",
    )
    client = client_for(user)

    assert client.get("/api/notifications/unread-count/").data["count"] == 1
    assert client.post(f"/api/notifications/{notification.pk}/read/").status_code == 204
    assert client.get("/api/notifications/unread-count/").data["count"] == 0


@pytest.mark.django_db
def test_impossible_de_lire_notification_d_un_autre(user):
    other = User.objects.create_user(email="other@test.sn", password="MotDePasse123!")
    notification = Notification.objects.create(
        recipient=other,
        kind=Notification.Kind.ACCOUNT_CREATED,
        subject="Privée",
        message="Message",
    )

    response = client_for(user).post(
        f"/api/notifications/{notification.pk}/read/"
    )

    assert response.status_code == 404
