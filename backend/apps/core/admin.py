from django.contrib import admin

from .models import SupportRequest


@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):
    list_display = ("subject", "name", "email", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("name", "email", "subject", "message")
    readonly_fields = (
        "user", "name", "email", "subject", "message", "created_at", "updated_at"
    )

    def has_add_permission(self, request):
        return False
