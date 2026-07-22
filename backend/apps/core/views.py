from django.http import JsonResponse
from rest_framework import generics, permissions, serializers
from rest_framework.throttling import ScopedRateThrottle

from .models import SupportRequest


def health(request):
    return JsonResponse({"status": "ok"})


class SupportRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportRequest
        fields = ["id", "name", "email", "subject", "message", "created_at"]
        read_only_fields = ["id", "created_at"]


class SupportRequestCreateView(generics.CreateAPIView):
    serializer_class = SupportRequestSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "support"

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)
