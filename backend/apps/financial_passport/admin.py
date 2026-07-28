from django.contrib import admin

from .models import PassportExport


@admin.register(PassportExport)
class PassportExportAdmin(admin.ModelAdmin):
    list_display = ("porteur", "verification_id", "generated_at")
    search_fields = ("porteur__email", "verification_id")
    readonly_fields = ("porteur", "verification_id", "snapshot", "generated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
