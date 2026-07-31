import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import UserAuditLog

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-mgmt@test.sn", password="MotDePasse123!")


def _member(**overrides):
    values = {"email": "membre-mgmt@test.sn", "password": "MotDePasse123!", "first_name": "Mariama"}
    values.update(overrides)
    return User.objects.create_user(**values)


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_creer_un_utilisateur():
    member = _member()
    client = APIClient()
    client.force_authenticate(member)

    response = client.post(
        "/api/backoffice/users/",
        {"email": "nouveau@test.sn", "first_name": "Awa", "last_name": "Ndiaye", "role": "PORTEUR"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_peut_creer_un_utilisateur():
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        "/api/backoffice/users/",
        {
            "email": "nouveau@test.sn",
            "first_name": "Awa",
            "last_name": "Ndiaye",
            "role": "PORTEUR",
            "phone": "+221770000000",
        },
        format="json",
    )

    assert response.status_code == 201
    created = User.objects.get(email="nouveau@test.sn")
    assert created.role == "PORTEUR"
    assert created.account_status == "VALIDE"
    assert created.is_email_verified is True
    assert created.has_usable_password() is False
    assert UserAuditLog.objects.filter(
        user=created, actor=admin, action=UserAuditLog.Action.CREATED
    ).exists()
    assert len(mail.outbox) == 1
    assert "nouveau@test.sn" in mail.outbox[0].to


@pytest.mark.django_db
def test_creer_un_utilisateur_avec_un_email_deja_pris_est_refuse():
    _member()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        "/api/backoffice/users/",
        {"email": "membre-mgmt@test.sn", "first_name": "Awa", "last_name": "Ndiaye", "role": "PORTEUR"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_peut_modifier_les_informations_dun_utilisateur():
    admin = _admin()
    member = _member()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/users/{member.id}/",
        {"first_name": "Fatou", "phone": "+221771112233", "city": "Thiès"},
        format="json",
    )

    assert response.status_code == 200
    member.refresh_from_db()
    assert member.first_name == "Fatou"
    assert member.phone == "+221771112233"
    assert member.city == "Thiès"
    assert UserAuditLog.objects.filter(
        user=member, actor=admin, action=UserAuditLog.Action.INFO_UPDATED
    ).exists()


@pytest.mark.django_db
def test_admin_ne_peut_pas_supprimer_son_propre_compte():
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.delete(
        f"/api/backoffice/users/{admin.id}/",
        {"note": "Test."},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_supprimer_un_compte_sans_motif_est_refuse():
    admin = _admin()
    member = _member()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.delete(
        f"/api/backoffice/users/{member.id}/",
        {"note": ""},
        format="json",
    )

    assert response.status_code == 400
    member.refresh_from_db()
    assert member.is_active is True


@pytest.mark.django_db
def test_admin_peut_supprimer_anonymiser_un_compte():
    admin = _admin()
    member = _member(first_name="Mariama", last_name="Diop", phone="+221770001122")
    client = APIClient()
    client.force_authenticate(admin)

    response = client.delete(
        f"/api/backoffice/users/{member.id}/",
        {"note": "Demande de suppression de l'utilisateur."},
        format="json",
    )

    assert response.status_code == 200
    member.refresh_from_db()
    assert member.email == f"compte-supprime-{member.id}@jappandale.invalid"
    assert member.first_name == "Compte"
    assert member.phone == ""
    assert member.is_active is False
    assert member.account_status == "REJETE"
    assert member.has_usable_password() is False
    log = UserAuditLog.objects.get(user=member, actor=admin, action=UserAuditLog.Action.DELETED)
    assert log.previous_value == "membre-mgmt@test.sn"
    assert log.note == "Demande de suppression de l'utilisateur."
