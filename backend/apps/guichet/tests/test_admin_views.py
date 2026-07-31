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


def make_admin(email):
    return make_user(email, role=User.Role.ADMIN, is_staff=True)


def make_scheme(**overrides):
    values = {
        "name": "Fonds d'appui aux artisans",
        "provider_name": "ADEPME",
        "provider_type": FinancingScheme.ProviderType.FONDS_PUBLIC,
        "description": "Appui aux petites entreprises artisanales.",
        "status": FinancingScheme.Status.BROUILLON,
    }
    values.update(overrides)
    return FinancingScheme.objects.create(**values)


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_creer_de_dispositif():
    porteur = make_user("porteur-ga1@test.sn", role=User.Role.PORTEUR)
    client = APIClient()
    client.force_authenticate(porteur)

    response = client.post(
        "/api/guichet/admin/dispositifs/",
        {
            "name": "Fonds test",
            "provider_name": "Bailleur test",
            "provider_type": "FONDS_PUBLIC",
            "description": "Un dispositif de test.",
        },
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_peut_creer_un_dispositif():
    admin = make_admin("admin-ga1@test.sn")
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        "/api/guichet/admin/dispositifs/",
        {
            "name": "Fonds test",
            "provider_name": "Bailleur test",
            "provider_type": "FONDS_PUBLIC",
            "description": "Un dispositif de test.",
            "min_score": 40,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["status"] == "BROUILLON"
    assert FinancingScheme.objects.count() == 1


@pytest.mark.django_db
def test_publier_un_dispositif_horodate_la_publication():
    admin = make_admin("admin-ga2@test.sn")
    scheme = make_scheme()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/guichet/admin/dispositifs/{scheme.id}/",
        {"status": "PUBLIE"},
        format="json",
    )

    assert response.status_code == 200
    scheme.refresh_from_db()
    assert scheme.status == FinancingScheme.Status.PUBLIE
    assert scheme.published_at is not None


@pytest.mark.django_db
def test_montant_max_inferieur_au_montant_min_est_rejete():
    admin = make_admin("admin-ga3@test.sn")
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(
        "/api/guichet/admin/dispositifs/",
        {
            "name": "Fonds test",
            "provider_name": "Bailleur test",
            "provider_type": "FONDS_PUBLIC",
            "description": "Un dispositif de test.",
            "min_goal_amount": 1_000_000,
            "max_goal_amount": 100_000,
        },
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_peut_mettre_a_jour_le_statut_dune_orientation():
    admin = make_admin("admin-ga4@test.sn")
    porteur = make_user("porteur-ga4@test.sn", role=User.Role.PORTEUR)
    scheme = make_scheme(status=FinancingScheme.Status.PUBLIE)
    referral = SchemeReferral.objects.create(scheme=scheme, porteur=porteur)
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/guichet/admin/orientations/{referral.id}/",
        {"status": "ACCEPTE", "note": "Dossier validé par le bailleur."},
        format="json",
    )

    assert response.status_code == 200
    referral.refresh_from_db()
    assert referral.status == SchemeReferral.Status.ACCEPTE
    assert referral.updated_by_id == admin.id


@pytest.mark.django_db
def test_stats_calcule_le_taux_de_transformation_global():
    admin = make_admin("admin-ga5@test.sn")
    porteur = make_user("porteur-ga5@test.sn", role=User.Role.PORTEUR)
    scheme = make_scheme(status=FinancingScheme.Status.PUBLIE)
    SchemeReferral.objects.create(scheme=scheme, porteur=porteur, status=SchemeReferral.Status.ACCEPTE)
    SchemeReferral.objects.create(scheme=scheme, porteur=porteur, status=SchemeReferral.Status.REFUSE)
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get("/api/guichet/admin/stats/")

    assert response.status_code == 200
    assert response.data["global"]["transformation_rate"] == 0.5
    assert response.data["published_schemes"] == 1
