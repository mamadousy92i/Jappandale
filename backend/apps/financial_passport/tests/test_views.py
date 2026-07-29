import uuid

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.financial_passport.models import PassportExport

User = get_user_model()


def make_porteur(email):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=User.Role.PORTEUR,
        kyc_status=User.KycStatus.VALIDE,
        first_name="Awa",
        last_name="Ndiaye",
        city="Dakar",
        email_verified_at=timezone.now(),
    )


@pytest.mark.django_db
def test_porteur_peut_consulter_son_passeport():
    porteur = make_porteur("porteur-pp1@test.sn")
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.get("/api/passeport/mine/")

    assert response.status_code == 200
    assert response.data["porteur_city"] == "Dakar"


@pytest.mark.django_db
def test_contributeur_ne_peut_pas_consulter_de_passeport():
    contributor = User.objects.create_user(email="contrib-pp1@test.sn", password="MotDePasse123!")
    client = APIClient()
    client.force_authenticate(contributor)

    response = client.get("/api/passeport/mine/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_export_cree_un_passeport_et_renvoie_un_pdf():
    porteur = make_porteur("porteur-pp2@test.sn")
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post("/api/passeport/mine/export/")

    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert len(response.content) > 0
    assert PassportExport.objects.filter(porteur=porteur).count() == 1


@pytest.mark.django_db
def test_chaque_export_a_un_identifiant_different():
    porteur = make_porteur("porteur-pp3@test.sn")
    client = APIClient()
    client.force_authenticate(porteur)

    client.post("/api/passeport/mine/export/")
    client.post("/api/passeport/mine/export/")

    ids = list(PassportExport.objects.filter(porteur=porteur).values_list("verification_id", flat=True))
    assert len(ids) == 2
    assert ids[0] != ids[1]


@pytest.mark.django_db
def test_verification_publique_dun_identifiant_existant():
    porteur = make_porteur("porteur-pp4@test.sn")
    client = APIClient()
    client.force_authenticate(porteur)
    export_response = client.post("/api/passeport/mine/export/")
    export = PassportExport.objects.get(porteur=porteur)

    public_client = APIClient()
    response = public_client.get(f"/api/passeport/verifier/{export.verification_id}/")

    assert response.status_code == 200
    assert response.data["valide"] is True
    assert response.data["porteur"]
    assert "email" not in response.data
    assert export_response.status_code == 200


@pytest.mark.django_db
def test_verification_publique_dun_identifiant_inconnu():
    public_client = APIClient()

    response = public_client.get(f"/api/passeport/verifier/{uuid.uuid4()}/")

    assert response.status_code == 404
