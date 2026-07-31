from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.guichet.models import FinancingScheme, SchemeReferral
from apps.guichet.services import (
    eligibility_reasons,
    eligible_schemes_for,
    transformation_stats,
)

User = get_user_model()


def make_porteur(email, **overrides):
    values = {
        "role": User.Role.PORTEUR,
        "kyc_status": User.KycStatus.VALIDE,
        "first_name": "Awa",
        "last_name": "Ndiaye",
        "email_verified_at": timezone.now(),
    }
    values.update(overrides)
    return User.objects.create_user(email=email, password="MotDePasse123!", **values)


def make_campaign(owner, **overrides):
    values = {
        "title": "Atelier de couture",
        "summary": "Développer un atelier de couture à Thiès.",
        "description": "Projet porté par une couturière expérimentée.",
        "category": Campaign.Category.ARTISANAT,
        "goal_amount": 500_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


def make_scheme(**overrides):
    values = {
        "name": "Fonds d'appui aux artisans",
        "provider_name": "ADEPME",
        "provider_type": FinancingScheme.ProviderType.FONDS_PUBLIC,
        "description": "Appui aux petites entreprises artisanales.",
        "status": FinancingScheme.Status.PUBLIE,
    }
    values.update(overrides)
    return FinancingScheme.objects.create(**values)


@pytest.mark.django_db
def test_porteur_eligible_sans_criteres_particuliers():
    porteur = make_porteur("porteur-g1@test.sn")
    scheme = make_scheme()
    assert eligibility_reasons(scheme, porteur) == []


@pytest.mark.django_db
def test_score_minimum_non_atteint_rend_inegible():
    porteur = make_porteur("porteur-g2@test.sn", kyc_status=User.KycStatus.NON_SOUMIS)
    scheme = make_scheme(min_score=95, requires_kyc_valide=False)
    reasons = eligibility_reasons(scheme, porteur)
    assert any("Score" in reason for reason in reasons)


@pytest.mark.django_db
def test_kyc_requis_mais_non_valide_rend_inegible():
    porteur = make_porteur("porteur-g3@test.sn", kyc_status=User.KycStatus.EN_ATTENTE)
    scheme = make_scheme(min_score=0, requires_kyc_valide=True)
    reasons = eligibility_reasons(scheme, porteur)
    assert any("identité" in reason.lower() for reason in reasons)


@pytest.mark.django_db
def test_dispositif_reserve_diaspora_exclut_les_non_diaspora():
    porteur = make_porteur("porteur-g4@test.sn", is_diaspora=False)
    scheme = make_scheme(
        min_score=0,
        requires_kyc_valide=False,
        diaspora_requirement=FinancingScheme.DiasporaRequirement.DIASPORA_UNIQUEMENT,
    )
    reasons = eligibility_reasons(scheme, porteur)
    assert any("diaspora" in reason.lower() for reason in reasons)


@pytest.mark.django_db
def test_dispositif_excluant_la_diaspora_rejette_un_porteur_diaspora():
    porteur = make_porteur("porteur-g5@test.sn", is_diaspora=True)
    scheme = make_scheme(
        min_score=0,
        requires_kyc_valide=False,
        diaspora_requirement=FinancingScheme.DiasporaRequirement.DIASPORA_EXCLUE,
    )
    reasons = eligibility_reasons(scheme, porteur)
    assert any("diaspora" in reason.lower() for reason in reasons)


@pytest.mark.django_db
def test_categorie_eligible_verifiee_sur_les_campagnes_du_porteur():
    porteur = make_porteur("porteur-g6@test.sn")
    make_campaign(porteur, category=Campaign.Category.TECHNOLOGIE)
    scheme = make_scheme(
        min_score=0, requires_kyc_valide=False, eligible_categories=[Campaign.Category.AGRICULTURE]
    )
    reasons = eligibility_reasons(scheme, porteur)
    assert any("catégories" in reason.lower() for reason in reasons)


@pytest.mark.django_db
def test_montant_objectif_hors_fourchette_rend_inegible():
    porteur = make_porteur("porteur-g7@test.sn")
    make_campaign(porteur, goal_amount=50_000)
    scheme = make_scheme(min_score=0, requires_kyc_valide=False, min_goal_amount=1_000_000)
    reasons = eligibility_reasons(scheme, porteur)
    assert any("montant" in reason.lower() for reason in reasons)


@pytest.mark.django_db
def test_eligible_schemes_for_ne_retourne_que_les_dispositifs_publies_et_matches():
    porteur = make_porteur("porteur-g8@test.sn")
    make_scheme(name="Publié éligible", min_score=0, requires_kyc_valide=False)
    make_scheme(
        name="Brouillon", status=FinancingScheme.Status.BROUILLON, min_score=0, requires_kyc_valide=False
    )
    make_scheme(name="Trop exigeant", min_score=99, requires_kyc_valide=False)

    results = eligible_schemes_for(porteur)

    assert [scheme.name for scheme in results] == ["Publié éligible"]


@pytest.mark.django_db
def test_taux_de_transformation_ignore_les_orientations_encore_ouvertes():
    porteur = make_porteur("porteur-g9@test.sn")
    scheme = make_scheme()
    SchemeReferral.objects.create(scheme=scheme, porteur=porteur, status=SchemeReferral.Status.INTERET)
    SchemeReferral.objects.create(scheme=scheme, porteur=porteur, status=SchemeReferral.Status.ACCEPTE)
    SchemeReferral.objects.create(scheme=scheme, porteur=porteur, status=SchemeReferral.Status.REFUSE)

    stats = transformation_stats(scheme)

    assert stats["total_referrals"] == 3
    assert stats["accepted"] == 1
    assert stats["transformation_rate"] == 0.5
