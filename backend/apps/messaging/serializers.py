from rest_framework import serializers

from apps.campaigns.models import Campaign

from .models import Message, MessageReport, MessageThread


def _display_name(user):
    initial = f" {user.last_name[:1].upper()}." if user.last_name else ""
    return f"{user.first_name or 'Utilisateur'}{initial}"


class ThreadCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ["slug", "title"]


class ThreadSerializer(serializers.ModelSerializer):
    campaign = ThreadCampaignSerializer(read_only=True)
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "campaign",
            "other_participant",
            "last_message",
            "unread_count",
            "created_at",
        ]

    def get_other_participant(self, obj):
        request_user = self.context["request"].user
        other = obj.campaign.owner if request_user.id == obj.other_user_id else obj.other_user
        return {"id": other.id, "name": _display_name(other)}

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        if not message:
            return None
        return {
            "body": message.body,
            "created_at": message.created_at,
            "sender_id": message.sender_id,
        }

    def get_unread_count(self, obj):
        request_user = self.context["request"].user
        return obj.messages.filter(read_at__isnull=True).exclude(sender_id=request_user.id).count()


class ThreadCreateSerializer(serializers.Serializer):
    campaign_slug = serializers.SlugField()
    body = serializers.CharField(max_length=3000)

    def validate(self, attrs):
        try:
            campaign = Campaign.objects.get(slug=attrs["campaign_slug"])
        except Campaign.DoesNotExist:
            raise serializers.ValidationError(
                {"campaign_slug": "Cette campagne n'existe pas."}
            )
        if campaign.owner_id == self.context["request"].user.id:
            raise serializers.ValidationError(
                {"campaign_slug": "Vous ne pouvez pas vous écrire à vous-même."}
            )
        if campaign.status not in (Campaign.Status.PUBLIEE, Campaign.Status.CLOTUREE):
            raise serializers.ValidationError(
                {"campaign_slug": "Cette campagne n'accepte pas de messages."}
            )
        attrs["campaign"] = campaign
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    is_mine = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender_name", "is_mine", "body", "created_at", "read_at"]

    def get_is_mine(self, obj):
        return obj.sender_id == self.context["request"].user.id

    def get_sender_name(self, obj):
        return _display_name(obj.sender)


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=3000)


class MessageReportCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=MessageReport.Reason.choices)
    details = serializers.CharField(max_length=1500)
