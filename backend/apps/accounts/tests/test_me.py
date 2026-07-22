from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def client_authentifie(db):
    user = User.objects.create_user(
        email="moi@test.sn", password="MotDePasse123!", first_name="Awa"
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
def test_me_authentifie(client_authentifie):
    client, user = client_authentifie
    response = client.get("/api/auth/me/")
    assert response.status_code == 200
    assert response.data["email"] == "moi@test.sn"
    assert response.data["first_name"] == "Awa"


@pytest.mark.django_db
def test_me_anonyme_refuse():
    response = APIClient().get("/api/auth/me/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_modification_prenom(client_authentifie):
    client, user = client_authentifie
    response = client.patch("/api/auth/me/", {"first_name": "Fatou"}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Fatou"


@pytest.mark.django_db
def test_me_email_et_role_non_modifiables(client_authentifie):
    client, user = client_authentifie
    client.patch(
        "/api/auth/me/", {"email": "pirate@test.sn", "role": "ADMIN"}, format="json"
    )
    user.refresh_from_db()
    assert user.email == "moi@test.sn"
    assert user.role == User.Role.CONTRIBUTEUR


@pytest.mark.django_db
def test_me_ajoute_et_supprime_avatar(client_authentifie, tmp_path):
    client, user = client_authentifie
    image = BytesIO()
    Image.new("RGB", (160, 160), color=(250, 197, 2)).save(image, format="PNG")
    upload = SimpleUploadedFile("avatar.png", image.getvalue(), content_type="image/png")

    with override_settings(MEDIA_ROOT=tmp_path):
        response = client.patch("/api/auth/me/", {"avatar": upload}, format="multipart")
        assert response.status_code == 200
        assert response.data["avatar"].endswith(".png")
        user.refresh_from_db()
        stored_path = tmp_path / user.avatar.name
        assert stored_path.exists()

        response = client.patch("/api/auth/me/", {"avatar": None}, format="json")
        assert response.status_code == 200
        user.refresh_from_db()
        assert not user.avatar
        assert not stored_path.exists()
