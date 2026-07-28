from django.contrib import admin

from .models import Score, ScoringSettings


@admin.register(ScoringSettings)
class ScoringSettingsAdmin(admin.ModelAdmin):
    list_display = ("score_base", "poids_kyc", "poids_reussite_max", "penalite_litige_max")

    def has_add_permission(self, request):
        return not ScoringSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display = ("porteur", "value", "effective_value", "is_manual_override", "computed_at")
    list_filter = ("is_manual_override",)
    search_fields = ("porteur__email",)
    readonly_fields = ("porteur", "value", "breakdown", "computed_at")

    def has_add_permission(self, request):
        return False
