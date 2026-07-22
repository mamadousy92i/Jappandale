from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
import logging
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from .models import User

logger = logging.getLogger(__name__)


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
        from .services import send_email_verification_otp
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
        try:
            send_email_verification_otp(user)
        except Exception:
            logger.exception("Échec de l’envoi de l’OTP de vérification", extra={"user_id": user.id})
        return user


class UserSerializer(serializers.ModelSerializer):
    email_verified = serializers.BooleanField(source="is_email_verified", read_only=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "email", "email_verified", "first_name", "last_name", "role", "phone", "avatar", "organization_name", "city", "bio", "kyc_status"]
        read_only_fields = ["id", "email", "role", "kyc_status"]

    def validate_avatar(self, avatar):
        if avatar is None:
            return avatar
        if avatar.size > 3 * 1024 * 1024:
            raise serializers.ValidationError("La photo ne doit pas dépasser 3 Mo.")
        if avatar.image.format not in {"JPEG", "PNG", "WEBP"}:
            raise serializers.ValidationError("Formats acceptés : JPG, PNG ou WebP.")
        width, height = avatar.image.size
        if width > 4000 or height > 4000:
            raise serializers.ValidationError("La photo ne doit pas dépasser 4 000 × 4 000 pixels.")
        return avatar

    def update(self, instance, validated_data):
        previous_avatar = instance.avatar if "avatar" in validated_data else None
        instance = super().update(instance, validated_data)
        if previous_avatar and previous_avatar.name != getattr(instance.avatar, "name", ""):
            previous_avatar.storage.delete(previous_avatar.name)
        return instance


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class EmailVerificationSerializer(serializers.Serializer):
    code = serializers.RegexField(
        r"^\d{6}$",
        error_messages={"invalid": "Saisissez les six chiffres du code."},
    )


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
