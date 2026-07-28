from rest_framework import serializers

from apps.contributions.models import Contribution

from .models import Dispute


class DisputeSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source="get_reason_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    contribution_reference = serializers.UUIDField(
        source="contribution.public_reference", read_only=True
    )
    campaign_title = serializers.CharField(source="contribution.campaign.title", read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "contribution_reference",
            "campaign_title",
            "reason",
            "reason_display",
            "details",
            "status",
            "status_display",
            "created_at",
            "resolved_at",
        ]


class DisputeCreateSerializer(serializers.Serializer):
    contribution_reference = serializers.UUIDField()
    reason = serializers.ChoiceField(choices=Dispute.Reason.choices)
    details = serializers.CharField(max_length=1500)

    def validate(self, attrs):
        request = self.context["request"]
        try:
            contribution = Contribution.objects.get(
                public_reference=attrs["contribution_reference"], contributor=request.user
            )
        except Contribution.DoesNotExist:
            raise serializers.ValidationError(
                {"contribution_reference": "Cette contribution n'existe pas."}
            )
        if contribution.status != Contribution.Status.CONFIRMEE:
            raise serializers.ValidationError(
                {"contribution_reference": "Seule une contribution confirmée peut faire l'objet d'un litige."}
            )
        if Dispute.objects.filter(
            contribution=contribution,
            status__in=[Dispute.Status.OUVERT, Dispute.Status.EN_EXAMEN],
        ).exists():
            raise serializers.ValidationError(
                {"contribution_reference": "Un litige est déjà en cours pour cette contribution."}
            )
        attrs["contribution"] = contribution
        return attrs
