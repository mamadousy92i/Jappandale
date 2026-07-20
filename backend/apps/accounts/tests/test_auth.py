import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

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
    assert "access" in response.data
    assert "refresh" in response.data


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
    tokens = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        format="json",
    ).data
    response = client.post(
        "/api/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json"
    )
    assert response.status_code == 200
    assert "access" in response.data
