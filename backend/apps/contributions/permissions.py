from rest_framework import permissions

from apps.accounts.models import User


class IsKycValidated(permissions.BasePermission):
    message = "Votre identité doit être vérifiée avant de contribuer."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.kyc_status == User.KycStatus.VALIDE
        )
