from django.contrib import admin

from .models import Dispute


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ("contribution", "reporter", "reason", "status", "created_at")
    list_filter = ("status", "reason")
    search_fields = ("reporter__email", "details")
    readonly_fields = (
        "contribution", "reporter", "reason", "details", "created_at", "updated_at",
    )

    def has_add_permission(self, request):
        return False
