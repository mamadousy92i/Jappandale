import hmac

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from . import api as scoring_api
from .serializers import ScoreSerializer

User = get_user_model()


class HasInternalApiKey(permissions.BasePermission):
    """Authentification par clé partagée, réservée aux appels service-à-service.

    N'utilise ni cookie ni JWT utilisateur : ce point d'entrée est destiné à
    être appelé par d'autres composants du système (aujourd'hui d'autres apps
    Django du même déploiement, demain potentiellement un moteur de scoring
    extrait et déployé en service indépendant).
    """

    def has_permission(self, request, view):
        expected = settings.INTERNAL_API_KEY
        if not expected:
            return False
        provided = request.headers.get("X-Internal-Api-Key", "")
        return hmac.compare_digest(provided, expected)


class InternalScoreView(APIView):
    """Score courant d'un porteur, par identifiant — contrat interne stable.

    Pensé pour rester valable même si le moteur de calcul est un jour extrait
    en service indépendant : seuls l'URL et ce payload JSON doivent alors
    rester identiques, quel que soit le composant qui les sert.
    """

    authentication_classes = []
    permission_classes = [HasInternalApiKey]

    def get(self, request, porteur_id):
        porteur = get_object_or_404(User, pk=porteur_id, role=User.Role.PORTEUR)
        latest = scoring_api.get_latest_score(porteur)
        return Response(
            {
                "porteur_id": porteur.id,
                "value": scoring_api.compute_score_value(porteur),
                "latest_persisted": ScoreSerializer(latest).data if latest else None,
            }
        )
