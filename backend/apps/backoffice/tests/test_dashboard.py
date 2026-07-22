from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign, CampaignAuditLog, CampaignReport
from apps.core.models import SupportReply, SupportRequest
from apps.kyc.models import KycAuditLog, KycDocument
from apps.notifications.models import Notification

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="gestion@test.sn", password="MotDePasse123!")


def _campaign(owner, status=Campaign.Status.EN_MODERATION):
    return Campaign.objects.create(
        owner=owner,
        title="Projet à examiner",
        summary="Une campagne complète à examiner.",
        description="Description détaillée.",
        location="Dakar",
        beneficiaries="Une coopérative locale",
        funding_plan="Équipement",
        project_timeline="Lancement en août",
        goal_amount=500000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=status,
    )


@pytest.mark.django_db
def test_dashboard_is_forbidden_to_regular_user():
    user = User.objects.create_user(email="membre@test.sn", password="MotDePasse123!")
    client = APIClient()
    client.force_authenticate(user)
    assert client.get("/api/backoffice/dashboard/").status_code == 403


@pytest.mark.django_db
def test_dashboard_returns_action_queues_to_admin():
    admin = _admin()
    owner = User.objects.create_user(
        email="porteur@test.sn",
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.EN_ATTENTE,
    )
    _campaign(owner)
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get("/api/backoffice/dashboard/")

    assert response.status_code == 200
    assert response.data["metrics"]["pending_kyc"] == 1
    assert response.data["metrics"]["pending_campaigns"] == 1
    assert response.data["campaigns"][0]["title"] == "Projet à examiner"


@pytest.mark.django_db
def test_admin_can_review_kyc_and_signed_document_link():
    admin = _admin()
    user = User.objects.create_user(
        email="kyc@test.sn",
        password="MotDePasse123!",
        kyc_status=User.KycStatus.EN_ATTENTE,
    )
    KycDocument.objects.create(
        user=user,
        document_type=KycDocument.DocumentType.CNI,
        file=SimpleUploadedFile("identite.txt", b"document de test", content_type="text/plain"),
    )
    client = APIClient()
    client.force_authenticate(admin)
    dashboard = client.get("/api/backoffice/dashboard/")
    file_url = dashboard.data["kyc"][0]["documents"][0]["file_url"]

    document_response = APIClient().get(file_url)
    assert document_response.status_code == 200
    assert document_response["X-Frame-Options"] == "SAMEORIGIN"
    decision = client.post(
        f"/api/backoffice/kyc/{user.id}/decision/", {"decision": "VALIDE", "note": "Dossier conforme."}, format="json"
    )

    assert decision.status_code == 200
    user.refresh_from_db()
    assert user.kyc_status == User.KycStatus.VALIDE
    assert KycAuditLog.objects.filter(user=user, actor=admin).exists()
    assert Notification.objects.filter(recipient=user, kind=Notification.Kind.KYC_VALIDATED).exists()


@pytest.mark.django_db
def test_admin_can_publish_campaign():
    admin = _admin()
    owner = User.objects.create_user(email="owner@test.sn", password="MotDePasse123!")
    campaign = _campaign(owner)
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/campaigns/{campaign.id}/decision/",
        {"decision": "PUBLIEE", "note": ""},
        format="json",
    )

    assert response.status_code == 200
    campaign.refresh_from_db()
    assert campaign.status == Campaign.Status.PUBLIEE
    assert campaign.published_at is not None
    assert CampaignAuditLog.objects.filter(
        campaign=campaign, action=CampaignAuditLog.Action.PUBLISHED, actor=admin
    ).exists()


@pytest.mark.django_db
def test_rejection_requires_a_clear_note():
    admin = _admin()
    owner = User.objects.create_user(email="reject@test.sn", password="MotDePasse123!")
    campaign = _campaign(owner)
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/campaigns/{campaign.id}/decision/",
        {"decision": "REJETEE", "note": ""},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_can_close_report_and_support_request():
    admin = _admin()
    owner = User.objects.create_user(email="owner2@test.sn", password="MotDePasse123!")
    reporter = User.objects.create_user(email="reporter@test.sn", password="MotDePasse123!")
    campaign = _campaign(owner, Campaign.Status.PUBLIEE)
    report = CampaignReport.objects.create(
        campaign=campaign,
        reporter=reporter,
        reason=CampaignReport.Reason.AUTRE,
        details="Une vérification est nécessaire.",
    )
    support = SupportRequest.objects.create(
        name="Awa", email="awa@test.sn", subject="Aide", message="Merci de me répondre."
    )
    client = APIClient()
    client.force_authenticate(admin)

    report_response = client.patch(
        f"/api/backoffice/reports/{report.id}/",
        {"status": "RESOLU", "admin_note": "Vérification terminée."},
        format="json",
    )
    support_response = client.patch(
        f"/api/backoffice/support/{support.id}/",
        {"status": "RESOLUE", "admin_note": "Réponse envoyée."},
        format="json",
    )

    assert report_response.status_code == 200
    assert support_response.status_code == 200
    report.refresh_from_db()
    support.refresh_from_db()
    assert report.status == CampaignReport.Status.RESOLU
    assert support.status == SupportRequest.Status.RESOLUE


@pytest.mark.django_db
def test_admin_can_suspend_and_reactivate_campaign():
    admin = _admin()
    owner = User.objects.create_user(email="workflow@test.sn", password="MotDePasse123!")
    campaign = _campaign(owner, Campaign.Status.PUBLIEE)
    client = APIClient()
    client.force_authenticate(admin)

    suspended = client.post(
        f"/api/backoffice/campaigns/{campaign.id}/workflow/",
        {"action": "SUSPEND", "note": "Vérification complémentaire en cours."},
        format="json",
    )
    assert suspended.status_code == 200
    campaign.refresh_from_db()
    assert campaign.status == Campaign.Status.SUSPENDUE

    reactivated = client.post(
        f"/api/backoffice/campaigns/{campaign.id}/workflow/",
        {"action": "REACTIVATE", "note": ""},
        format="json",
    )
    assert reactivated.status_code == 200
    campaign.refresh_from_db()
    assert campaign.status == Campaign.Status.PUBLIEE


@pytest.mark.django_db
def test_admin_can_search_and_disable_user_but_not_self():
    admin = _admin()
    member = User.objects.create_user(
        email="searchable@test.sn", password="MotDePasse123!", first_name="Mariama"
    )
    client = APIClient()
    client.force_authenticate(admin)

    listed = client.get("/api/backoffice/users/?search=Mariama")
    assert listed.status_code == 200
    assert listed.data["count"] == 1

    disabled = client.patch(
        f"/api/backoffice/users/{member.id}/", {"is_active": False}, format="json"
    )
    assert disabled.status_code == 200
    member.refresh_from_db()
    assert not member.is_active

    self_disabled = client.patch(
        f"/api/backoffice/users/{admin.id}/", {"is_active": False}, format="json"
    )
    assert self_disabled.status_code == 400


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_admin_can_reply_to_support_from_dashboard():
    admin = _admin()
    support = SupportRequest.objects.create(
        name="Awa", email="reply@test.sn", subject="Question", message="Bonjour"
    )
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/support/{support.id}/reply/",
        {"subject": "Re: Question", "message": "Bonjour Awa, voici notre réponse."},
        format="json",
    )
    assert response.status_code == 200
    assert SupportReply.objects.filter(
        support_request=support, delivery_status=SupportReply.DeliveryStatus.SENT
    ).exists()


@pytest.mark.django_db
def test_export_ticket_produces_downloadable_csv():
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)
    ticket = client.post("/api/backoffice/exports/users/ticket/")
    assert ticket.status_code == 200

    exported = APIClient().get(ticket.data["url"])
    assert exported.status_code == 200
    assert exported["Content-Type"].startswith("text/csv")
