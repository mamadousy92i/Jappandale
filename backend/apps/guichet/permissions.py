from rest_framework import permissions


class IsPorteur(permissions.BasePermission):
    message = "Le Guichet Unique est réservé aux porteurs de projet."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == user.Role.PORTEUR)
