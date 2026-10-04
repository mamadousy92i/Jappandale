import hashlib
import hmac
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign, CampaignAuditLog
from apps.contributions.models import Contribution, Transaction
from apps.notifications.models import Notification
from apps.payments import paytech
from apps.payments.models import Payment

User = get_user_model()

API_KEY = "cle-de-test"
API_SECRET = "secret-de-test"
IPN_URL = "/api/payments/paytech/ipn/"


@pytest.fixture(autouse=True)
def paytech_settings(settings):
    settings.PAYMENT_PROVIDER = "paytech"
    settings.PAYTECH_API_KEY = API_KEY
    settings.PAYTECH_API_SECRET = API_SECRET
    settings.PAYTECH_ENV = "test"
    settings.DOSSIER_FEE_AMOUNT = 20_000
    settings.FRONTEND_URL = "https://demo.example.sn"


@pytest.fixture
def fake_checkout(monkeypatch):
    calls = []

    def fake_request_payment(**kwargs):
        calls.append(kwargs)
        return "tok_123", "https://paytech.sn/payment/checkout/tok_123"

    monkeypatch.setattr(paytech, "request_payment", fake_request_payment)
    return calls


def make_user(email, role=User.Role.CONTRIBUTEUR):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=User.KycStatus.VALIDE,
        first_name="Awa",
        last_name="Diop",
        email_verified_at=timezone.now(),
    )


def make_campaign(owner, **overrides):
    values = {
        "title": "Cantine scolaire",
        "summary": "Équiper une cantine.",
        "description": "Description détaillée.",
        "category": Campaign.Category.EDUCATION,
        "goal_amount": 500_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


def make_contribution(campaign, contributor, amount=25_000):
    contribution = Contribution.objects.create(
        contributor=contributor, campaign=campaign, amount=amount
    )
    Transaction.objects.create(contribution=contribution)
    return contribution


def signed_ipn(ref_command, *, event="sale_complete", price=25_000, **extra):
    final_price = str(price)
    message = f"{final_price}|{ref_command}|{API_KEY}"
    return {
        "type_event": event,
        "ref_command": ref_command,
        "item_price": str(price),
        "final_item_price": final_price,
        "payment_method": "Wave",
        "hmac_compute": hmac.new(API_SECRET.encode(), message.encode(), hashlib.sha256).hexdigest(),
        **extra,
    }


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_config_expose_le_prestataire_et_les_frais():
    response = APIClient().get("/api/payments/config/")
    assert response.status_code == 200
    assert response.data == {"provider": "PAYTECH", "dossier_fee_amount": 20_000}


@pytest.mark.django_db
def test_config_simule_par_defaut(settings):
    settings.PAYMENT_PROVIDER = "simulated"
    assert APIClient().get("/api/payments/config/").data["provider"] == "SIMULATED"


@pytest.mark.django_db
def test_demarrer_un_paiement_de_contribution(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)

    response = client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )

    assert response.status_code == 200
    assert response.data["redirect_url"] == "https://paytech.sn/payment/checkout/tok_123"
    payment = Payment.objects.get()
    assert payment.kind == Payment.Kind.CONTRIBUTION
    assert payment.amount == 25_000
    assert payment.status == Payment.Status.INITIEE
    assert payment.paytech_token == "tok_123"
    sent = fake_checkout[0]
    assert sent["ref_command"] == payment.ref_command
    assert sent["amount"] == 25_000
    assert sent["ipn_url"] == "https://demo.example.sn/api/payments/paytech/ipn/"
    assert f"ref={contribution.public_reference}&paiement=retour" in sent["success_url"]


@pytest.mark.django_db
def test_demarrer_un_paiement_exige_d_etre_le_contributeur(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contribution = make_contribution(make_campaign(owner), make_user("contrib@test.sn"))
    intrus = make_user("intrus@test.sn")

    response = client_for(intrus).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )

    assert response.status_code == 404
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_paiement_indisponible_si_paytech_inactif(settings, fake_checkout):
    settings.PAYMENT_PROVIDER = "simulated"
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)

    response = client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )

    assert response.status_code == 503
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_signature_invalide_rejetee_sans_effet(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()
    forged = signed_ipn(payment.ref_command)
    forged["hmac_compute"] = "0" * 64

    response = APIClient().post(IPN_URL, forged, format="json")

    assert response.status_code == 403
    contribution.refresh_from_db()
    payment.refresh_from_db()
    assert contribution.status == Contribution.Status.INITIEE
    assert payment.status == Payment.Status.INITIEE


@pytest.mark.django_db
def test_ipn_sans_hmac_rejetee_meme_avec_les_empreintes_sha256(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()
    data = signed_ipn(payment.ref_command)
    data.pop("hmac_compute")
    data["api_key_sha256"] = hashlib.sha256(API_KEY.encode()).hexdigest()
    data["api_secret_sha256"] = hashlib.sha256(API_SECRET.encode()).hexdigest()

    assert APIClient().post(IPN_URL, data, format="json").status_code == 403
    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.INITIEE


@pytest.mark.django_db
def test_ipn_valide_confirme_la_contribution_une_seule_fois(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    campaign = make_campaign(owner)
    contribution = make_contribution(campaign, contributor)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()
    ipn = signed_ipn(payment.ref_command)

    first = APIClient().post(IPN_URL, ipn, format="json")
    replay = APIClient().post(IPN_URL, ipn, format="json")

    assert first.status_code == 200 and first.data["detail"] == "contribution_confirmed"
    assert replay.status_code == 200 and replay.data["detail"] == "already_confirmed"
    contribution.refresh_from_db()
    campaign.refresh_from_db()
    payment.refresh_from_db()
    assert contribution.status == Contribution.Status.CONFIRMEE
    assert contribution.transaction.provider == Transaction.Provider.PAYTECH
    assert campaign.collected_amount == 25_000
    assert payment.status == Payment.Status.CONFIRMEE
    assert payment.payment_method == "Wave"
    assert Notification.objects.filter(
        recipient=contributor, kind=Notification.Kind.CONTRIBUTION_CONFIRMED
    ).count() == 1


@pytest.mark.django_db
def test_ipn_form_encoded_comme_l_envoie_paytech(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()

    response = APIClient().post(IPN_URL, signed_ipn(payment.ref_command))

    assert response.status_code == 200
    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.CONFIRMEE


@pytest.mark.django_db
def test_annulation_puis_paiement_aboutit_quand_meme(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()

    APIClient().post(IPN_URL, signed_ipn(payment.ref_command, event="sale_canceled"), format="json")
    payment.refresh_from_db()
    contribution.refresh_from_db()
    assert payment.status == Payment.Status.ANNULEE
    assert contribution.status == Contribution.Status.INITIEE

    APIClient().post(IPN_URL, signed_ipn(payment.ref_command), format="json")
    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.CONFIRMEE


@pytest.mark.django_db
def test_reference_inconnue_ne_cree_rien():
    response = APIClient().post(IPN_URL, signed_ipn("JAP-C-inconnue"), format="json")
    assert response.status_code == 200
    assert response.data["detail"] == "unknown_reference"


@pytest.mark.django_db
def test_montant_incoherent_refuse_en_production(settings, fake_checkout):
    settings.PAYTECH_ENV = "prod"
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor, amount=25_000)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()

    response = APIClient().post(IPN_URL, signed_ipn(payment.ref_command, price=100), format="json")

    assert response.data["detail"] == "amount_mismatch"
    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.INITIEE


@pytest.mark.django_db
def test_montant_libre_en_bac_a_sable(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor, amount=25_000)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()

    APIClient().post(IPN_URL, signed_ipn(payment.ref_command, price=120), format="json")

    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.CONFIRMEE


@pytest.mark.django_db
def test_paye_mais_campagne_close_previent_les_admins(fake_checkout):
    admin = User.objects.create_superuser(email="admin@test.sn", password="MotDePasse123!")
    admin.role = User.Role.ADMIN
    admin.save(update_fields=["role"])
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    campaign = make_campaign(owner)
    contribution = make_contribution(campaign, contributor)
    client_for(contributor).post(
        f"/api/payments/contributions/{contribution.public_reference}/start/"
    )
    payment = Payment.objects.get()
    Campaign.objects.filter(pk=campaign.pk).update(status=Campaign.Status.CLOTUREE)

    response = APIClient().post(IPN_URL, signed_ipn(payment.ref_command), format="json")

    assert response.data["detail"] == "paid_but_not_credited"
    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.ECHOUEE
    assert Notification.objects.filter(
        recipient=admin, kind=Notification.Kind.ADMIN_ACTION_REQUIRED
    ).exists()


@pytest.mark.django_db
def test_frais_de_dossier_payes_valident_automatiquement(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    campaign = make_campaign(owner, status=Campaign.Status.BROUILLON)

    response = client_for(owner).post(f"/api/payments/campaigns/{campaign.slug}/fee/start/")

    assert response.status_code == 200
    payment = Payment.objects.get()
    assert payment.kind == Payment.Kind.DOSSIER_FEE
    assert payment.amount == 20_000
    assert "frais=retour" in fake_checkout[0]["success_url"]

    ipn = signed_ipn(payment.ref_command, price=20_000)
    assert APIClient().post(IPN_URL, ipn, format="json").data["detail"] == "fee_validated"
    assert APIClient().post(IPN_URL, ipn, format="json").data["detail"] == "already_confirmed"

    campaign.refresh_from_db()
    assert campaign.dossier_fee_status == Campaign.DossierFeeStatus.VALIDE
    assert campaign.dossier_fee_reviewed_by is None
    assert CampaignAuditLog.objects.filter(
        campaign=campaign, action=CampaignAuditLog.Action.FEE_VALIDATED
    ).count() == 1
    assert Notification.objects.filter(
        recipient=owner, kind=Notification.Kind.CAMPAIGN_FEE_VALIDATED
    ).count() == 1


@pytest.mark.django_db
def test_frais_de_dossier_reserves_au_porteur(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    campaign = make_campaign(owner, status=Campaign.Status.BROUILLON)

    response = client_for(make_user("autre@test.sn", User.Role.PORTEUR)).post(
        f"/api/payments/campaigns/{campaign.slug}/fee/start/"
    )

    assert response.status_code == 404
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_frais_deja_valides_ne_se_paient_pas_deux_fois(fake_checkout):
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    campaign = make_campaign(
        owner,
        status=Campaign.Status.BROUILLON,
        dossier_fee_status=Campaign.DossierFeeStatus.VALIDE,
    )

    response = client_for(owner).post(f"/api/payments/campaigns/{campaign.slug}/fee/start/")

    assert response.status_code == 400
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_simulateur_coupe_quand_paytech_est_actif(settings):
    settings.SIMULATED_PAYMENTS_ENABLED = True
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)

    response = client_for(contributor).post(
        f"/api/contributions/{contribution.public_reference}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    assert response.status_code == 503
    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.INITIEE


@pytest.mark.django_db
def test_detail_d_une_contribution_reserve_a_son_auteur():
    owner = make_user("owner@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib@test.sn")
    contribution = make_contribution(make_campaign(owner), contributor)
    url = f"/api/contributions/{contribution.public_reference}/"

    assert client_for(contributor).get(url).data["status"] == "INITIEE"
    assert client_for(make_user("intrus@test.sn")).get(url).status_code == 404


def test_signature_hmac_conforme_a_la_documentation(settings):
    settings.PAYTECH_API_KEY = "k"
    settings.PAYTECH_API_SECRET = "s"
    message = "1000|REF1|k"
    expected = hmac.new(b"s", message.encode(), hashlib.sha256).hexdigest()

    assert paytech.verify_ipn(
        {"final_item_price": "1000", "ref_command": "REF1", "hmac_compute": expected}
    )
    assert not paytech.verify_ipn(
        {"final_item_price": "1001", "ref_command": "REF1", "hmac_compute": expected}
    )
    assert not paytech.verify_ipn({"final_item_price": "1000", "ref_command": "REF1"})
