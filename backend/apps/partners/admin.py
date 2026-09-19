from django.contrib import admin

from .models import PartnerProjectInterest, ProjectDocument


@admin.register(ProjectDocument)
class ProjectDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "campaign", "document_type", "shared_with_partners", "created_at")
    list_filter = ("document_type", "shared_with_partners")
    search_fields = ("title", "campaign__title", "uploaded_by__email")


@admin.register(PartnerProjectInterest)
class PartnerProjectInterestAdmin(admin.ModelAdmin):
    list_display = ("partner", "campaign", "status", "updated_at")
    list_filter = ("status",)
    search_fields = ("partner__email", "campaign__title")
