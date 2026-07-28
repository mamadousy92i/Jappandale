import pytest
from django.contrib.auth import get_user_model

from apps.financial_passport.models import PassportExport

User = get_user_model()


@pytest.mark.django_db
def test_creation_dun_export_genere_un_identifiant_unique():
    porteur = User.objects.create_user(
        email="porteur-pass1@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )

    export1 = PassportExport.objects.create(porteur=porteur, snapshot={"score": 60})
    export2 = PassportExport.objects.create(porteur=porteur, snapshot={"score": 65})

    assert export1.verification_id != export2.verification_id
    assert porteur.passport_exports.count() == 2
