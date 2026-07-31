from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from . import api as scoring_api
from .permissions import IsPorteur
from .models import Score
from .serializers import ScoreSerializer


class MyScoreView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def get(self, request):
        score = scoring_api.refresh_score(request.user)
        return Response(ScoreSerializer(score).data)


class MyScoreHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def get(self, request):
        scores = Score.objects.filter(porteur=request.user)[:12]
        return Response(ScoreSerializer(scores, many=True).data)
