from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign, CampaignReport
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute
from apps.scoring.services import compute_score, refresh_score

User = get_user_model()


def make_porteur(email, kyc=User.KycStatus.VALIDE):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
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
        "goal_amount": 100_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


@pytest.mark.django_db
def test_score_borne_entre_0_et_100_meme_pour_porteur_sans_historique():
    porteur = make_porteur("porteur-s1@test.sn", kyc=User.KycStatus.NON_SOUMIS)
    value, breakdown = compute_score(porteur)
    assert 0 <= value <= 100
    assert isinstance(breakdown, dict)


@pytest.mark.django_db
def test_kyc_valide_augmente_le_score():
    valide = make_porteur("porteur-s2@test.sn", kyc=User.KycStatus.VALIDE)
    non_soumis = make_porteur("porteur-s3@test.sn", kyc=User.KycStatus.NON_SOUMIS)

    value_valide, _ = compute_score(valide)
    value_non_soumis, _ = compute_score(non_soumis)

    assert value_valide > value_non_soumis


@pytest.mark.django_db
def test_campagne_reussie_augmente_le_score():
    porteur = make_porteur("porteur-s4@test.sn")
    baseline, _ = compute_score(porteur)
    make_campaign(
        porteur,
        status=Campaign.Status.CLOTUREE,
        goal_amount=50_000,
        collected_amount=60_000,
    )

    with_success, _ = compute_score(porteur)

    assert with_success > baseline


@pytest.mark.django_db
def test_litige_accepte_diminue_le_score():
    porteur = make_porteur("porteur-s5@test.sn")
    contributor = make_porteur("contrib-s5@test.sn", kyc=User.KycStatus.VALIDE)
    campaign = make_campaign(porteur)
    contribution = Contribution.objects.create(
        contributor=contributor,
        campaign=campaign,
        amount=20_000,
        status=Contribution.Status.CONFIRMEE,
    )
    baseline, _ = compute_score(porteur)
    Dispute.objects.create(
        contribution=contribution,
        reporter=contributor,
        reason=Dispute.Reason.AUTRE,
        details="Détails.",
        status=Dispute.Status.ACCEPTE,
    )

    with_dispute, _ = compute_score(porteur)

    assert with_dispute < baseline


@pytest.mark.django_db
def test_score_reste_dans_les_bornes_avec_un_historique_tres_negatif():
    porteur = make_porteur("porteur-s6@test.sn")
    for _ in range(10):
        make_campaign(porteur, status=Campaign.Status.REJETEE, title=f"Projet rejeté {_}")
    contributor = make_porteur("contrib-s6@test.sn", kyc=User.KycStatus.VALIDE)
    campaign = make_campaign(porteur)
    for _ in range(5):
        contribution = Contribution.objects.create(
            contributor=contributor,
            campaign=campaign,
            amount=10_000,
            status=Contribution.Status.CONFIRMEE,
        )
        Dispute.objects.create(
            contribution=contribution,
            reporter=contributor,
            reason=Dispute.Reason.AUTRE,
            details="Détails.",
            status=Dispute.Status.ACCEPTE,
        )
    for i in range(5):
        reporter = make_porteur(f"reporter-s6-{i}@test.sn", kyc=User.KycStatus.VALIDE)
        CampaignReport.objects.create(
            campaign=campaign,
            reporter=reporter,
            reason=CampaignReport.Reason.FRAUDE,
            details="Détails.",
            status=CampaignReport.Status.RESOLU,
        )

    value, _ = compute_score(porteur)

    assert 0 <= value <= 100


@pytest.mark.django_db
def test_refresh_score_persiste_une_ligne():
    from apps.scoring.models import Score

    porteur = make_porteur("porteur-s7@test.sn")
    score = refresh_score(porteur)
    assert Score.objects.filter(porteur=porteur).count() == 1
    assert score.effective_value == score.value
