from rest_framework import serializers

from apps.campaigns.serializers import CampaignListSerializer
from apps.guichet.serializers import FinancingSchemeSerializer

from .models import PartnerProjectInterest, ProjectDocument


class ProjectDocumentSerializer(serializers.ModelSerializer):
    campaign = serializers.SlugRelatedField(read_only=True, slug_field="slug")
    document_type_display = serializers.CharField(source="get_document_type_display", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectDocument
        fields = [
            "id",
            "campaign",
            "title",
            "document_type",
            "document_type_display",
            "shared_with_partners",
            "file_url",
            "created_at",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        return f"/api/partenaires/documents/{obj.id}/fichier/"


class ProjectDocumentCreateSerializer(serializers.ModelSerializer):
    campaign_slug = serializers.SlugField(write_only=True)

    class Meta:
        model = ProjectDocument
        fields = ["campaign_slug", "title", "document_type", "file", "shared_with_partners"]

    def validate_file(self, file):
        if file.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Le document ne doit pas dépasser 10 Mo.")
        return file


class PartnerProjectInterestSerializer(serializers.ModelSerializer):
    campaign = CampaignListSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PartnerProjectInterest
        fields = ["id", "campaign", "status", "status_display", "note", "created_at", "updated_at"]
        read_only_fields = fields


class PartnerInterestCreateSerializer(serializers.Serializer):
    campaign_slug = serializers.SlugField()
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class PartnerDashboardSerializer(serializers.Serializer):
    campaigns = CampaignListSerializer(many=True)
    interests = PartnerProjectInterestSerializer(many=True)
    schemes = FinancingSchemeSerializer(many=True)
