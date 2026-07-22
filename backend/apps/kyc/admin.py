from django.contrib import admin

from .models import KycAuditLog, KycDocument


@admin.register(KycDocument)
class KycDocumentAdmin(admin.ModelAdmin):
    list_display = ("user", "document_type", "uploaded_at")
    list_filter = ("document_type",)
    search_fields = ("user__email",)
    readonly_fields = ("user", "document_type", "file", "uploaded_at")

    def has_add_permission(self, request):
        return False


@admin.register(KycAuditLog)
class KycAuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "actor", "previous_status", "new_status", "created_at")
    list_filter = ("action", "new_status")
    search_fields = ("user__email", "actor__email", "note")
    readonly_fields = (
        "user",
        "actor",
        "document",
        "action",
        "previous_status",
        "new_status",
        "note",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
