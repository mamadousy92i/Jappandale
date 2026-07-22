from django.contrib import admin

from .models import SupportReply, SupportRequest


class SupportReplyInline(admin.TabularInline):
    model = SupportReply
    extra = 0
    readonly_fields = ("sender", "recipient_email", "subject", "message", "delivery_status", "delivery_error", "created_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):
    list_display = ("subject", "name", "email", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("name", "email", "subject", "message")
    readonly_fields = (
        "user", "name", "email", "subject", "message", "created_at", "updated_at"
    )
    inlines = (SupportReplyInline,)

    def has_add_permission(self, request):
        return False
