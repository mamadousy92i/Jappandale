from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.contributions.permissions import IsKycValidated
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import Message, MessageReport, MessageThread
from .serializers import (
    MessageCreateSerializer,
    MessageReportCreateSerializer,
    MessageSerializer,
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


class ThreadMessagesView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsKycValidated]

    def get_serializer_context(self):
        return {"request": self.request}

    def _get_thread(self):
        thread = get_object_or_404(
            MessageThread.objects.select_related("campaign", "campaign__owner", "other_user"),
            pk=self.kwargs["thread_id"],
        )
        user = self.request.user
        if user.id not in (thread.campaign.owner_id, thread.other_user_id):
            raise Http404
        return thread

    def get_queryset(self):
        thread = self._get_thread()
        return thread.messages.select_related("sender").order_by("created_at")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        thread = self._get_thread()
        thread.messages.filter(read_at__isnull=True).exclude(sender_id=request.user.id).update(
            read_at=timezone.now()
        )
        return response

    def create(self, request, *args, **kwargs):
        thread = self._get_thread()
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(
            thread=thread, sender=request.user, body=serializer.validated_data["body"]
        )
        thread.last_message_at = message.created_at
        thread.save(update_fields=["last_message_at"])

        recipient = (
            thread.other_user
            if request.user.id == thread.campaign.owner_id
            else thread.campaign.owner
        )
        notify_user(
            recipient=recipient,
            kind=Notification.Kind.MESSAGE_RECEIVED,
            subject="Nouveau message reçu",
            message=(
                f"{_display_name(request.user)} vous a envoyé un message à propos de "
                f"« {thread.campaign.title} »."
            ),
            action_url="/compte?onglet=messages",
        )
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MessageReportCreateView(generics.CreateAPIView):
    serializer_class = MessageReportCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        message = get_object_or_404(
            Message.objects.select_related("thread__campaign", "thread__other_user"),
            pk=self.kwargs["message_id"],
        )
        thread = message.thread
        if request.user.id not in (thread.campaign.owner_id, thread.other_user_id):
            raise Http404
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        MessageReport.objects.create(
            message=message,
            reporter=request.user,
            reason=serializer.validated_data["reason"],
            details=serializer.validated_data["details"],
        )
        return Response({"detail": "Signalement enregistré."}, status=status.HTTP_201_CREATED)
