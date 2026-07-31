from rest_framework import serializers

from .models import FinancingScheme, SchemeReferral


class FinancingSchemeSerializer(serializers.ModelSerializer):
    """Représentation publique d'un dispositif, telle que vue par un porteur."""

    provider_type_display = serializers.CharField(
        source="get_provider_type_display", read_only=True
    )

    class Meta:
        model = FinancingScheme
        fields = [
            "id",
            "name",
            "provider_name",
            "provider_type",
            "provider_type_display",
            "description",
            "website_url",
            "contact_email",
            "min_score",
            "requires_kyc_valide",
            "diaspora_requirement",
            "eligible_categories",
            "eligible_regions",
            "min_goal_amount",
            "max_goal_amount",
            "status",
            "published_at",
            "created_at",
        ]
        read_only_fields = fields


class FinancingSchemeWriteSerializer(serializers.ModelSerializer):
    """Utilisé par le back-office pour créer/modifier un dispositif."""

    class Meta:
        model = FinancingScheme
        fields = [
            "id",
            "name",
            "provider_name",
            "provider_type",
            "description",
            "website_url",
            "contact_email",
            "min_score",
            "requires_kyc_valide",
            "diaspora_requirement",
            "eligible_categories",
            "eligible_regions",
            "min_goal_amount",
            "max_goal_amount",
            "status",
        ]
        read_only_fields = ["id"]

    def validate_min_score(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Le score minimum doit être compris entre 0 et 100.")
        return value

    def validate(self, attrs):
        min_amount = attrs.get(
            "min_goal_amount", self.instance.min_goal_amount if self.instance else None
        )
        max_amount = attrs.get(
            "max_goal_amount", self.instance.max_goal_amount if self.instance else None
        )
        if min_amount is not None and max_amount is not None and min_amount > max_amount:
            raise serializers.ValidationError(
                {"max_goal_amount": ["Le montant maximum doit être supérieur au montant minimum."]}
            )
        return attrs


class EligibleSchemeSerializer(FinancingSchemeSerializer):
    """Dispositif enrichi de l'évaluation d'éligibilité pour le porteur courant."""

    eligible = serializers.BooleanField(read_only=True)
    ineligibility_reasons = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )

    class Meta(FinancingSchemeSerializer.Meta):
        fields = FinancingSchemeSerializer.Meta.fields + ["eligible", "ineligibility_reasons"]
        read_only_fields = fields


class SchemeReferralSerializer(serializers.ModelSerializer):
    scheme = FinancingSchemeSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SchemeReferral
        fields = ["id", "scheme", "status", "status_display", "note", "created_at", "updated_at"]
        read_only_fields = fields


class SchemeReferralAdminSerializer(serializers.ModelSerializer):
    """Vue back-office d'une orientation, avec l'identité du porteur."""

    scheme_name = serializers.CharField(source="scheme.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    porteur = serializers.SerializerMethodField()

    class Meta:
        model = SchemeReferral
        fields = [
            "id",
            "scheme",
            "scheme_name",
            "porteur",
            "status",
            "status_display",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "scheme", "scheme_name", "porteur", "created_at", "updated_at"]

    def get_porteur(self, obj):
        return {
            "id": obj.porteur_id,
            "name": f"{obj.porteur.first_name} {obj.porteur.last_name}".strip() or obj.porteur.email,
            "email": obj.porteur.email,
        }
