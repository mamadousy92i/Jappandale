from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageReport, MessageThread

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-msgreport@test.sn", password="MotDePasse123!")


def _signalement():
    owner = User.objects.create_user(
        email="owner-mr@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    other = User.objects.create_user(email="other-mr@test.sn", password="MotDePasse123!")
    campaign = Campaign.objects.create(
        owner=owner,
        title="Projet signalé",
        summary="Résumé.",
        description="Description.",
        category=Campaign.Category.EDUCATION,
        goal_amount=100_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )
    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Contenu")
    return MessageReport.objects.create(
        message=message, reporter=owner, reason="AUTRE", details="Détails."
    )


@pytest.mark.django_db
def test_admin_peut_mettre_a_jour_un_signalement_de_message():
    report = _signalement()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/message-reports/{report.id}/",
        {"status": "RESOLU", "admin_note": "Traité."},
        format="json",
    )

    assert response.status_code == 200
    report.refresh_from_db()
    assert report.status == "RESOLU"
    assert report.admin_note == "Traité."


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_mettre_a_jour_un_signalement():
    report = _signalement()
    client = APIClient()
    client.force_authenticate(report.reporter)

    response = client.patch(
        f"/api/backoffice/message-reports/{report.id}/",
        {"status": "RESOLU"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_dashboard_expose_les_signalements_de_messages():
    report = _signalement()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get("/api/backoffice/dashboard/")

    assert response.status_code == 200
    assert response.data["metrics"]["open_message_reports"] == 1
    assert len(response.data["message_reports"]) == 1
    assert response.data["message_reports"][0]["id"] == report.id
