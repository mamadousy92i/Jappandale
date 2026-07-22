from rest_framework import serializers

from apps.campaigns.models import CampaignReport
from apps.core.models import SupportRequest


class KycDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["VALIDE", "REJETE"])
    note = serializers.CharField(required=False, allow_blank=True, max_length=1500)

    def validate(self, attrs):
        if attrs["decision"] == "REJETE" and not attrs.get("note", "").strip():
            raise serializers.ValidationError({"note": "Expliquez les corrections attendues."})
        return attrs


class CampaignDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["PUBLIEE", "REJETEE"])
    note = serializers.CharField(required=False, allow_blank=True, max_length=1500)

    def validate(self, attrs):
        if attrs["decision"] == "REJETEE" and not attrs.get("note", "").strip():
            raise serializers.ValidationError({"note": "Indiquez le motif du refus."})
        return attrs


class ReportReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=CampaignReport.Status.choices)
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class SupportReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SupportRequest.Status.choices)
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=2000)
