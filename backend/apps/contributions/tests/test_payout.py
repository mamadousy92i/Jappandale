from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution, PlatformSettings

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


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_confirmation_calcule_la_commission_et_le_montant_net():
    PlatformSettings.get_solo()  # taux par défaut 5 %
    owner = make_user("owner-p1@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p1@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )

    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    contribution = Contribution.objects.get(public_reference=created.data["public_reference"])
    assert contribution.commission_rate_applied == Decimal("0.05")
    assert contribution.commission_amount == 1_000
    assert contribution.net_amount == 19_000
    assert contribution.payout_status == Contribution.PayoutStatus.EN_SEQUESTRE


@pytest.mark.django_db
def test_taux_fige_ne_change_pas_retroactivement():
    settings_obj = PlatformSettings.get_solo()
    owner = make_user("owner-p2@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p2@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    settings_obj.commission_rate = Decimal("0.20")
    settings_obj.save(update_fields=["commission_rate"])

    contribution = Contribution.objects.get(public_reference=created.data["public_reference"])
    assert contribution.commission_rate_applied == Decimal("0.05")
    assert contribution.commission_amount == 1_000


@pytest.mark.django_db
def test_montant_public_collecte_reste_brut():
    owner = make_user("owner-p3@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p3@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    campaign.refresh_from_db()
    assert campaign.collected_amount == 20_000


from apps.contributions.services import (
    process_simulated_payment,
    refund_contribution,
    release_campaign_payout,
)
from apps.notifications.models import Notification


def _confirmer_contribution(client, campaign, amount=20_000):
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": amount},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    return Contribution.objects.get(public_reference=created.data["public_reference"])


@pytest.mark.django_db
def test_reversement_refuse_si_campagne_pas_cloturee():
    owner = make_user("owner-p4@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p4@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)

    with pytest.raises(ValueError):
        release_campaign_payout(campaign=campaign, actor=admin)


@pytest.mark.django_db
def test_reversement_marque_toutes_les_contributions_de_la_campagne():
    owner = make_user("owner-p5@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p5@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    contributor1 = make_user("c1-p5@test.sn")
    contributor2 = make_user("c2-p5@test.sn")
    contribution1 = _confirmer_contribution(authenticated_client(contributor1), campaign, 10_000)
    contribution2 = _confirmer_contribution(authenticated_client(contributor2), campaign, 30_000)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])

    log = release_campaign_payout(campaign=campaign, actor=admin)

    contribution1.refresh_from_db()
    contribution2.refresh_from_db()
    assert contribution1.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution2.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution1.payout_released_by_id == admin.id
    assert contribution1.payout_released_at is not None
    assert log.contributions_count == 2
    assert log.gross_amount == 40_000
    assert log.net_amount == contribution1.net_amount + contribution2.net_amount
    assert Notification.objects.filter(
        recipient=owner, kind=Notification.Kind.PAYOUT_RELEASED
    ).exists()


@pytest.mark.django_db
def test_reversement_ne_touche_pas_une_autre_campagne():
    owner1 = make_user("owner-p6a@test.sn", User.Role.PORTEUR)
    owner2 = make_user("owner-p6b@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p6@test.sn", User.Role.ADMIN)
    campaign1 = make_campaign(owner1, title="Campagne 1", status=Campaign.Status.PUBLIEE)
    campaign2 = make_campaign(owner2, title="Campagne 2", status=Campaign.Status.PUBLIEE)
    contribution1 = _confirmer_contribution(authenticated_client(make_user("c1-p6@test.sn")), campaign1)
    contribution2 = _confirmer_contribution(authenticated_client(make_user("c2-p6@test.sn")), campaign2)
    campaign1.status = Campaign.Status.CLOTUREE
    campaign1.save(update_fields=["status"])
    campaign2.status = Campaign.Status.CLOTUREE
    campaign2.save(update_fields=["status"])

    release_campaign_payout(campaign=campaign1, actor=admin)

    contribution1.refresh_from_db()
    contribution2.refresh_from_db()
    assert contribution1.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution2.payout_status == Contribution.PayoutStatus.EN_SEQUESTRE


@pytest.mark.django_db
def test_reversement_idempotent_sur_contributions_deja_reversees():
    owner = make_user("owner-p7@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p7@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    _confirmer_contribution(authenticated_client(make_user("c1-p7@test.sn")), campaign)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    release_campaign_payout(campaign=campaign, actor=admin)

    with pytest.raises(ValueError):
        release_campaign_payout(campaign=campaign, actor=admin)


@pytest.mark.django_db
def test_remboursement_refuse_si_deja_reversee():
    owner = make_user("owner-p8@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p8@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    contribution = _confirmer_contribution(authenticated_client(make_user("c1-p8@test.sn")), campaign)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    release_campaign_payout(campaign=campaign, actor=admin)
    contribution.refresh_from_db()

    assert refund_contribution(contribution) is False

    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.CONFIRMEE


from apps.disputes.models import Dispute


@pytest.mark.django_db
def test_reversement_refuse_si_litige_ouvert_sur_une_contribution():
    owner = make_user("owner-p9@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p9@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    contributor = make_user("c1-p9@test.sn")
    contribution = _confirmer_contribution(authenticated_client(contributor), campaign)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    Dispute.objects.create(
        contribution=contribution, reporter=contributor, reason=Dispute.Reason.AUTRE, details="Détails."
    )

    with pytest.raises(ValueError):
        release_campaign_payout(campaign=campaign, actor=admin)


@pytest.mark.django_db
def test_reversement_autorise_si_litige_rejete():
    owner = make_user("owner-p10@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p10@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    contributor = make_user("c1-p10@test.sn")
    contribution = _confirmer_contribution(authenticated_client(contributor), campaign)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    Dispute.objects.create(
        contribution=contribution,
        reporter=contributor,
        reason=Dispute.Reason.AUTRE,
        details="Détails.",
        status=Dispute.Status.REJETE,
    )

    log = release_campaign_payout(campaign=campaign, actor=admin)

    assert log.contributions_count == 1
