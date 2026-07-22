from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "subject",
        "recipient",
        "kind",
        "delivery_status",
        "is_read",
        "created_at",
    )
    list_filter = ("kind", "delivery_status", "is_read")
    search_fields = ("recipient__email", "subject", "message")
    readonly_fields = (
        "recipient",
        "kind",
        "subject",
        "message",
        "action_url",
        "delivery_status",
        "delivery_error",
        "is_read",
        "created_at",
        "sent_at",
        "read_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
