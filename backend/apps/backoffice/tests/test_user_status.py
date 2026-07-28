import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import UserAuditLog

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-status@test.sn", password="MotDePasse123!")


def _member():
    return User.objects.create_user(
        email="membre-status@test.sn", password="MotDePasse123!", first_name="Mariama"
    )


@pytest.mark.django_db
def test_admin_peut_suspendre_un_compte_avec_note():
    admin = _admin()
    member = _member()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/users/{member.id}/",
        {"account_status": "SUSPENDU", "note": "Comportement abusif signalé."},
        format="json",
    )

    assert response.status_code == 200
    member.refresh_from_db()
    assert member.account_status == "SUSPENDU"
    assert member.is_active is False
    assert member.account_status_note == "Comportement abusif signalé."
    assert member.account_status_changed_by == admin
    assert UserAuditLog.objects.filter(
        user=member, actor=admin, action=UserAuditLog.Action.ACCOUNT_STATUS_CHANGED
    ).exists()


@pytest.mark.django_db
def test_suspendre_sans_note_est_refuse():
    admin = _admin()
    member = _member()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/users/{member.id}/",
        {"account_status": "SUSPENDU"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_peut_revalider_un_compte_suspendu():
    admin = _admin()
    member = _member()
    client = APIClient()
    client.force_authenticate(admin)
    client.patch(
        f"/api/backoffice/users/{member.id}/",
        {"account_status": "SUSPENDU", "note": "Motif."},
        format="json",
    )

    response = client.patch(
        f"/api/backoffice/users/{member.id}/",
        {"account_status": "VALIDE"},
        format="json",
    )

    assert response.status_code == 200
    member.refresh_from_db()
    assert member.account_status == "VALIDE"
    assert member.is_active is True


@pytest.mark.django_db
def test_admin_ne_peut_pas_suspendre_son_propre_compte():
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/users/{admin.id}/",
        {"account_status": "SUSPENDU", "note": "Motif."},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_changement_de_role_est_journalise():
    admin = _admin()
    member = _member()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/users/{member.id}/",
        {"role": "PORTEUR"},
        format="json",
    )

    assert response.status_code == 200
    assert UserAuditLog.objects.filter(
        user=member, actor=admin, action=UserAuditLog.Action.ROLE_CHANGED
    ).exists()
