import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.guichet.models import FinancingScheme, SchemeReferral

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR, **overrides):
    values = {
        "role": role,
        "kyc_status": User.KycStatus.VALIDE,
        "first_name": "Awa",
        "last_name": "Ndiaye",
        "email_verified_at": timezone.now(),
    }
    values.update(overrides)
    return User.objects.create_user(email=email, password="MotDePasse123!", **values)


def make_scheme(**overrides):
    values = {
        "name": "Fonds d'appui aux artisans",
        "provider_name": "ADEPME",
        "provider_type": FinancingScheme.ProviderType.FONDS_PUBLIC,
        "description": "Appui aux petites entreprises artisanales.",
        "status": FinancingScheme.Status.PUBLIE,
        "min_score": 0,
        "requires_kyc_valide": False,
    }
    values.update(overrides)
    return FinancingScheme.objects.create(**values)


@pytest.mark.django_db
def test_porteur_voit_les_dispositifs_publies_avec_eligibilite():
    porteur = make_user("porteur-gv1@test.sn", role=User.Role.PORTEUR)
    make_scheme(name="Éligible")
    make_scheme(name="Non éligible", min_score=99)
    make_scheme(name="Brouillon", status=FinancingScheme.Status.BROUILLON)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.get("/api/guichet/dispositifs/")

    assert response.status_code == 200
    names = {item["name"] for item in response.data}
    assert names == {"Éligible", "Non éligible"}
    by_name = {item["name"]: item for item in response.data}
    assert by_name["Éligible"]["eligible"] is True
    assert by_name["Non éligible"]["eligible"] is False
    assert by_name["Non éligible"]["ineligibility_reasons"]


@pytest.mark.django_db
def test_contributeur_ne_peut_pas_acceder_au_guichet():
    contributeur = make_user("contrib-gv1@test.sn")
    client = APIClient()
    client.force_authenticate(contributeur)

    response = client.get("/api/guichet/dispositifs/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_manifester_interet_cree_une_orientation():
    porteur = make_user("porteur-gv2@test.sn", role=User.Role.PORTEUR)
    scheme = make_scheme()
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(f"/api/guichet/dispositifs/{scheme.id}/interet/")

    assert response.status_code == 201
    assert response.data["status"] == "INTERET"
    assert SchemeReferral.objects.filter(scheme=scheme, porteur=porteur).count() == 1


@pytest.mark.django_db
def test_manifester_interet_est_idempotent_tant_que_lorientation_est_ouverte():
    porteur = make_user("porteur-gv3@test.sn", role=User.Role.PORTEUR)
    scheme = make_scheme()
    client = APIClient()
    client.force_authenticate(porteur)

    client.post(f"/api/guichet/dispositifs/{scheme.id}/interet/")
    response = client.post(f"/api/guichet/dispositifs/{scheme.id}/interet/")

    assert response.status_code == 200
    assert SchemeReferral.objects.filter(scheme=scheme, porteur=porteur).count() == 1


@pytest.mark.django_db
def test_manifester_interet_refuse_si_porteur_inegible():
    porteur = make_user(
        "porteur-gv4@test.sn", role=User.Role.PORTEUR, kyc_status=User.KycStatus.NON_SOUMIS
    )
    scheme = make_scheme(requires_kyc_valide=True)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(f"/api/guichet/dispositifs/{scheme.id}/interet/")

    assert response.status_code == 400
    assert SchemeReferral.objects.count() == 0


@pytest.mark.django_db
def test_mes_orientations_ne_montre_que_celles_du_porteur_connecte():
    porteur1 = make_user("porteur-gv5@test.sn", role=User.Role.PORTEUR)
    porteur2 = make_user("porteur-gv6@test.sn", role=User.Role.PORTEUR)
    scheme = make_scheme()
    SchemeReferral.objects.create(scheme=scheme, porteur=porteur1)
    SchemeReferral.objects.create(scheme=scheme, porteur=porteur2)
    client = APIClient()
    client.force_authenticate(porteur1)

    response = client.get("/api/guichet/mes-orientations/")

    assert response.status_code == 200
    assert len(response.data) == 1
