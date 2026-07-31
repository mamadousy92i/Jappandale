from rest_framework import serializers

from .models import Score, ScoringSettings


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


class ScoringSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringSettings
        fields = [
            "score_base",
            "poids_kyc",
            "poids_anciennete_max",
            "poids_activite_max",
            "poids_reussite_max",
            "poids_montant_max",
            "penalite_litige_max",
            "penalite_signalement_unite",
            "penalite_signalement_max",
            "penalite_campagne_rejetee_unite",
            "penalite_campagne_rejetee_max",
        ]
