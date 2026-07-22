from django.utils import timezone
from rest_framework import serializers

from .models import Campaign, CampaignReport, CampaignUpdate


class CampaignUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignUpdate
        fields = ["id", "title", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class CampaignReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignReport
        fields = ["id", "reason", "details", "created_at"]
        read_only_fields = ["id", "created_at"]


class OwnerSerializer(serializers.Serializer):
    """Informations publiques limitées sur le porteur d'une campagne."""

    first_name = serializers.CharField()
    last_name = serializers.CharField()
    organization_name = serializers.CharField()
    city = serializers.CharField()
    bio = serializers.CharField()


class CampaignListSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    days_left = serializers.IntegerField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "location",
            "category",
            "category_display",
            "goal_amount",
            "collected_amount",
            "cover_image",
            "deadline",
            "status",
            "status_display",
            "moderation_note",
            "suspension_note",
            "progress_percent",
            "days_left",
        ]


class CampaignDetailSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    days_left = serializers.IntegerField(read_only=True)
    owner = OwnerSerializer(read_only=True)
    updates = CampaignUpdateSerializer(many=True, read_only=True)
    recent_contributors = serializers.SerializerMethodField()

    def get_recent_contributors(self, obj):
        from apps.contributions.models import Contribution

        contributions = (
            obj.contributions.filter(status=Contribution.Status.CONFIRMEE)
            .select_related("contributor")
            .order_by("-confirmed_at")[:10]
        )
        results = []
        for contribution in contributions:
            if contribution.anonymous:
                display_name = "Anonyme"
            else:
                first_name = contribution.contributor.first_name or "Contributeur"
                last_name = contribution.contributor.last_name
                display_name = (
                    f"{first_name} {last_name[:1].upper()}." if last_name else first_name
                )
            results.append({
                "display_name": display_name,
                "amount": contribution.amount,
                "confirmed_at": contribution.confirmed_at,
            })
        return results

    class Meta:
        model = Campaign
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "description",
            "location",
            "beneficiaries",
            "funding_plan",
            "project_timeline",
            "category",
            "category_display",
            "goal_amount",
            "collected_amount",
            "cover_image",
            "deadline",
            "status",
            "status_display",
            "moderation_note",
            "suspension_note",
            "progress_percent",
            "days_left",
            "owner",
            "updates",
            "recent_contributors",
            "created_at",
            "published_at",
        ]
        read_only_fields = fields


class CampaignWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "description",
            "location",
            "beneficiaries",
            "funding_plan",
            "project_timeline",
            "category",
            "goal_amount",
            "cover_image",
            "deadline",
            "status",
        ]
        read_only_fields = ["id", "slug", "status"]

    def validate_goal_amount(self, value):
        if value < 1000:
            raise serializers.ValidationError("L'objectif doit être d'au moins 1 000 FCFA.")
        return value

    def validate_deadline(self, value):
        if value <= timezone.localdate():
            raise serializers.ValidationError(
                "L'échéance doit être postérieure à la date du jour."
            )
        return value
