from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(
        choices=[User.Role.PORTEUR, User.Role.CONTRIBUTEUR],
        default=User.Role.CONTRIBUTEUR,
    )
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    class Meta:
        model = User
        fields = ["id", "email", "password", "first_name", "last_name", "role", "phone"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        from apps.notifications.models import Notification
        from apps.notifications.services import notify_user

        notify_user(
            recipient=user,
            kind=Notification.Kind.ACCOUNT_CREATED,
            subject="Bienvenue sur Jappandale",
            message=(
                f"Bonjour {user.first_name}, votre compte Jappandale est créé. "
                "Vous pouvez maintenant compléter votre vérification d’identité."
            ),
            action_url="/compte",
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "phone", "kyc_status"]
        read_only_fields = ["id", "email", "role", "kyc_status"]


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = get_user_model().objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError("Ce lien de réinitialisation est invalide ou expiré.")
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("Ce lien de réinitialisation est invalide ou expiré.")
        validate_password(attrs["new_password"], user=user)
        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
