import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


def make_porteur(email):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        first_name="Awa",
        last_name="Ndiaye",
        email_verified_at=timezone.now(),
    )


@pytest.mark.django_db
@override_settings(INTERNAL_API_KEY="cle-de-test")
def test_appel_sans_cle_est_refuse():
    porteur = make_porteur("porteur-interne-1@test.sn")
    client = APIClient()

    response = client.get(f"/api/scoring/interne/{porteur.id}/")

    assert response.status_code == 403


@pytest.mark.django_db
@override_settings(INTERNAL_API_KEY="cle-de-test")
def test_appel_avec_mauvaise_cle_est_refuse():
    porteur = make_porteur("porteur-interne-2@test.sn")
    client = APIClient()

    response = client.get(
        f"/api/scoring/interne/{porteur.id}/",
        HTTP_X_INTERNAL_API_KEY="mauvaise-cle",
    )

    assert response.status_code == 403


@pytest.mark.django_db
@override_settings(INTERNAL_API_KEY="")
def test_cle_vide_dans_les_reglages_refuse_tout_appel():
    porteur = make_porteur("porteur-interne-3@test.sn")
    client = APIClient()

    response = client.get(
        f"/api/scoring/interne/{porteur.id}/",
        HTTP_X_INTERNAL_API_KEY="",
    )

    assert response.status_code == 403


@pytest.mark.django_db
@override_settings(INTERNAL_API_KEY="cle-de-test")
def test_appel_avec_bonne_cle_renvoie_le_score():
    porteur = make_porteur("porteur-interne-4@test.sn")
    client = APIClient()

    response = client.get(
        f"/api/scoring/interne/{porteur.id}/",
        HTTP_X_INTERNAL_API_KEY="cle-de-test",
    )

    assert response.status_code == 200
    assert response.data["porteur_id"] == porteur.id
    assert 0 <= response.data["value"] <= 100
    assert response.data["latest_persisted"] is None


@pytest.mark.django_db
@override_settings(INTERNAL_API_KEY="cle-de-test")
def test_authentification_utilisateur_normale_ne_suffit_pas():
    porteur = make_porteur("porteur-interne-5@test.sn")
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.get(f"/api/scoring/interne/{porteur.id}/")

    assert response.status_code == 403
