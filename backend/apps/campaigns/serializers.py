from rest_framework import serializers

from .models import Campaign, CampaignUpdate


class CampaignUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignUpdate
        fields = ["id", "title", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class OwnerSerializer(serializers.Serializer):
    """Informations publiques limitées sur le porteur d'une campagne."""

    first_name = serializers.CharField()
    last_name = serializers.CharField()


class CampaignListSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    days_left = serializers.IntegerField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "category",
            "category_display",
            "goal_amount",
            "collected_amount",
            "cover_image",
            "deadline",
            "status",
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

    class Meta:
        model = Campaign
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "description",
            "category",
            "category_display",
            "goal_amount",
            "collected_amount",
            "cover_image",
            "deadline",
            "status",
            "status_display",
            "moderation_note",
            "progress_percent",
            "days_left",
            "owner",
            "updates",
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
