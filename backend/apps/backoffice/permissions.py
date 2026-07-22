from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsJappandaleAdmin(BasePermission):
    message = "Cet espace est réservé aux administrateurs Jappandale."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.role == User.Role.ADMIN)
        )
