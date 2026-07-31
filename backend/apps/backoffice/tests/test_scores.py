import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-score-bo@test.sn", password="MotDePasse123!")


def _porteur():
    return User.objects.create_user(
        email="porteur-score-bo@test.sn",
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        email_verified_at=timezone.now(),
    )


@pytest.mark.django_db
def test_admin_peut_surclasser_le_score_dun_porteur():
    porteur = _porteur()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/scores/{porteur.id}/override/",
        {"override_value": 90, "note": "Exécution exemplaire constatée sur le terrain."},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["effective_value"] == 90
    assert response.data["is_manual_override"] is True


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_surclasser_un_score():
    porteur = _porteur()
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(
        f"/api/backoffice/scores/{porteur.id}/override/",
        {"override_value": 90, "note": "Note."},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_dashboard_expose_les_scores_des_porteurs():
    porteur = _porteur()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)
    client.post(
        f"/api/backoffice/scores/{porteur.id}/override/",
        {"override_value": 77, "note": "Note."},
        format="json",
    )

    response = client.get("/api/backoffice/dashboard/")

    assert response.status_code == 200
    entry = next(
        item for item in response.data["porteurs_scores"] if item["porteur"]["id"] == porteur.id
    )
    assert entry["effective_value"] == 77
    assert response.data["scoring_settings"]["score_base"] == "50.00"


@pytest.mark.django_db
def test_admin_peut_modifier_les_reglages_du_score():
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        "/api/backoffice/scoring-settings/",
        {"poids_kyc": "20.00"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["poids_kyc"] == "20.00"
