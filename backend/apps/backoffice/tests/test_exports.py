from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-export@test.sn", password="MotDePasse123!")


def _porteur(**overrides):
    values = {
        "role": User.Role.PORTEUR,
        "kyc_status": User.KycStatus.VALIDE,
        "email_verified_at": timezone.now(),
        "is_diaspora": True,
        "country": "France",
    }
    values.update(overrides)
    return User.objects.create_user(email="porteur-export@test.sn", password="MotDePasse123!", **values)


def _contributeur():
    return User.objects.create_user(
        email="contributeur-export@test.sn",
        password="MotDePasse123!",
        role=User.Role.CONTRIBUTEUR,
        email_verified_at=timezone.now(),
    )


def _campaign(owner):
    return Campaign.objects.create(
        owner=owner,
        title="Atelier de couture",
        summary="Développer un atelier de couture.",
        description="Projet porté par une couturière expérimentée.",
        category=Campaign.Category.ARTISANAT,
        goal_amount=500_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )


def _confirmed_contribution(campaign, contributor):
    return Contribution.objects.create(
        contributor=contributor,
        campaign=campaign,
        amount=10_000,
        status=Contribution.Status.CONFIRMEE,
        commission_rate_applied=0.05,
        commission_amount=500,
        net_amount=9_500,
        confirmed_at=timezone.now(),
    )


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_demander_de_ticket_export():
    contributeur = _contributeur()
    client = APIClient()
    client.force_authenticate(contributeur)

    response = client.post("/api/backoffice/exports/bceao/ticket/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_kind_inconnu_est_rejete():
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post("/api/backoffice/exports/inexistant/ticket/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_export_bceao_contient_les_transactions_confirmees_avec_statut_kyc():
    admin = _admin()
    porteur = _porteur()
    contributeur = _contributeur()
    campaign = _campaign(porteur)
    _confirmed_contribution(campaign, contributeur)
    client = APIClient()
    client.force_authenticate(admin)

    ticket = client.post("/api/backoffice/exports/bceao/ticket/")
    assert ticket.status_code == 200
    download = client.get(ticket.data["url"])

    assert download.status_code == 200
    assert download["Content-Type"].startswith("text/csv")
    body = download.content.decode("utf-8-sig")
    assert "Rapport réglementaire" not in body  # pas de titre parasite, juste des colonnes
    assert "Porteur — identité vérifiée (KYC)" in body
    assert porteur.email in body
    assert contributeur.email in body
    assert "Validé" in body
    assert "9500" in body


@pytest.mark.django_db
def test_export_bceao_exclut_les_contributions_non_confirmees():
    admin = _admin()
    porteur = _porteur()
    contributeur = _contributeur()
    campaign = _campaign(porteur)
    Contribution.objects.create(
        contributor=contributeur,
        campaign=campaign,
        amount=5_000,
        status=Contribution.Status.INITIEE,
    )
    client = APIClient()
    client.force_authenticate(admin)

    ticket = client.post("/api/backoffice/exports/bceao/ticket/")
    download = client.get(ticket.data["url"])

    body = download.content.decode("utf-8-sig")
    assert contributeur.email not in body


@pytest.mark.django_db
def test_lien_de_telechargement_expire(monkeypatch):
    from django.core import signing

    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)
    expired_token = signing.dumps(
        {"kind": "bceao", "admin_id": admin.id}, salt="jappandale-export"
    )

    class ExpiredSigner:
        def loads(self, *args, **kwargs):
            raise signing.SignatureExpired("expiré")

    monkeypatch.setattr("apps.backoffice.views.signing.loads", ExpiredSigner().loads)
    response = client.get(f"/api/backoffice/exports/download/{expired_token}/")

    assert response.status_code == 404
