from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("ref_command", "kind", "amount", "status", "user", "payment_method", "created_at")
    list_filter = ("kind", "status")
    search_fields = ("ref_command", "user__email", "paytech_token")
    readonly_fields = [field.name for field in Payment._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
