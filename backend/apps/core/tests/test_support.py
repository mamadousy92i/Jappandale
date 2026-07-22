import pytest
from rest_framework.test import APIClient

from apps.core.models import SupportRequest


@pytest.mark.django_db
def test_public_support_request_is_persisted():
    response = APIClient().post(
        "/api/support/requests/",
        {
            "name": "Awa Diop",
            "email": "awa@example.sn",
            "subject": "Question sur une campagne",
            "message": "Je souhaite obtenir une précision sur la collecte.",
        },
        format="json",
    )

    assert response.status_code == 201
    request = SupportRequest.objects.get()
    assert request.email == "awa@example.sn"
    assert request.status == SupportRequest.Status.NOUVELLE


@pytest.mark.django_db
def test_support_request_rejects_invalid_email():
    response = APIClient().post(
        "/api/support/requests/",
        {"name": "Awa", "email": "incorrect", "subject": "Aide", "message": "Bonjour"},
        format="json",
    )
    assert response.status_code == 400
