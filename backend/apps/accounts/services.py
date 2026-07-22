import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.core.email import send_branded_email

from .models import AdminLoginOtp, EmailVerificationOtp


def send_email_verification_otp(user):
    """Crée et envoie un OTP à six chiffres exclusivement par e-mail."""
    EmailVerificationOtp.objects.filter(user=user, used_at__isnull=True).update(
        used_at=timezone.now()
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = EmailVerificationOtp(
        user=user,
        expires_at=timezone.now() + timedelta(seconds=settings.EMAIL_OTP_TTL),
    )
    otp.set_code(code)
    otp.save()
    send_branded_email(
        subject="Votre code de vérification Jappandale",
        message=(
            f"Bonjour {user.first_name or ''},\n\n"
            "Utilisez le code ci-dessous pour confirmer votre adresse e-mail.\n\n"
            f"Il reste valable pendant {settings.EMAIL_OTP_TTL // 60} minutes. "
            "Ne le communiquez à personne."
        ),
        plain_message=(
            f"Bonjour {user.first_name or ''},\n\n"
            f"Votre code de vérification Jappandale est : {code}\n\n"
            f"Il reste valable pendant {settings.EMAIL_OTP_TTL // 60} minutes. "
            "Ne le communiquez à personne."
        ),
        recipient_list=[user.email],
        code=code,
        headline="Confirmez votre adresse e-mail",
        eyebrow="VÉRIFICATION DU COMPTE",
        fail_silently=False,
    )
    return otp


def send_admin_login_otp(user):
    """Envoie le second facteur obligatoire d’un compte administrateur."""
    AdminLoginOtp.objects.filter(user=user, used_at__isnull=True).update(
        used_at=timezone.now()
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = AdminLoginOtp(
        user=user,
        expires_at=timezone.now()
        + timedelta(seconds=settings.ADMIN_MFA_OTP_TTL),
    )
    otp.set_code(code)
    otp.save()
    send_branded_email(
        subject="Code de connexion administrateur Jappandale",
        message=(
            "Une connexion à l’espace d’administration a été demandée. "
            f"Le code expire dans {settings.ADMIN_MFA_OTP_TTL // 60} minutes. "
            "Si vous n’êtes pas à l’origine de cette demande, changez votre mot de passe."
        ),
        plain_message=(
            f"Votre code de connexion administrateur Jappandale est : {code}\n\n"
            f"Il expire dans {settings.ADMIN_MFA_OTP_TTL // 60} minutes."
        ),
        recipient_list=[user.email],
        code=code,
        headline="Confirmez votre connexion",
        eyebrow="SÉCURITÉ ADMINISTRATEUR",
        fail_silently=False,
    )
    return otp
