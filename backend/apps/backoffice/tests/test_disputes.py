from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-dispute@test.sn", password="MotDePasse123!")


def _litige():
    owner = User.objects.create_user(
        email="owner-bod@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    contributor = User.objects.create_user(email="contrib-bod@test.sn", password="MotDePasse123!")
    campaign = Campaign.objects.create(
        owner=owner,
        title="Projet en litige",
        summary="Résumé.",
        description="Description.",
        category=Campaign.Category.EDUCATION,
        goal_amount=100_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
        collected_amount=20_000,
    )
    contribution = Contribution.objects.create(
        contributor=contributor,
        campaign=campaign,
        amount=20_000,
        status=Contribution.Status.CONFIRMEE,
        commission_amount=1_000,
        net_amount=19_000,
    )
    return Dispute.objects.create(
        contribution=contribution, reporter=contributor, reason="AUTRE", details="Détails."
    )


@pytest.mark.django_db
def test_admin_peut_passer_un_litige_en_examen():
    dispute = _litige()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/disputes/{dispute.id}/",
        {"status": "EN_EXAMEN", "admin_note": "Pris en charge."},
        format="json",
    )

    assert response.status_code == 200
    dispute.refresh_from_db()
    assert dispute.status == "EN_EXAMEN"
    assert dispute.resolved_at is None


@pytest.mark.django_db
def test_admin_accepte_un_litige_et_declenche_le_remboursement():
    dispute = _litige()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/disputes/{dispute.id}/",
        {"status": "ACCEPTE", "admin_note": "Remboursement accordé."},
        format="json",
    )

    assert response.status_code == 200
    dispute.refresh_from_db()
    assert dispute.status == "ACCEPTE"
    assert dispute.admin_note == "Remboursement accordé."
    dispute.contribution.refresh_from_db()
    assert dispute.contribution.status == Contribution.Status.REMBOURSEE


@pytest.mark.django_db
def test_litige_rejete_ne_change_rien_a_la_contribution():
    dispute = _litige()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/disputes/{dispute.id}/",
        {"status": "REJETE", "admin_note": "Aucun manquement constaté."},
        format="json",
    )

    assert response.status_code == 200
    dispute.refresh_from_db()
    assert dispute.status == "REJETE"
    assert dispute.resolved_at is not None
    dispute.contribution.refresh_from_db()
    assert dispute.contribution.status == Contribution.Status.CONFIRMEE


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_mettre_a_jour_un_litige():
    dispute = _litige()
    client = APIClient()
    client.force_authenticate(dispute.reporter)

    response = client.patch(
        f"/api/backoffice/disputes/{dispute.id}/",
        {"status": "EN_EXAMEN"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_dashboard_expose_les_litiges_ouverts():
    dispute = _litige()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get("/api/backoffice/dashboard/")

    assert response.status_code == 200
    assert response.data["metrics"]["open_disputes"] == 1
    assert len(response.data["disputes"]) == 1
    assert response.data["disputes"][0]["id"] == dispute.id
