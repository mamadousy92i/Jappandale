from rest_framework import permissions

from apps.accounts.models import User


class IsValidatedPorteur(permissions.BasePermission):
    """Autorise la création uniquement à un porteur dont le KYC est validé."""

    message = (
        "Vous devez être porteur de projet avec une identité vérifiée pour créer "
        "une campagne."
    )

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role == User.Role.PORTEUR
            and user.kyc_status == User.KycStatus.VALIDE
        )


class IsOwner(permissions.BasePermission):
    """Réserve les modifications au porteur propriétaire de la campagne."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner_id == request.user.id
