from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.guichet.models import FinancingScheme
from apps.partners.models import PartnerProjectInterest, ProjectDocument

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR, **overrides):
    values = {
        "role": role,
        "first_name": "Awa",
        "last_name": "Diop",
        "email_verified_at": timezone.now(),
        "kyc_status": User.KycStatus.VALIDE,
    }
    values.update(overrides)
    return User.objects.create_user(email=email, password="MotDePasse123!", **values)


def make_campaign(owner, **overrides):
    values = {
        "title": "Atelier textile solidaire",
        "summary": "Un atelier pour accompagner des femmes entrepreneures.",
        "description": "Description complète du projet.",
        "location": "Dakar",
        "beneficiaries": "20 bénéficiaires",
        "funding_plan": "Machines — 500 000 F CFA",
        "project_timeline": "Installation — semaine 1",
        "category": Campaign.Category.ARTISANAT,
        "goal_amount": 500_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


@pytest.mark.django_db
def test_partner_verified_sees_published_projects_and_can_express_interest():
    partner = make_user(
        "banque@test.sn",
        role=User.Role.PARTENAIRE,
        partner_type=User.PartnerType.BANQUE,
        organization_name="Banque Jappandale",
    )
    owner = make_user("porteur@test.sn", role=User.Role.PORTEUR)
    campaign = make_campaign(owner)
    make_campaign(owner, title="Brouillon interne", status=Campaign.Status.BROUILLON)
    client = APIClient()
    client.force_authenticate(partner)

    dashboard = client.get("/api/partenaires/tableau-de-bord/")

    assert dashboard.status_code == 200
    assert [item["title"] for item in dashboard.data["campaigns"]] == [campaign.title]

    interest = client.post("/api/partenaires/interets/", {"campaign_slug": campaign.slug}, format="json")

    assert interest.status_code == 201
    assert PartnerProjectInterest.objects.filter(partner=partner, campaign=campaign).exists()


@pytest.mark.django_db
def test_non_partner_cannot_access_partner_dashboard():
    client = APIClient()
    client.force_authenticate(make_user("contributeur@test.sn"))

    response = client.get("/api/partenaires/tableau-de-bord/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_owner_can_share_project_document_with_validated_partner():
    owner = make_user("porteur-doc@test.sn", role=User.Role.PORTEUR)
    campaign = make_campaign(owner)
    partner = make_user("partenaire-doc@test.sn", role=User.Role.PARTENAIRE)
    owner_client = APIClient()
    owner_client.force_authenticate(owner)

    upload = owner_client.post(
        "/api/partenaires/documents/",
        {
            "campaign_slug": campaign.slug,
            "title": "Business plan",
            "document_type": "BUSINESS_PLAN",
            "shared_with_partners": "true",
            "file": SimpleUploadedFile("business-plan.pdf", b"%PDF-1.4 test", content_type="application/pdf"),
        },
        format="multipart",
    )

    assert upload.status_code == 201
    document = ProjectDocument.objects.get()

    partner_client = APIClient()
    partner_client.force_authenticate(partner)
    listing = partner_client.get(f"/api/partenaires/documents/?campaign={campaign.slug}")
    download = partner_client.get(f"/api/partenaires/documents/{document.id}/fichier/")

    assert listing.status_code == 200
    assert [item["title"] for item in listing.data] == ["Business plan"]
    assert download.status_code == 200


@pytest.mark.django_db
def test_private_project_document_is_not_visible_to_partner():
    owner = make_user("porteur-private@test.sn", role=User.Role.PORTEUR)
    campaign = make_campaign(owner)
    partner = make_user("partner-private@test.sn", role=User.Role.PARTENAIRE)
    document = ProjectDocument.objects.create(
        campaign=campaign,
        uploaded_by=owner,
        title="Budget interne",
        document_type=ProjectDocument.DocumentType.BUDGET,
        shared_with_partners=False,
        file=SimpleUploadedFile("budget.pdf", b"%PDF-1.4 test", content_type="application/pdf"),
    )
    client = APIClient()
    client.force_authenticate(partner)

    listing = client.get(f"/api/partenaires/documents/?campaign={campaign.slug}")
    download = client.get(f"/api/partenaires/documents/{document.id}/fichier/")

    assert listing.status_code == 200
    assert listing.data == []
    assert download.status_code == 403


@pytest.mark.django_db
def test_partner_offer_is_created_as_draft_even_if_published_is_requested():
    partner = make_user("fonds@test.sn", role=User.Role.PARTENAIRE)
    client = APIClient()
    client.force_authenticate(partner)

    response = client.post(
        "/api/partenaires/offres/",
        {
            "name": "Fonds croissance",
            "provider_name": "Fonds Jappandale",
            "provider_type": "BAILLEUR",
            "description": "Une offre destinée aux petites entreprises.",
            "status": "PUBLIE",
            "requires_kyc_valide": True,
            "diaspora_requirement": "INDIFFERENT",
            "eligible_categories": [],
            "eligible_regions": [],
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["status"] == "BROUILLON"
    assert FinancingScheme.objects.get().created_by_id == partner.id
