from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone

from apps.kyc.models import KycDocument
from apps.kyc.services import missing_required_documents
from apps.kyc.models import KycAuditLog
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

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
    list_display = ("email", "first_name", "last_name", "role", "is_email_verified", "kyc_status", "is_active")
    list_filter = ("role", "kyc_status", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    inlines = (KycDocumentInline,)
    actions = ("valider_kyc", "rejeter_kyc")
    readonly_fields = ("email_verified_at", "kyc_reviewed_at", "kyc_reviewed_by")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "phone", "email_verified_at")}),
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
        mis_a_jour = 0
        for user in queryset:
            previous_status = user.kyc_status
            user.kyc_status = statut
            user.kyc_reviewed_at = timezone.now()
            user.kyc_reviewed_by = request.user
            user.save(
                update_fields=["kyc_status", "kyc_reviewed_at", "kyc_reviewed_by"]
            )
            action = (
                KycAuditLog.Action.VALIDATED
                if statut == User.KycStatus.VALIDE
                else KycAuditLog.Action.REJECTED
            )
            KycAuditLog.objects.create(
                user=user,
                actor=request.user,
                action=action,
                previous_status=previous_status,
                new_status=statut,
                note=user.kyc_review_note,
            )
            validated = statut == User.KycStatus.VALIDE
            notify_user(
                recipient=user,
                kind=(
                    Notification.Kind.KYC_VALIDATED
                    if validated
                    else Notification.Kind.KYC_REJECTED
                ),
                subject=(
                    "Votre identité a été validée"
                    if validated
                    else "Votre dossier KYC doit être complété"
                ),
                message=(
                    "Votre vérification d’identité est validée. Vous pouvez utiliser les fonctionnalités de contribution."
                    if validated
                    else f"Votre dossier a été rejeté. Motif : {user.kyc_review_note or 'consultez votre espace personnel.'}"
                ),
                action_url="/compte",
            )
            mis_a_jour += 1
        libelle = User.KycStatus(statut).label.lower()
        self.message_user(request, f"{mis_a_jour} dossier(s) marqué(s) « {libelle} ».")

    @admin.action(description="Valider le KYC des utilisateurs sélectionnés")
    def valider_kyc(self, request, queryset):
        valid_ids = []
        skipped = []
        for user in queryset.prefetch_related("kyc_documents"):
            missing = missing_required_documents(user)
            if missing:
                skipped.append(f"{user.email} : {', '.join(missing)}")
            else:
                valid_ids.append(user.pk)

        if valid_ids:
            self._reviser_kyc(
                request,
                User.objects.filter(pk__in=valid_ids),
                User.KycStatus.VALIDE,
            )
        if skipped:
            self.message_user(
                request,
                "Dossiers non validés — " + " ; ".join(skipped),
                level=messages.WARNING,
            )

    @admin.action(description="Rejeter le KYC des utilisateurs sélectionnés")
    def rejeter_kyc(self, request, queryset):
        self._reviser_kyc(request, queryset, User.KycStatus.REJETE)
