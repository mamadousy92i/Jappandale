import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

DONNEES_VALIDES = {
    "email": "nouveau@test.sn",
    "password": "MotDePasse123!",
    "first_name": "Awa",
    "last_name": "Diop",
    "role": "PORTEUR",
}


@pytest.mark.django_db
def test_inscription_valide():
    client = APIClient()
    response = client.post("/api/auth/register/", DONNEES_VALIDES, format="json")
    assert response.status_code == 201
    assert response.data["email"] == "nouveau@test.sn"
    assert response.data["role"] == "PORTEUR"
    assert "password" not in response.data
    user = User.objects.get(email="nouveau@test.sn")
    assert user.check_password("MotDePasse123!")


@pytest.mark.django_db
def test_inscription_role_admin_refusee():
    client = APIClient()
    response = client.post(
        "/api/auth/register/", {**DONNEES_VALIDES, "role": "ADMIN"}, format="json"
    )
    assert response.status_code == 400
    assert "role" in response.data


@pytest.mark.django_db
def test_inscription_email_deja_pris():
    User.objects.create_user(email="nouveau@test.sn", password="Xx12345678!")
    client = APIClient()
    response = client.post("/api/auth/register/", DONNEES_VALIDES, format="json")
    assert response.status_code == 400
    assert "email" in response.data


@pytest.mark.django_db
def test_inscription_mot_de_passe_faible_refusee():
    client = APIClient()
    response = client.post(
        "/api/auth/register/", {**DONNEES_VALIDES, "password": "1234"}, format="json"
    )
    assert response.status_code == 400
    assert "password" in response.data
