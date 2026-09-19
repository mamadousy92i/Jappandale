from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign, CampaignAuditLog

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-frais@test.sn", password="MotDePasse123!")


def _porteur():
    return User.objects.create_user(
        email="porteur-frais@test.sn",
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        email_verified_at=timezone.now(),
    )


def _campagne_en_attente_de_frais(owner):
    return Campaign.objects.create(
        owner=owner,
        title="Cantine solidaire",
        summary="Financer une cantine scolaire.",
        description="Description détaillée du projet.",
        category=Campaign.Category.EDUCATION,
        goal_amount=500_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.BROUILLON,
        dossier_fee_status=Campaign.DossierFeeStatus.EN_ATTENTE,
    )


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_valider_les_frais():
    campagne = _campagne_en_attente_de_frais(_porteur())
    client = APIClient()
    client.force_authenticate(campagne.owner)

    response = client.post(
        f"/api/backoffice/campaigns/{campagne.id}/frais/", {"decision": "VALIDE"}, format="json"
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_valide_les_frais_de_dossier():
    admin = _admin()
    campagne = _campagne_en_attente_de_frais(_porteur())
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/campaigns/{campagne.id}/frais/", {"decision": "VALIDE"}, format="json"
    )

    assert response.status_code == 200
    campagne.refresh_from_db()
    assert campagne.dossier_fee_status == Campaign.DossierFeeStatus.VALIDE
    assert campagne.dossier_fee_reviewed_by == admin
    assert campagne.dossier_fee_reviewed_at is not None
    assert CampaignAuditLog.objects.filter(
        campaign=campagne, action=CampaignAuditLog.Action.FEE_VALIDATED
    ).exists()


@pytest.mark.django_db
def test_rejet_des_frais_exige_un_motif():
    admin = _admin()
    campagne = _campagne_en_attente_de_frais(_porteur())
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/campaigns/{campagne.id}/frais/", {"decision": "REJETE"}, format="json"
    )

    assert response.status_code == 400
    campagne.refresh_from_db()
    assert campagne.dossier_fee_status == Campaign.DossierFeeStatus.EN_ATTENTE


@pytest.mark.django_db
def test_admin_rejette_les_frais_avec_motif():
    admin = _admin()
    campagne = _campagne_en_attente_de_frais(_porteur())
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/campaigns/{campagne.id}/frais/",
        {"decision": "REJETE", "note": "Référence de paiement introuvable."},
        format="json",
    )

    assert response.status_code == 200
    campagne.refresh_from_db()
    assert campagne.dossier_fee_status == Campaign.DossierFeeStatus.REJETE
    assert campagne.dossier_fee_note == "Référence de paiement introuvable."
    assert CampaignAuditLog.objects.filter(
        campaign=campagne, action=CampaignAuditLog.Action.FEE_REJECTED
    ).exists()


@pytest.mark.django_db
def test_decision_impossible_si_aucune_demande_en_cours():
    admin = _admin()
    porteur = _porteur()
    campagne = _campagne_en_attente_de_frais(porteur)
    campagne.dossier_fee_status = Campaign.DossierFeeStatus.NON_DEMANDE
    campagne.save(update_fields=["dossier_fee_status"])
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        f"/api/backoffice/campaigns/{campagne.id}/frais/", {"decision": "VALIDE"}, format="json"
    )

    assert response.status_code == 404
