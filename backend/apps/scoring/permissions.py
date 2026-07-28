from rest_framework import permissions


class IsPorteur(permissions.BasePermission):
    message = "Seul un porteur de projet dispose d'un Score Jappandale."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == user.Role.PORTEUR)
