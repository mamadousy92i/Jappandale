from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute
from apps.notifications.models import Notification

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR, kyc=User.KycStatus.VALIDE):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=kyc,
        first_name="Awa",
        last_name="Ndiaye",
        email_verified_at=timezone.now(),
    )


def make_campaign(owner, **overrides):
    values = {
        "title": "Cantine scolaire de quartier",
        "summary": "Financer du matériel pour la cantine scolaire.",
        "description": "Un projet concret porté par les habitants du quartier.",
        "category": Campaign.Category.EDUCATION,
        "goal_amount": 500_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


def make_confirmed_contribution(contributor, campaign, **overrides):
    values = {"amount": 20_000, "status": Contribution.Status.CONFIRMEE}
    values.update(overrides)
    return Contribution.objects.create(contributor=contributor, campaign=campaign, **values)


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_financeur_peut_ouvrir_un_litige_sur_sa_contribution_confirmee():
    owner = make_user("owner-l1@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-l1@test.sn", User.Role.ADMIN)
    admin.is_staff = True
    admin.is_active = True
    admin.save(update_fields=["is_staff", "is_active"])
    contributor = make_user("contrib-l1@test.sn")
    campaign = make_campaign(owner)
    contribution = make_confirmed_contribution(contributor, campaign)

    response = authenticated_client(contributor).post(
        "/api/litiges/",
        {
            "contribution_reference": str(contribution.public_reference),
            "reason": "PORTEUR_INJOIGNABLE",
            "details": "Aucune réponse depuis deux semaines.",
        },
        format="json",
    )

    assert response.status_code == 201
    assert Dispute.objects.filter(contribution=contribution, reporter=contributor).exists()
    assert Notification.objects.filter(
        recipient=admin, kind=Notification.Kind.ADMIN_ACTION_REQUIRED
    ).exists()


@pytest.mark.django_db
def test_impossible_douvrir_un_litige_sur_une_contribution_non_confirmee():
    owner = make_user("owner-l2@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-l2@test.sn")
    campaign = make_campaign(owner)
    contribution = make_confirmed_contribution(
        contributor, campaign, status=Contribution.Status.INITIEE
    )

    response = authenticated_client(contributor).post(
        "/api/litiges/",
        {
            "contribution_reference": str(contribution.public_reference),
            "reason": "AUTRE",
            "details": "Détails.",
        },
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_impossible_douvrir_un_litige_sur_la_contribution_dun_autre():
    owner = make_user("owner-l3@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-l3@test.sn")
    tiers = make_user("tiers-l3@test.sn")
    campaign = make_campaign(owner)
    contribution = make_confirmed_contribution(contributor, campaign)

    response = authenticated_client(tiers).post(
        "/api/litiges/",
        {
            "contribution_reference": str(contribution.public_reference),
            "reason": "AUTRE",
            "details": "Détails.",
        },
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_impossible_douvrir_un_second_litige_actif():
    owner = make_user("owner-l4@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-l4@test.sn")
    campaign = make_campaign(owner)
    contribution = make_confirmed_contribution(contributor, campaign)
    client = authenticated_client(contributor)
    client.post(
        "/api/litiges/",
        {
            "contribution_reference": str(contribution.public_reference),
            "reason": "AUTRE",
            "details": "Premier litige.",
        },
        format="json",
    )

    response = client.post(
        "/api/litiges/",
        {
            "contribution_reference": str(contribution.public_reference),
            "reason": "AUTRE",
            "details": "Second litige.",
        },
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_liste_des_litiges_du_financeur():
    owner = make_user("owner-l5@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-l5@test.sn")
    campaign = make_campaign(owner)
    contribution = make_confirmed_contribution(contributor, campaign)
    client = authenticated_client(contributor)
    client.post(
        "/api/litiges/",
        {
            "contribution_reference": str(contribution.public_reference),
            "reason": "AUTRE",
            "details": "Détails.",
        },
        format="json",
    )

    response = client.get("/api/litiges/")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["contribution_reference"] == str(contribution.public_reference)
    assert response.data[0]["status"] == "OUVERT"
