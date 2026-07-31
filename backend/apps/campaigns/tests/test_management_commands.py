from datetime import timedelta
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from apps.campaigns.models import Campaign, CampaignAuditLog

User = get_user_model()


def _porteur_valide(email="porteur@test.sn"):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        first_name="Awa",
        last_name="Diop",
        email_verified_at=timezone.now(),
    )


DONNEES_CAMPAGNE = {
    "title": "Atelier de couture solidaire",
    "summary": "Équiper un atelier de couture pour former des jeunes.",
    "description": "Description détaillée du projet de couture solidaire à Dakar.",
    "location": "Médina, Dakar",
    "beneficiaries": "10 apprenties couturières",
    "funding_plan": "Machines — 400 000 F CFA",
    "project_timeline": "Installation — semaine 1",
    "category": "ARTISANAT",
    "goal_amount": 500000,
}


@pytest.mark.django_db
def test_commande_cloture_les_campagnes_echues_en_collecte_flexible():
    porteur = _porteur_valide()
    campagne = Campaign.objects.create(
        owner=porteur,
        status=Campaign.Status.PUBLIEE,
        collected_amount=100000,  # objectif non atteint
        deadline=timezone.localdate() - timedelta(days=1),
        **DONNEES_CAMPAGNE,
    )

    sortie = StringIO()
    call_command("cloturer_campagnes", stdout=sortie)

    campagne.refresh_from_db()
    assert campagne.status == Campaign.Status.CLOTUREE
    assert "1 campagne" in sortie.getvalue()

    log = CampaignAuditLog.objects.get(campaign=campagne)
    assert log.action == CampaignAuditLog.Action.CLOSED
    assert log.actor is None


@pytest.mark.django_db
def test_commande_ne_touche_pas_aux_campagnes_encore_en_cours():
    porteur = _porteur_valide()
    campagne = Campaign.objects.create(
        owner=porteur,
        status=Campaign.Status.PUBLIEE,
        collected_amount=0,
        deadline=timezone.localdate() + timedelta(days=10),
        **DONNEES_CAMPAGNE,
    )

    sortie = StringIO()
    call_command("cloturer_campagnes", stdout=sortie)

    campagne.refresh_from_db()
    assert campagne.status == Campaign.Status.PUBLIEE
    assert "Aucune campagne" in sortie.getvalue()
