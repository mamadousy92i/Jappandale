from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import EmailVerificationOtp
from apps.accounts.services import send_email_verification_otp


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
@patch("apps.accounts.services.secrets.randbelow", return_value=123456)
def test_email_otp_is_sent_and_verifies_user(mock_randbelow):
    user = get_user_model().objects.create_user(
        email="otp@test.sn", password="MotDePasse123!", first_name="Awa"
    )
    send_email_verification_otp(user)
    assert len(mail.outbox) == 1
    assert "123456" in mail.outbox[0].body
    assert mail.outbox[0].alternatives[0].mimetype == "text/html"
    assert "cid:jappandale-logo" in mail.outbox[0].alternatives[0].content
    assert mail.outbox[0].mixed_subtype == "related"
    assert EmailVerificationOtp.objects.filter(user=user).count() == 1

    client = APIClient()
    client.force_authenticate(user)
    response = client.post(
        "/api/auth/email-verification/verify/", {"code": "123456"}, format="json"
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.is_email_verified


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
@patch("apps.accounts.services.secrets.randbelow", return_value=654321)
def test_wrong_email_otp_is_rejected(mock_randbelow):
    user = get_user_model().objects.create_user(
        email="wrong-otp@test.sn", password="MotDePasse123!"
    )
    otp = send_email_verification_otp(user)
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(
        "/api/auth/email-verification/verify/", {"code": "000000"}, format="json"
    )

    assert response.status_code == 400
    otp.refresh_from_db()
    assert otp.attempts == 1
