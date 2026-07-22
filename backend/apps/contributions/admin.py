from django.contrib import admin

from .models import Contribution, Transaction
from .services import refund_contribution


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = (
        "public_reference",
        "campaign",
        "contributor",
        "amount",
        "anonymous",
        "status",
        "created_at",
    )
    list_filter = ("status", "anonymous", "campaign")
    search_fields = ("public_reference", "contributor__email", "campaign__title")
    readonly_fields = (
        "public_reference",
        "contributor",
        "campaign",
        "amount",
        "anonymous",
        "status",
        "created_at",
        "confirmed_at",
        "refunded_at",
    )
    actions = ("rembourser",)

    @admin.action(description="Rembourser les contributions confirmées")
    def rembourser(self, request, queryset):
        refunded = sum(refund_contribution(item) for item in queryset)
        self.message_user(request, f"{refunded} contribution(s) remboursée(s).")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "external_reference",
        "contribution",
        "provider",
        "status",
        "processed_at",
    )
    list_filter = ("provider", "status")
    search_fields = ("external_reference", "contribution__public_reference")
    readonly_fields = (
        "contribution",
        "provider",
        "external_reference",
        "status",
        "failure_reason",
        "created_at",
        "processed_at",
    )
