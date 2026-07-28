from rest_framework import serializers

from .models import Score


class ScoreSerializer(serializers.ModelSerializer):
    effective_value = serializers.IntegerField(read_only=True)

    class Meta:
        model = Score
        fields = [
            "value",
            "effective_value",
            "breakdown",
            "is_manual_override",
            "override_note",
            "computed_at",
        ]
