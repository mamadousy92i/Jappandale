from django.http import JsonResponse
from rest_framework import generics, permissions, serializers
from rest_framework.throttling import ScopedRateThrottle

from .models import SupportRequest
from apps.notifications.services import notify_admins


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
        support = serializer.save(user=user)
        notify_admins(
            subject="Nouvelle demande d’assistance",
            message=f"{support.name} demande de l’aide : {support.subject}",
        )
