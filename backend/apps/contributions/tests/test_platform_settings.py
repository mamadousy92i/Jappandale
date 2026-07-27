import pytest
from decimal import Decimal

from apps.contributions.models import PlatformSettings


@pytest.mark.django_db
def test_get_solo_cree_un_enregistrement_par_defaut():
    settings_obj = PlatformSettings.get_solo()
    assert settings_obj.pk == 1
    assert settings_obj.commission_rate == Decimal("0.05")


@pytest.mark.django_db
def test_get_solo_reutilise_le_meme_enregistrement():
    first = PlatformSettings.get_solo()
    first.commission_rate = Decimal("0.10")
    first.save(update_fields=["commission_rate"])

    second = PlatformSettings.get_solo()

    assert second.pk == first.pk
    assert second.commission_rate == Decimal("0.10")


@pytest.mark.django_db
def test_un_seul_enregistrement_possible():
    PlatformSettings.get_solo()
    assert PlatformSettings.objects.count() == 1
    PlatformSettings.get_solo()
    assert PlatformSettings.objects.count() == 1


from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution

User = get_user_model()


@pytest.mark.django_db
def test_contribution_a_les_champs_de_reversement_par_defaut():
    owner = User.objects.create_user(
        email="owner-payout@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    contributor = User.objects.create_user(
        email="contrib-payout@test.sn", password="MotDePasse123!"
    )
    campaign = Campaign.objects.create(
        owner=owner,
        title="Test reversement",
        summary="Résumé.",
        description="Description.",
        category="ARTISANAT",
        goal_amount=100_000,
        deadline=timezone.localdate(),
        status=Campaign.Status.PUBLIEE,
    )
    contribution = Contribution.objects.create(
        contributor=contributor, campaign=campaign, amount=10_000
    )

    assert contribution.payout_status == Contribution.PayoutStatus.EN_SEQUESTRE
    assert contribution.commission_rate_applied is None
    assert contribution.commission_amount is None
    assert contribution.net_amount is None
    assert contribution.payout_released_at is None
    assert contribution.payout_released_by is None
