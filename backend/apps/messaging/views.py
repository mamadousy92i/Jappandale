from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.contributions.permissions import IsKycValidated
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import Message, MessageThread
from .serializers import (
    ThreadCreateSerializer,
    ThreadSerializer,
    _display_name,
)


class ThreadListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsKycValidated]

    def get_serializer_class(self):
        return ThreadSerializer

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        user = self.request.user
        return (
            MessageThread.objects.filter(Q(campaign__owner=user) | Q(other_user=user))
            .select_related("campaign", "campaign__owner", "other_user")
        )

    def create(self, request, *args, **kwargs):
        serializer = ThreadCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        campaign = serializer.validated_data["campaign"]
        body = serializer.validated_data["body"]

        thread, _created = MessageThread.objects.get_or_create(
            campaign=campaign, other_user=request.user
        )
        message = Message.objects.create(thread=thread, sender=request.user, body=body)
        thread.last_message_at = message.created_at
        thread.save(update_fields=["last_message_at"])

        notify_user(
            recipient=campaign.owner,
            kind=Notification.Kind.MESSAGE_RECEIVED,
            subject="Nouveau message reçu",
            message=(
                f"{_display_name(request.user)} vous a envoyé un message à propos de "
                f"« {campaign.title} »."
            ),
            action_url="/compte?onglet=messages",
        )
        return Response(
            ThreadSerializer(thread, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
