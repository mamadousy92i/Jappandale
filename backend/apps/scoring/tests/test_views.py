import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR, kyc=User.KycStatus.VALIDE):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=kyc,
        first_name="Awa",
        last_name="Ndiaye",
        email_verified_at=timezone.now(),
    )


@pytest.mark.django_db
def test_porteur_peut_consulter_son_score():
    porteur = make_user("porteur-v1@test.sn", User.Role.PORTEUR)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.get("/api/scoring/mine/")

    assert response.status_code == 200
    assert 0 <= response.data["effective_value"] <= 100
    assert response.data["is_manual_override"] is False


@pytest.mark.django_db
def test_contributeur_ne_peut_pas_consulter_de_score():
    contributor = make_user("contrib-v1@test.sn")
    client = APIClient()
    client.force_authenticate(contributor)

    response = client.get("/api/scoring/mine/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_porteur_peut_consulter_lhistorique_de_ses_scores():
    porteur = make_user("porteur-v2@test.sn", User.Role.PORTEUR)
    client = APIClient()
    client.force_authenticate(porteur)

    client.get("/api/scoring/mine/")
    response = client.get("/api/scoring/mine/history/")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["effective_value"] >= 0
