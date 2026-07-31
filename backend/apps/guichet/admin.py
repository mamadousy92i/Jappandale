from django.contrib import admin

from .models import FinancingScheme, SchemeReferral


@admin.register(FinancingScheme)
class FinancingSchemeAdmin(admin.ModelAdmin):
    list_display = ("name", "provider_name", "provider_type", "status", "min_score", "created_at")
    list_filter = ("status", "provider_type")
    search_fields = ("name", "provider_name")


@admin.register(SchemeReferral)
class SchemeReferralAdmin(admin.ModelAdmin):
    list_display = ("scheme", "porteur", "status", "created_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("scheme__name", "porteur__email")
    readonly_fields = ("scheme", "porteur", "created_at")
