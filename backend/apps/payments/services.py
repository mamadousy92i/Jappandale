import logging
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.campaigns.models import Campaign, CampaignAuditLog
from apps.contributions.models import Contribution, Transaction
from apps.contributions.services import settle_contribution_payment
from apps.notifications.models import Notification
from apps.notifications.services import notify_admins, notify_user

from . import paytech
from .models import Payment

logger = logging.getLogger(__name__)


class PaymentUnavailable(APIException):
    status_code = 503
    default_detail = "Le paiement en ligne n'est pas disponible pour le moment."
    default_code = "payment_unavailable"


def _frontend(path):
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


def _new_ref(prefix):
    return f"JAP-{prefix}-{uuid.uuid4().hex}"


def _open_checkout(payment, *, item_name, command_name, success_url, cancel_url):
    """Crée le paiement chez PayTech et renvoie l'URL de la page de paiement."""
    try:
        token, redirect_url = paytech.request_payment(
            ref_command=payment.ref_command,
            item_name=item_name,
            amount=payment.amount,
            command_name=command_name,
            success_url=success_url,
            cancel_url=cancel_url,
            ipn_url=_frontend("/api/payments/paytech/ipn/"),
        )
    except paytech.PaytechError as error:
        payment.status = Payment.Status.ANNULEE
        payment.save(update_fields=["status"])
        raise PaymentUnavailable(str(error)) from error
    payment.paytech_token = token
    payment.save(update_fields=["paytech_token"])
    return redirect_url


def _ensure_available():
    if not paytech.is_active() or not paytech.is_configured():
        raise PaymentUnavailable()


def start_contribution_payment(*, contribution):
    _ensure_available()
    if contribution.status != Contribution.Status.INITIEE:
        raise ValidationError("Cette contribution n'est plus en attente de paiement.")
    campaign = contribution.campaign
    if campaign.status != Campaign.Status.PUBLIEE or campaign.deadline < timezone.localdate():
        raise ValidationError("Cette campagne n'accepte plus de contribution.")

    payment = Payment.objects.create(
        ref_command=_new_ref("C"),
        kind=Payment.Kind.CONTRIBUTION,
        amount=contribution.amount,
        user=contribution.contributor,
        contribution=contribution,
    )
    base = f"/campagnes/{campaign.slug}/contribuer?ref={contribution.public_reference}"
    return _open_checkout(
        payment,
        item_name=f"Contribution {campaign.title}",
        command_name=f"Contribution à {campaign.title}",
        success_url=_frontend(f"{base}&paiement=retour"),
        cancel_url=_frontend(f"{base}&paiement=annule"),
    )


def start_fee_payment(*, campaign, user):
    _ensure_available()
    if campaign.owner_id != user.id:
        raise ValidationError("Cette campagne ne vous appartient pas.")
    if campaign.status != Campaign.Status.BROUILLON:
        raise ValidationError("Les frais de dossier ne concernent que les campagnes en brouillon.")
    if campaign.dossier_fee_status == Campaign.DossierFeeStatus.VALIDE:
        raise ValidationError("Les frais de dossier de cette campagne sont déjà réglés.")

    payment = Payment.objects.create(
        ref_command=_new_ref("F"),
        kind=Payment.Kind.DOSSIER_FEE,
        amount=settings.DOSSIER_FEE_AMOUNT,
        user=user,
        campaign=campaign,
    )
    base = "/campagnes?vue=mes-campagnes"
    return _open_checkout(
        payment,
        item_name=f"Frais de dossier {campaign.title}",
        command_name=f"Frais de dossier — {campaign.title}",
        success_url=_frontend(f"{base}&frais=retour"),
        cancel_url=_frontend(f"{base}&frais=annule"),
    )


def _validate_fee(campaign, payment):
    if campaign.dossier_fee_status == Campaign.DossierFeeStatus.VALIDE:
        return
    campaign.dossier_fee_status = Campaign.DossierFeeStatus.VALIDE
    campaign.dossier_fee_note = ""
    campaign.dossier_fee_reviewed_at = timezone.now()
    campaign.dossier_fee_reviewed_by = None
    campaign.save(
        update_fields=[
            "dossier_fee_status",
            "dossier_fee_note",
            "dossier_fee_reviewed_at",
            "dossier_fee_reviewed_by",
        ]
    )
    CampaignAuditLog.objects.create(
        campaign=campaign,
        actor=None,
        action=CampaignAuditLog.Action.FEE_VALIDATED,
        previous_status=campaign.status,
        new_status=campaign.status,
        note=f"Payés en ligne via PayTech (réf. {payment.ref_command}).",
    )
    notify_user(
        recipient=campaign.owner,
        kind=Notification.Kind.CAMPAIGN_FEE_VALIDATED,
        subject="Frais de dossier réglés",
        message=(
            f"Les frais de dossier de « {campaign.title} » sont réglés : "
            "vous pouvez soumettre votre campagne."
        ),
        action_url="/compte?onglet=mes-campagnes",
    )


def handle_ipn(data):
    """Traite une notification PayTech DÉJÀ authentifiée. Renvoie un code lisible.

    Idempotent : PayTech peut renvoyer la même notification plusieurs fois.
    """
    ref_command = str(data.get("ref_command") or "")
    event = str(data.get("type_event") or "")

    with transaction.atomic():
        payment = (
            Payment.objects.select_for_update().filter(ref_command=ref_command).first()
        )
        if payment is None:
            logger.warning("IPN PayTech pour une référence inconnue : %s", ref_command[:60])
            return "unknown_reference"

        if event == "sale_canceled":
            if payment.status == Payment.Status.INITIEE:
                payment.status = Payment.Status.ANNULEE
                payment.save(update_fields=["status"])
            return "canceled"

        if event != "sale_complete":
            return "ignored_event"

        if payment.status == Payment.Status.CONFIRMEE:
            return "already_confirmed"

        # En mode bac à sable PayTech débite un montant aléatoire : on ne compare le
        # montant qu'en production, où un écart signifie un paiement incohérent.
        if settings.PAYTECH_ENV == "prod":
            try:
                paid = int(float(str(data.get("item_price", ""))))
            except ValueError:
                paid = None
            if paid != payment.amount:
                logger.error("IPN PayTech : montant incohérent pour %s", ref_command)
                notify_admins(
                    subject="Paiement PayTech incohérent",
                    message=(
                        f"Le paiement {ref_command} signale un montant différent de "
                        f"{payment.amount} FCFA. Vérifiez-le dans PayTech avant toute action."
                    ),
                )
                return "amount_mismatch"

        payment.status = Payment.Status.CONFIRMEE
        payment.confirmed_at = timezone.now()
        payment.payment_method = str(data.get("payment_method") or "")[:60]
        payment.save(update_fields=["status", "confirmed_at", "payment_method"])

        if payment.kind == Payment.Kind.DOSSIER_FEE:
            campaign = Campaign.objects.select_for_update().get(pk=payment.campaign_id)
            _validate_fee(campaign, payment)
            return "fee_validated"

        contribution = settle_contribution_payment(
            contribution=payment.contribution,
            success=True,
            provider=Transaction.Provider.PAYTECH,
        )
        if contribution.status != Contribution.Status.CONFIRMEE:
            # L'argent a été encaissé mais la contribution ne peut plus être créditée
            # (campagne close entre-temps, contrepartie épuisée) : remboursement manuel.
            notify_admins(
                subject="Paiement reçu sans contribution confirmée",
                message=(
                    f"Le paiement {ref_command} de {payment.amount} FCFA a été encaissé "
                    "mais la contribution n'a pas pu être confirmée. Un remboursement "
                    "manuel via PayTech est à prévoir."
                ),
            )
            return "paid_but_not_credited"
        return "contribution_confirmed"
