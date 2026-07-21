from django.contrib import admin
from django.utils import timezone

from .models import Campaign, CampaignUpdate


class CampaignUpdateInline(admin.TabularInline):
    model = CampaignUpdate
    extra = 0


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "category", "goal_amount", "status", "created_at")
    list_filter = ("status", "category")
    search_fields = ("title", "owner__email")
    readonly_fields = ("slug", "collected_amount", "created_at", "updated_at", "published_at")
    inlines = (CampaignUpdateInline,)
    actions = ("publier", "rejeter")

    @admin.action(description="Publier les campagnes sélectionnées")
    def publier(self, request, queryset):
        mis_a_jour = queryset.update(
            status=Campaign.Status.PUBLIEE,
            published_at=timezone.now(),
            moderation_note="",
        )
        self.message_user(request, f"{mis_a_jour} campagne(s) publiée(s).")

    @admin.action(description="Rejeter les campagnes sélectionnées")
    def rejeter(self, request, queryset):
        mis_a_jour = queryset.update(status=Campaign.Status.REJETEE)
        self.message_user(request, f"{mis_a_jour} campagne(s) rejetée(s).")
