import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.scoring.models import Score, ScoringSettings

User = get_user_model()


@pytest.mark.django_db
def test_scoring_settings_get_solo_cree_un_enregistrement_par_defaut():
    settings_obj = ScoringSettings.get_solo()
    assert settings_obj.pk == 1
    assert settings_obj.poids_kyc == 15
    assert settings_obj.score_base == 50


@pytest.mark.django_db
def test_scoring_settings_get_solo_reutilise_le_meme_enregistrement():
    first = ScoringSettings.get_solo()
    second = ScoringSettings.get_solo()
    assert first.pk == second.pk
    assert ScoringSettings.objects.count() == 1


@pytest.mark.django_db
def test_score_effective_value_sans_override():
    porteur = User.objects.create_user(
        email="porteur-score1@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    score = Score.objects.create(porteur=porteur, value=62, breakdown={})
    assert score.effective_value == 62


@pytest.mark.django_db
def test_score_effective_value_avec_override():
    porteur = User.objects.create_user(
        email="porteur-score2@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    admin = User.objects.create_superuser(email="admin-score2@test.sn", password="MotDePasse123!")
    score = Score.objects.create(
        porteur=porteur,
        value=40,
        breakdown={},
        is_manual_override=True,
        override_value=75,
        override_note="Bonne exécution constatée manuellement.",
        override_by=admin,
    )
    assert score.effective_value == 75
