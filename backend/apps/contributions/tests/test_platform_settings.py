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
