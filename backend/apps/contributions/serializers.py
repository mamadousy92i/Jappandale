from django.utils import timezone
from rest_framework import serializers

from apps.campaigns.models import Campaign
from apps.campaigns.services import close_finished_campaigns

from .models import Contribution, Transaction
from .providers import SimulatedPaymentProvider
from .services import create_pending_contribution


class CampaignContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ["slug", "title", "cover_image", "status"]


class TransactionSerializer(serializers.ModelSerializer):
    provider_display = serializers.CharField(source="get_provider_display", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "provider",
            "provider_display",
            "external_reference",
            "status",
            "failure_reason",
            "processed_at",
        ]


class ContributionSerializer(serializers.ModelSerializer):
    campaign = CampaignContributionSerializer(read_only=True)
    contributor_display = serializers.SerializerMethodField()
    transaction = TransactionSerializer(read_only=True)

    class Meta:
        model = Contribution
        fields = [
            "public_reference",
            "campaign",
            "amount",
            "anonymous",
            "status",
            "contributor_display",
            "created_at",
            "confirmed_at",
            "refunded_at",
            "transaction",
        ]

    def get_contributor_display(self, obj):
        if obj.anonymous:
            return "Anonyme"
        initial = f" {obj.contributor.last_name[:1].upper()}." if obj.contributor.last_name else ""
        return f"{obj.contributor.first_name or 'Contributeur'}{initial}"


class ContributionCreateSerializer(serializers.Serializer):
    campaign_slug = serializers.SlugField()
    amount = serializers.IntegerField(min_value=1000, max_value=5_000_000)
    anonymous = serializers.BooleanField(default=False)

    def validate(self, attrs):
        close_finished_campaigns()
        try:
            campaign = Campaign.objects.get(slug=attrs["campaign_slug"])
        except Campaign.DoesNotExist:
            raise serializers.ValidationError(
                {"campaign_slug": "Cette campagne n'existe pas."}
            )
        if campaign.status != Campaign.Status.PUBLIEE:
            raise serializers.ValidationError(
                {"campaign_slug": "Cette campagne n'accepte pas de contribution."}
            )
        if campaign.deadline < timezone.localdate():
            raise serializers.ValidationError(
                {"campaign_slug": "Cette campagne est arrivée à échéance."}
            )
        if campaign.owner_id == self.context["request"].user.id:
            raise serializers.ValidationError(
                {"campaign_slug": "Vous ne pouvez pas contribuer à votre propre campagne."}
            )
        attrs["campaign"] = campaign
        return attrs

    def create(self, validated_data):
        campaign = validated_data.pop("campaign")
        validated_data.pop("campaign_slug")
        return create_pending_contribution(
            contributor=self.context["request"].user,
            campaign=campaign,
            **validated_data,
        )


class PaymentConfirmationSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(
        choices=[
            SimulatedPaymentProvider.SUCCESS,
            SimulatedPaymentProvider.FAILURE,
        ]
    )
