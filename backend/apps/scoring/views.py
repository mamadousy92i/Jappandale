from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsPorteur
from .serializers import ScoreSerializer
from .services import refresh_score


class MyScoreView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def get(self, request):
        score = refresh_score(request.user)
        return Response(ScoreSerializer(score).data)
