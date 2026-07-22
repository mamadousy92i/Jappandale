import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_password_reset_request_and_confirmation():
    user = get_user_model().objects.create_user(
        email="reset@test.sn", password="AncienMotDePasse123!"
    )
    client = APIClient()

    request_response = client.post(
        "/api/auth/password-reset/", {"email": user.email}, format="json"
    )

    assert request_response.status_code == 200
    assert len(mail.outbox) == 1
    match = re.search(r"/mot-de-passe/reinitialiser/([^/]+)/([^\s]+)", mail.outbox[0].body)
    assert match
    uid, token = match.groups()

    confirm_response = client.post(
        "/api/auth/password-reset/confirm/",
        {"uid": uid, "token": token, "new_password": "NouveauMotDePasse456!"},
        format="json",
    )

    assert confirm_response.status_code == 200
    user.refresh_from_db()
    assert user.check_password("NouveauMotDePasse456!")


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_password_reset_does_not_reveal_unknown_email():
    response = APIClient().post(
        "/api/auth/password-reset/", {"email": "inconnu@test.sn"}, format="json"
    )
    assert response.status_code == 200
    assert len(mail.outbox) == 0
