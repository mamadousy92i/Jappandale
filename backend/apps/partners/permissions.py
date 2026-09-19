from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsValidatedPartner(BasePermission):
    message = "Votre compte partenaire doit être vérifié avant d'accéder à cet espace."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role == User.Role.PARTENAIRE
            and user.is_email_verified
            and user.kyc_status == User.KycStatus.VALIDE
        )


class IsValidatedPorteur(BasePermission):
    message = "Votre compte porteur doit être vérifié avant de gérer les documents du projet."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role == User.Role.PORTEUR
            and user.is_email_verified
            and user.kyc_status == User.KycStatus.VALIDE
        )
