from django.urls import path
from .views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    AdminMfaVerifyView,
    CsrfCookieView,
    EmailVerificationSendView,
    EmailVerificationVerifyView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    SessionStatusView,
    LogoutView,
)

urlpatterns = [
    path("csrf/", CsrfCookieView.as_view(), name="csrf"),
    path("session/", SessionStatusView.as_view(), name="session-status"),
    path("token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("token/mfa/", AdminMfaVerifyView.as_view(), name="token_mfa"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("email-verification/send/", EmailVerificationSendView.as_view(), name="email-verification-send"),
    path("email-verification/verify/", EmailVerificationVerifyView.as_view(), name="email-verification-verify"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
