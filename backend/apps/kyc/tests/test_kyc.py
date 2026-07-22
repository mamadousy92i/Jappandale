from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from PIL import Image

from apps.kyc.models import KycAuditLog, KycDocument
from apps.kyc.services import missing_required_documents

User = get_user_model()


@pytest.fixture
def client_authentifie(db):
    user = User.objects.create_user(
        email="porteur@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _fichier():
    buffer = BytesIO()
    Image.new("RGB", (2, 2), color="white").save(buffer, format="JPEG")
    return SimpleUploadedFile("cni.jpg", buffer.getvalue(), content_type="image/jpeg")


@pytest.mark.django_db
def test_statut_initial_non_soumis(client_authentifie):
    client, _ = client_authentifie
    response = client.get("/api/kyc/")
    assert response.status_code == 200
    assert response.data["kyc_status"] == User.KycStatus.NON_SOUMIS
    assert response.data["documents"] == []


@pytest.mark.django_db
def test_soumission_passe_en_attente(client_authentifie):
    client, user = client_authentifie
    response = client.post(
        "/api/kyc/submit/",
        {"document_type": "CNI", "file": _fichier()},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["kyc_status"] == User.KycStatus.EN_ATTENTE
    assert len(response.data["documents"]) == 1
    user.refresh_from_db()
    assert user.kyc_status == User.KycStatus.EN_ATTENTE
    assert user.kyc_documents.count() == 1
    audit = KycAuditLog.objects.get(user=user)
    assert audit.action == KycAuditLog.Action.DOCUMENT_SUBMITTED
    assert audit.previous_status == User.KycStatus.NON_SOUMIS
    assert audit.new_status == User.KycStatus.EN_ATTENTE


@pytest.mark.django_db
def test_kyc_anonyme_refuse():
    response = APIClient().get("/api/kyc/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_type_document_invalide_refuse(client_authentifie):
    client, _ = client_authentifie
    response = client.post(
        "/api/kyc/submit/",
        {"document_type": "INCONNU", "file": _fichier()},
        format="multipart",
    )
    assert response.status_code == 400
    assert "document_type" in response.data


@pytest.mark.django_db
def test_resoumission_apres_rejet_repasse_en_attente(client_authentifie):
    client, user = client_authentifie
    user.kyc_status = User.KycStatus.REJETE
    user.save(update_fields=["kyc_status"])
    response = client.post(
        "/api/kyc/submit/",
        {"document_type": "PASSEPORT", "file": _fichier()},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["kyc_status"] == User.KycStatus.EN_ATTENTE


@pytest.mark.django_db
def test_soumission_apres_validation_repasse_en_attente(client_authentifie):
    client, user = client_authentifie
    user.kyc_status = User.KycStatus.VALIDE
    user.save(update_fields=["kyc_status"])
    response = client.post(
        "/api/kyc/submit/",
        {"document_type": "CNI", "file": _fichier()},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["kyc_status"] == User.KycStatus.EN_ATTENTE


@pytest.mark.django_db
def test_fichier_image_invalide_refuse(client_authentifie):
    client, _ = client_authentifie
    fichier = SimpleUploadedFile(
        "cni.jpg", b"ceci-n-est-pas-une-image", content_type="image/jpeg"
    )
    response = client.post(
        "/api/kyc/submit/",
        {"document_type": "CNI", "file": fichier},
        format="multipart",
    )
    assert response.status_code == 400
    assert "file" in response.data


@pytest.mark.django_db
def test_me_expose_le_statut_kyc(client_authentifie):
    client, _ = client_authentifie
    response = client.get("/api/auth/me/")
    assert response.status_code == 200
    assert response.data["kyc_status"] == User.KycStatus.NON_SOUMIS


@pytest.mark.django_db
def test_porteur_doit_fournir_identite_et_justificatif_activite(client_authentifie):
    _, user = client_authentifie
    assert len(missing_required_documents(user)) == 2

    user.kyc_documents.create(document_type=KycDocument.DocumentType.CNI, file=_fichier())
    assert missing_required_documents(user) == ["un justificatif d'activité"]

    user.kyc_documents.create(
        document_type=KycDocument.DocumentType.JUSTIFICATIF_ACTIVITE,
        file=_fichier(),
    )
    assert missing_required_documents(user) == []
