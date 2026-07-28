from django.contrib import admin

from .models import Message, MessageReport, MessageThread


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("sender", "body", "created_at", "read_at")
    can_delete = False


@admin.register(MessageThread)
class MessageThreadAdmin(admin.ModelAdmin):
    list_display = ("campaign", "other_user", "last_message_at", "created_at")
    search_fields = ("campaign__title", "other_user__email")
    readonly_fields = ("campaign", "other_user", "last_message_at", "created_at")
    inlines = (MessageInline,)

    def has_add_permission(self, request):
        return False


@admin.register(MessageReport)
class MessageReportAdmin(admin.ModelAdmin):
    list_display = ("message", "reporter", "reason", "status", "created_at")
    list_filter = ("status", "reason")
    search_fields = ("reporter__email", "details")
    readonly_fields = ("message", "reporter", "reason", "details", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False
