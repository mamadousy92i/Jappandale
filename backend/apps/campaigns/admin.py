from django.contrib import admin
from django.contrib import messages
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import Campaign, CampaignAuditLog, CampaignReport, CampaignUpdate, Reward


class CampaignUpdateInline(admin.TabularInline):
    model = CampaignUpdate
    extra = 0


class RewardInline(admin.TabularInline):
    model = Reward
    extra = 0
    readonly_fields = ("quantity_claimed",)


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "location",
        "category",
        "goal_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "category")
    search_fields = ("title", "owner__email")
    readonly_fields = ("slug", "collected_amount", "created_at", "updated_at", "published_at")
    inlines = (RewardInline, CampaignUpdateInline)
    actions = ("publier", "rejeter")

    @admin.action(description="Publier les campagnes sélectionnées")
    def publier(self, request, queryset):
        mis_a_jour = 0
        for campaign in queryset:
            previous_status = campaign.status
            campaign.status = Campaign.Status.PUBLIEE
            campaign.published_at = timezone.now()
            campaign.moderation_note = ""
            campaign.save(update_fields=["status", "published_at", "moderation_note"])
            CampaignAuditLog.objects.create(
                campaign=campaign,
                actor=request.user,
                action=CampaignAuditLog.Action.PUBLISHED,
                previous_status=previous_status,
                new_status=campaign.status,
            )
            notify_user(
                recipient=campaign.owner,
                kind=Notification.Kind.CAMPAIGN_PUBLISHED,
                subject="Votre campagne est publiée",
                message=f"La campagne « {campaign.title} » est maintenant visible au public.",
                action_url=f"/campagnes/{campaign.slug}",
            )
            mis_a_jour += 1
        self.message_user(request, f"{mis_a_jour} campagne(s) publiée(s).")

    @admin.action(description="Rejeter les campagnes sélectionnées")
    def rejeter(self, request, queryset):
        rejected = 0
        skipped = []
        for campaign in queryset:
            if not campaign.moderation_note.strip():
                skipped.append(campaign.title)
                continue
            previous_status = campaign.status
            campaign.status = Campaign.Status.REJETEE
            campaign.save(update_fields=["status"])
            CampaignAuditLog.objects.create(
                campaign=campaign,
                actor=request.user,
                action=CampaignAuditLog.Action.REJECTED,
                previous_status=previous_status,
                new_status=campaign.status,
                note=campaign.moderation_note,
            )
            notify_user(
                recipient=campaign.owner,
                kind=Notification.Kind.CAMPAIGN_REJECTED,
                subject="Votre campagne doit être corrigée",
                message=f"La campagne « {campaign.title} » a été rejetée. Motif : {campaign.moderation_note}",
                action_url="/compte",
            )
            rejected += 1
        self.message_user(request, f"{rejected} campagne(s) rejetée(s).")
        if skipped:
            self.message_user(
                request,
                "Ajoutez d’abord un motif de modération : " + ", ".join(skipped),
                level=messages.WARNING,
            )


@admin.register(CampaignReport)
class CampaignReportAdmin(admin.ModelAdmin):
    list_display = ("campaign", "reporter", "reason", "status", "created_at")
    list_filter = ("status", "reason", "created_at")
    search_fields = ("campaign__title", "reporter__email", "details")
    readonly_fields = ("campaign", "reporter", "reason", "details", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False


@admin.register(CampaignAuditLog)
class CampaignAuditLogAdmin(admin.ModelAdmin):
    list_display = ("campaign", "action", "actor", "created_at")
    list_filter = ("action", "created_at")
    readonly_fields = ("campaign", "actor", "action", "previous_status", "new_status", "note", "created_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
