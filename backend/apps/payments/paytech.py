"""Client PayTech (https://paytech.sn) : création d'un paiement et vérification d'IPN."""

import hashlib
import hmac
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

REQUEST_PAYMENT_URL = "https://paytech.sn/api/payment/request-payment"
CHECKOUT_PREFIX = "https://paytech.sn/"
TIMEOUT_SECONDS = 15


class PaytechError(Exception):
    """Échec de la création d'un paiement chez PayTech (message sans donnée secrète)."""


def is_active():
    return settings.PAYMENT_PROVIDER == "paytech"


def is_configured():
    return bool(settings.PAYTECH_API_KEY and settings.PAYTECH_API_SECRET)


def request_payment(
    *,
    ref_command,
    item_name,
    amount,
    command_name,
    success_url,
    cancel_url,
    ipn_url,
):
    """Crée le paiement chez PayTech et renvoie `(token, redirect_url)`."""
    body = {
        "item_name": item_name[:100],
        "item_price": int(amount),
        "currency": "XOF",
        "ref_command": ref_command,
        "command_name": command_name[:100],
        "env": settings.PAYTECH_ENV,
        "success_url": success_url,
        "cancel_url": cancel_url,
    }
    # PayTech n'accepte qu'une URL de notification en HTTPS : en local, on l'omet.
    if ipn_url.startswith("https://"):
        body["ipn_url"] = ipn_url

    request = urllib.request.Request(
        REQUEST_PAYMENT_URL,
        data=json.dumps(body).encode(),
        headers={
            "API_KEY": settings.PAYTECH_API_KEY,
            "API_SECRET": settings.PAYTECH_API_SECRET,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode())
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        logger.error("PayTech request-payment injoignable : %s", type(error).__name__)
        raise PaytechError("Le service de paiement est momentanément indisponible.") from error

    redirect_url = payload.get("redirect_url") or payload.get("redirectUrl") or ""
    token = payload.get("token") or ""
    if payload.get("success") != 1 or not token or not redirect_url.startswith(CHECKOUT_PREFIX):
        logger.error("PayTech request-payment refusé : %s", str(payload.get("message", ""))[:200])
        raise PaytechError("Le paiement n'a pas pu être initialisé.")
    return token, redirect_url


def verify_ipn(data):
    """Vérifie la signature HMAC-SHA256 d'une notification PayTech.

    Seule la signature `hmac_compute` est acceptée : les empreintes SHA256 de la clé
    et du secret sont statiques, donc rejouables par quiconque en aurait vu une seule.
    """
    api_key = settings.PAYTECH_API_KEY
    api_secret = settings.PAYTECH_API_SECRET
    received = str(data.get("hmac_compute") or "")
    if not api_key or not api_secret or not received:
        return False
    message = f"{data.get('final_item_price', '')}|{data.get('ref_command', '')}|{api_key}"
    expected = hmac.new(api_secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)
