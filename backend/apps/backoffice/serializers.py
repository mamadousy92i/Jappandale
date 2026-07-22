from rest_framework import serializers

from apps.campaigns.models import CampaignReport
from apps.core.models import SupportRequest
from apps.accounts.models import User


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
    assigned_to = serializers.IntegerField(required=False, allow_null=True)


class SupportReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SupportRequest.Status.choices)
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    assigned_to = serializers.IntegerField(required=False, allow_null=True)


class WorkAssignmentSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["kyc", "campaign", "report", "support"])
    object_id = serializers.IntegerField()
    admin_id = serializers.IntegerField(required=False, allow_null=True)


class CampaignWorkflowSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["SUSPEND", "REACTIVATE", "CLOSE"])
    note = serializers.CharField(required=False, allow_blank=True, max_length=1500)

    def validate(self, attrs):
        if attrs["action"] in ("SUSPEND", "CLOSE") and not attrs.get("note", "").strip():
            raise serializers.ValidationError({"note": "Un motif clair est obligatoire."})
        return attrs


class SupportReplySerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=180)
    message = serializers.CharField(max_length=5000)


class UserManagementSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.Role.choices, required=False)
    is_active = serializers.BooleanField(required=False)
