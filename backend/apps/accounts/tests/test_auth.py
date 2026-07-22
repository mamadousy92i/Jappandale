from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import AdminLoginOtp

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="porteur@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )


@pytest.mark.django_db
def test_obtention_token_avec_bons_identifiants(user):
    client = APIClient()
    response = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data == {"detail": "Connexion réussie."}
    assert response.cookies["jappandale_access"]["httponly"]
    assert response.cookies["jappandale_refresh"]["httponly"]


@pytest.mark.django_db
def test_statut_session_anonyme_puis_connectee(user):
    client = APIClient()
    anonymous = client.get("/api/auth/session/")
    assert anonymous.status_code == 200
    assert anonymous.data == {"authenticated": False, "can_refresh": False}

    login = client.post(
        "/api/auth/token/",
        {"email": user.email, "password": "MotDePasse123!"},
        format="json",
    )
    client.cookies["jappandale_access"] = login.cookies[
        "jappandale_access"
    ].value
    client.cookies["jappandale_refresh"] = login.cookies[
        "jappandale_refresh"
    ].value
    connected = client.get("/api/auth/session/")
    assert connected.data == {"authenticated": True, "can_refresh": True}


@pytest.mark.django_db
def test_refus_token_mauvais_mot_de_passe(user):
    client = APIClient()
    response = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "mauvais"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_rafraichissement_token(user):
    client = APIClient()
    login = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        format="json",
    )
    client.cookies["jappandale_refresh"] = login.cookies["jappandale_refresh"].value
    response = client.post("/api/auth/token/refresh/", {}, format="json")
    assert response.status_code == 200
    assert response.data == {"detail": "Session renouvelée."}
    assert response.cookies["jappandale_access"]["httponly"]


@pytest.mark.django_db
def test_cookie_authentifie_me_et_logout_supprime_les_cookies(user):
    client = APIClient()
    login = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        format="json",
    )
    client.cookies["jappandale_access"] = login.cookies["jappandale_access"].value
    assert client.get("/api/auth/me/").status_code == 200

    logout = client.post("/api/auth/logout/", {}, format="json")
    assert logout.status_code == 204
    assert logout.cookies["jappandale_access"]["max-age"] == 0
    assert logout.cookies["jappandale_refresh"]["max-age"] == 0


@pytest.mark.django_db
def test_connexion_exige_un_jeton_csrf_dans_un_navigateur(user):
    client = Client(enforce_csrf_checks=True)
    response = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        content_type="application/json",
    )
    assert response.status_code == 403

    client.get("/api/auth/csrf/")
    token = client.cookies["csrftoken"].value
    response = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_connexion_admin_exige_le_code_recu_par_email(monkeypatch):
    admin = User.objects.create_user(
        email="admin@test.sn",
        password="MotDePasse123!",
        role=User.Role.ADMIN,
        is_staff=True,
    )
    code = "123456"

    def fake_send_otp(user):
        otp = AdminLoginOtp(
            user=user,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        otp.set_code(code)
        otp.save()
        return otp

    monkeypatch.setattr("apps.accounts.views.send_admin_login_otp", fake_send_otp)
    client = APIClient()
    login = client.post(
        "/api/auth/token/",
        {"email": admin.email, "password": "MotDePasse123!"},
        format="json",
    )

    assert login.status_code == 202
    assert login.data["requires_mfa"] is True
    assert "jappandale_access" not in login.cookies

    verify = client.post(
        "/api/auth/token/mfa/",
        {"challenge_id": login.data["challenge_id"], "code": code},
        format="json",
    )
    assert verify.status_code == 200
    assert verify.cookies["jappandale_access"]["httponly"]
    assert verify.cookies["jappandale_refresh"]["httponly"]


@pytest.mark.django_db
def test_code_admin_incorrect_compte_les_tentatives():
    admin = User.objects.create_user(
        email="admin@test.sn", password="MotDePasse123!", role=User.Role.ADMIN
    )
    otp = AdminLoginOtp(
        user=admin,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    otp.set_code("123456")
    otp.save()

    response = APIClient().post(
        "/api/auth/token/mfa/",
        {"challenge_id": str(otp.public_id), "code": "000000"},
        format="json",
    )
    assert response.status_code == 400
    otp.refresh_from_db()
    assert otp.attempts == 1
