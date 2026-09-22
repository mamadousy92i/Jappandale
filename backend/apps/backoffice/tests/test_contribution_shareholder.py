from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-actionnaire@test.sn", password="MotDePasse123!")


def _porteur():
    return User.objects.create_user(
        email="porteur-actionnaire@test.sn",
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        email_verified_at=timezone.now(),
    )


def _contributeur():
    return User.objects.create_user(
        email="contrib-actionnaire@test.sn",
        password="MotDePasse123!",
        role=User.Role.CONTRIBUTEUR,
        kyc_status=User.KycStatus.VALIDE,
        email_verified_at=timezone.now(),
    )


def _campagne_investissement(owner):
    return Campaign.objects.create(
        owner=owner,
        title="Moderniser une unité",
        summary="Doubler la capacité.",
        description="Description détaillée du projet.",
        category=Campaign.Category.AGRICULTURE,
        campaign_type=Campaign.CampaignType.INVESTISSEMENT_PARTICIPATIF,
        expected_return_rate=8,
        goal_amount=1_000_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )


def _contribution_en_attente(campagne, contributeur):
    return Contribution.objects.create(
        contributor=contributeur,
        campaign=campagne,
        amount=20_000,
        wants_to_be_shareholder=True,
        shareholder_status=Contribution.ShareholderStatus.EN_ATTENTE,
    )


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_valider_lactionnariat():
    campagne = _campagne_investissement(_porteur())
    contribution = _contribution_en_attente(campagne, _contributeur())
    client = APIClient()
    client.force_authenticate(contribution.contributor)

    response = client.post(
        f"/api/backoffice/contributions/{contribution.id}/actionnariat/",
        {"decision": "VALIDE"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_valide_lactionnariat():
    admin = _admin()
    campagne = _campagne_investissement(_porteur())
    contribution = _contribution_en_attente(campagne, _contributeur())
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/contributions/{contribution.id}/actionnariat/",
        {"decision": "VALIDE"},
        format="json",
    )

    assert response.status_code == 200
    contribution.refresh_from_db()
    assert contribution.shareholder_status == Contribution.ShareholderStatus.VALIDE
    assert contribution.shareholder_reviewed_by == admin
    assert contribution.shareholder_reviewed_at is not None


@pytest.mark.django_db
def test_rejet_de_lactionnariat_exige_un_motif():
    admin = _admin()
    campagne = _campagne_investissement(_porteur())
    contribution = _contribution_en_attente(campagne, _contributeur())
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/contributions/{contribution.id}/actionnariat/",
        {"decision": "REJETE"},
        format="json",
    )

    assert response.status_code == 400
    contribution.refresh_from_db()
    assert contribution.shareholder_status == Contribution.ShareholderStatus.EN_ATTENTE


@pytest.mark.django_db
def test_admin_rejette_lactionnariat_avec_motif():
    admin = _admin()
    campagne = _campagne_investissement(_porteur())
    contribution = _contribution_en_attente(campagne, _contributeur())
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/contributions/{contribution.id}/actionnariat/",
        {"decision": "REJETE", "note": "Profil investisseur non éligible."},
        format="json",
    )

    assert response.status_code == 200
    contribution.refresh_from_db()
    assert contribution.shareholder_status == Contribution.ShareholderStatus.REJETE
    assert contribution.shareholder_note == "Profil investisseur non éligible."


@pytest.mark.django_db
def test_decision_impossible_si_aucune_demande_en_cours():
    admin = _admin()
    campagne = _campagne_investissement(_porteur())
    contribution = _contribution_en_attente(campagne, _contributeur())
    contribution.shareholder_status = Contribution.ShareholderStatus.NON_DEMANDE
    contribution.save(update_fields=["shareholder_status"])
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/contributions/{contribution.id}/actionnariat/",
        {"decision": "VALIDE"},
        format="json",
    )

    assert response.status_code == 404
