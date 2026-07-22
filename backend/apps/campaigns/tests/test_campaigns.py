from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign, CampaignReport

User = get_user_model()


def _porteur_valide(email="porteur@test.sn"):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        first_name="Awa",
        last_name="Diop",
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
    "deadline": (timezone.localdate() + timedelta(days=30)).isoformat(),
}


def _creer_campagne(owner, **overrides):
    data = {**DONNEES_CAMPAGNE, **overrides}
    data.pop("deadline", None)
    return Campaign.objects.create(
        owner=owner, deadline=timezone.localdate() + timedelta(days=30), **data
    )


@pytest.mark.django_db
def test_porteur_valide_peut_creer_campagne():
    client = APIClient()
    client.force_authenticate(_porteur_valide())
    response = client.post("/api/campaigns/", DONNEES_CAMPAGNE, format="multipart")
    assert response.status_code == 201
    assert response.data["slug"]
    campaign = Campaign.objects.get(slug=response.data["slug"])
    assert campaign.status == Campaign.Status.BROUILLON


@pytest.mark.django_db
def test_contributeur_ne_peut_pas_creer_campagne():
    user = User.objects.create_user(
        email="contrib@test.sn", password="MotDePasse123!", role=User.Role.CONTRIBUTEUR
    )
    client = APIClient()
    client.force_authenticate(user)
    response = client.post("/api/campaigns/", DONNEES_CAMPAGNE, format="multipart")
    assert response.status_code == 403


@pytest.mark.django_db
def test_porteur_non_valide_kyc_ne_peut_pas_creer():
    user = User.objects.create_user(
        email="porteur2@test.sn",
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.EN_ATTENTE,
    )
    client = APIClient()
    client.force_authenticate(user)
    response = client.post("/api/campaigns/", DONNEES_CAMPAGNE, format="multipart")
    assert response.status_code == 403


@pytest.mark.django_db
def test_liste_publique_ne_montre_que_les_publiees():
    porteur = _porteur_valide()
    _creer_campagne(porteur, title="Brouillon", status=Campaign.Status.BROUILLON)
    _creer_campagne(porteur, title="Publiée", status=Campaign.Status.PUBLIEE)
    response = APIClient().get("/api/campaigns/")
    assert response.status_code == 200
    titres = [c["title"] for c in response.data]
    assert "Publiée" in titres
    assert "Brouillon" not in titres


@pytest.mark.django_db
def test_detail_campagne_publiee_accessible_au_public():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    response = APIClient().get(f"/api/campaigns/{campagne.slug}/")
    assert response.status_code == 200
    assert response.data["title"] == campagne.title
    assert response.data["owner"]["first_name"] == "Awa"
    assert response.data["progress_percent"] == 0


@pytest.mark.django_db
def test_soumission_passe_en_moderation():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.BROUILLON)
    client = APIClient()
    client.force_authenticate(porteur)
    response = client.post(f"/api/campaigns/{campagne.slug}/submit/")
    assert response.status_code == 200
    campagne.refresh_from_db()
    assert campagne.status == Campaign.Status.EN_MODERATION


@pytest.mark.django_db
def test_mine_liste_les_campagnes_du_porteur():
    porteur = _porteur_valide()
    autre = _porteur_valide(email="autre@test.sn")
    _creer_campagne(porteur, title="À moi", status=Campaign.Status.BROUILLON)
    _creer_campagne(autre, title="À un autre", status=Campaign.Status.PUBLIEE)
    client = APIClient()
    client.force_authenticate(porteur)
    response = client.get("/api/campaigns/mine/")
    assert response.status_code == 200
    titres = [c["title"] for c in response.data]
    assert titres == ["À moi"]


@pytest.mark.django_db
def test_objectif_minimum_valide():
    client = APIClient()
    client.force_authenticate(_porteur_valide())
    response = client.post(
        "/api/campaigns/", {**DONNEES_CAMPAGNE, "goal_amount": 500}, format="multipart"
    )
    assert response.status_code == 400
    assert "goal_amount" in response.data


@pytest.mark.django_db
def test_progress_percent_calcule():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    campagne.collected_amount = 250000
    campagne.save(update_fields=["collected_amount"])
    assert campagne.progress_percent == 50


@pytest.mark.django_db
def test_echeance_passee_refusee():
    client = APIClient()
    client.force_authenticate(_porteur_valide())
    response = client.post(
        "/api/campaigns/",
        {
            **DONNEES_CAMPAGNE,
            "deadline": (timezone.localdate() - timedelta(days=1)).isoformat(),
        },
        format="multipart",
    )
    assert response.status_code == 400
    assert "deadline" in response.data


@pytest.mark.django_db
def test_campagne_expiree_est_cloturee_a_la_consultation():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    campagne.deadline = timezone.localdate() - timedelta(days=1)
    campagne.save(update_fields=["deadline"])

    response = APIClient().get("/api/campaigns/")

    assert response.status_code == 200
    campagne.refresh_from_db()
    assert campagne.status == Campaign.Status.CLOTUREE


@pytest.mark.django_db
def test_campagne_publiee_ne_peut_pas_etre_supprimee():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.delete(f"/api/campaigns/{campagne.slug}/")

    assert response.status_code == 400
    assert Campaign.objects.filter(pk=campagne.pk).exists()


@pytest.mark.django_db
def test_membre_peut_signaler_une_campagne_publiee():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    reporter = User.objects.create_user(
        email="signalement@test.sn", password="MotDePasse123!"
    )
    client = APIClient()
    client.force_authenticate(reporter)

    response = client.post(
        f"/api/campaigns/{campagne.slug}/report/",
        {"reason": "INFORMATION_TROMPEUSE", "details": "Le budget mérite une vérification."},
        format="json",
    )

    assert response.status_code == 201
    assert CampaignReport.objects.filter(campaign=campagne, reporter=reporter).exists()


@pytest.mark.django_db
def test_un_membre_ne_peut_pas_signaler_deux_fois_la_meme_campagne():
    porteur = _porteur_valide()
    campagne = _creer_campagne(porteur, status=Campaign.Status.PUBLIEE)
    reporter = User.objects.create_user(email="doublon@test.sn", password="MotDePasse123!")
    CampaignReport.objects.create(
        campaign=campagne, reporter=reporter, reason=CampaignReport.Reason.AUTRE, details="Premier signalement"
    )
    client = APIClient()
    client.force_authenticate(reporter)

    response = client.post(
        f"/api/campaigns/{campagne.slug}/report/",
        {"reason": "FRAUDE", "details": "Deuxième signalement"},
        format="json",
    )

    assert response.status_code == 400
    assert CampaignReport.objects.filter(campaign=campagne, reporter=reporter).count() == 1
