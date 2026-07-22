from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "kind",
            "kind_display",
            "subject",
            "message",
            "action_url",
            "is_read",
            "created_at",
            "read_at",
        ]
        read_only_fields = fields
