from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)[:50]


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"count": count})


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        updated = Notification.objects.filter(
            pk=pk, recipient=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())
        if not updated and not Notification.objects.filter(
            pk=pk, recipient=request.user
        ).exists():
            return Response(
                {"detail": "Notification introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
