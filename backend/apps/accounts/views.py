from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.email import send_branded_email

from .serializers import (
    AdminMfaVerifySerializer,
    EmailVerificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .models import AdminLoginOtp, EmailVerificationOtp, User
from .services import send_admin_login_otp, send_email_verification_otp


def _set_auth_cookie(response, name, value, max_age, path):
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        path=path,
        secure=settings.AUTH_COOKIE_SECURE,
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        domain=settings.AUTH_COOKIE_DOMAIN,
    )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "detail": "Protection CSRF initialisée.",
                "csrf_token": get_token(request),
            }
        )


class SessionStatusView(APIView):
    """Retourne l’état de session sans erreur pour les visiteurs anonymes."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        access_valid = False
        refresh_valid = False
        access_cookie = request.COOKIES.get(settings.AUTH_COOKIE_ACCESS_NAME)
        refresh_cookie = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH_NAME)
        if access_cookie:
            try:
                AccessToken(access_cookie)
                access_valid = True
            except TokenError:
                pass
        if refresh_cookie:
            try:
                RefreshToken(refresh_cookie)
                refresh_valid = True
            except TokenError:
                pass
        return Response(
            {"authenticated": access_valid, "can_refresh": refresh_valid}
        )


@method_decorator(csrf_protect, name="dispatch")
class CookieTokenObtainPairView(TokenObtainPairView):
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin_login"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.user.role == User.Role.ADMIN:
            try:
                challenge = send_admin_login_otp(serializer.user)
            except Exception:
                return Response(
                    {"detail": "Le code de sécurité n’a pas pu être envoyé."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(
                {
                    "requires_mfa": True,
                    "challenge_id": str(challenge.public_id),
                    "detail": "Un code de sécurité a été envoyé par e-mail.",
                },
                status=status.HTTP_202_ACCEPTED,
            )
        response = Response({"detail": "Connexion réussie."})
        _set_auth_cookie(
            response,
            settings.AUTH_COOKIE_ACCESS_NAME,
            serializer.validated_data["access"],
            3600,
            "/api/",
        )
        _set_auth_cookie(
            response,
            settings.AUTH_COOKIE_REFRESH_NAME,
            serializer.validated_data["refresh"],
            7 * 86400,
            "/api/auth/",
        )
        return response


@method_decorator(csrf_protect, name="dispatch")
class AdminMfaVerifyView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin_mfa_verify"

    def post(self, request):
        serializer = AdminMfaVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = (
            AdminLoginOtp.objects.select_related("user")
            .filter(public_id=serializer.validated_data["challenge_id"])
            .first()
        )
        if (
            not challenge
            or not challenge.is_valid
            or not challenge.user.is_active
            or challenge.user.role != User.Role.ADMIN
        ):
            return Response(
                {"code": ["Ce code est expiré. Recommencez la connexion."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not challenge.check_code(serializer.validated_data["code"]):
            challenge.attempts += 1
            challenge.save(update_fields=["attempts"])
            return Response({"code": ["Code incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
        challenge.used_at = timezone.now()
        challenge.save(update_fields=["used_at"])
        refresh = RefreshToken.for_user(challenge.user)
        response = Response({"detail": "Connexion sécurisée réussie."})
        _set_auth_cookie(
            response,
            settings.AUTH_COOKIE_ACCESS_NAME,
            str(refresh.access_token),
            3600,
            "/api/",
        )
        _set_auth_cookie(
            response,
            settings.AUTH_COOKIE_REFRESH_NAME,
            str(refresh),
            7 * 86400,
            "/api/auth/",
        )
        return response


@method_decorator(csrf_protect, name="dispatch")
class CookieTokenRefreshView(TokenRefreshView):
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        payload = request.data.copy()
        payload["refresh"] = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH_NAME, "")
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        access = serializer.validated_data["access"]
        response = Response({"detail": "Session renouvelée."})
        _set_auth_cookie(response, settings.AUTH_COOKIE_ACCESS_NAME, access, 3600, "/api/")
        return response


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            settings.AUTH_COOKIE_ACCESS_NAME,
            path="/api/",
            domain=settings.AUTH_COOKIE_DOMAIN,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )
        response.delete_cookie(
            settings.AUTH_COOKIE_REFRESH_NAME,
            path="/api/auth/",
            domain=settings.AUTH_COOKIE_DOMAIN,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )
        return response


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(generics.CreateAPIView):
    authentication_classes = []
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


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetRequestView(APIView):
    authentication_classes = []
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


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Votre mot de passe a été mis à jour."})
