from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.email import send_branded_email

from .serializers import (
    EmailVerificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .models import EmailVerificationOtp
from .services import send_email_verification_otp


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class EmailVerificationSendView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_otp_send"

    def post(self, request):
        if request.user.is_email_verified:
            return Response({"detail": "Cette adresse e-mail est déjà vérifiée."})
        try:
            send_email_verification_otp(request.user)
        except Exception:
            return Response(
                {"detail": "Le service e-mail est temporairement indisponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"detail": "Un nouveau code a été envoyé par e-mail."})


class EmailVerificationVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_otp_verify"

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if request.user.is_email_verified:
            return Response({"detail": "Cette adresse e-mail est déjà vérifiée."})
        otp = EmailVerificationOtp.objects.filter(
            user=request.user, used_at__isnull=True
        ).first()
        if not otp or not otp.is_valid:
            return Response(
                {"code": ["Ce code est expiré. Demandez-en un nouveau."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not otp.check_code(serializer.validated_data["code"]):
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            return Response(
                {"code": ["Code incorrect."]}, status=status.HTTP_400_BAD_REQUEST
            )
        now = timezone.now()
        otp.used_at = now
        otp.save(update_fields=["used_at"])
        request.user.email_verified_at = now
        request.user.save(update_fields=["email_verified_at"])
        return Response({"detail": "Votre adresse e-mail est vérifiée."})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_user_model().objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True
        ).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/mot-de-passe/reinitialiser/{uid}/{token}"
            send_branded_email(
                subject="Réinitialisez votre mot de passe Jappandale",
                message=(
                    "Une demande de réinitialisation a été effectuée pour votre compte Jappandale.\n\n"
                    "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail."
                ),
                plain_message=(
                    "Une demande de réinitialisation a été effectuée pour votre compte Jappandale.\n\n"
                    f"Choisissez un nouveau mot de passe : {reset_url}\n\n"
                    "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail."
                ),
                recipient_list=[user.email],
                action_url=reset_url,
                action_label="Choisir un nouveau mot de passe",
                headline="Réinitialisez votre mot de passe",
                eyebrow="SÉCURITÉ DU COMPTE",
                fail_silently=False,
            )
        return Response(
            {"detail": "Si un compte correspond à cette adresse, un lien vient d’être envoyé."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Votre mot de passe a été mis à jour."})
