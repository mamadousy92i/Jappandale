from django.contrib import admin
from django.utils import timezone
from django.contrib.auth.admin import UserAdmin

from apps.kyc.models import KycDocument

from .models import User


class KycDocumentInline(admin.TabularInline):
    model = KycDocument
    extra = 0
    readonly_fields = ("document_type", "file", "uploaded_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "kyc_status", "is_active")
    list_filter = ("role", "kyc_status", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    inlines = (KycDocumentInline,)
    actions = ("valider_kyc", "rejeter_kyc")
    readonly_fields = ("kyc_reviewed_at", "kyc_reviewed_by")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "phone")}),
        ("Rôle et permissions", {
            "fields": ("role", "is_active", "is_staff", "is_superuser", "groups"),
        }),
        ("Vérification d'identité (KYC)", {
            "fields": ("kyc_status", "kyc_review_note", "kyc_reviewed_at", "kyc_reviewed_by"),
        }),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "role", "password1", "password2"),
        }),
    )

    def _reviser_kyc(self, request, queryset, statut):
        mis_a_jour = queryset.update(
            kyc_status=statut,
            kyc_reviewed_at=timezone.now(),
            kyc_reviewed_by=request.user,
        )
        libelle = User.KycStatus(statut).label.lower()
        self.message_user(request, f"{mis_a_jour} dossier(s) marqué(s) « {libelle} ».")

    @admin.action(description="Valider le KYC des utilisateurs sélectionnés")
    def valider_kyc(self, request, queryset):
        self._reviser_kyc(request, queryset, User.KycStatus.VALIDE)

    @admin.action(description="Rejeter le KYC des utilisateurs sélectionnés")
    def rejeter_kyc(self, request, queryset):
        self._reviser_kyc(request, queryset, User.KycStatus.REJETE)
