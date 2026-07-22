import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Gestionnaire d'utilisateurs : l'e-mail remplace le nom d'utilisateur."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Utilisateur Jappandale : identification par e-mail, rôle métier."""

    class Role(models.TextChoices):
        PORTEUR = "PORTEUR", "Porteur de projet"
        CONTRIBUTEUR = "CONTRIBUTEUR", "Contributeur"
        ADMIN = "ADMIN", "Administrateur"

    class KycStatus(models.TextChoices):
        NON_SOUMIS = "NON_SOUMIS", "Non soumis"
        EN_ATTENTE = "EN_ATTENTE", "En attente de validation"
        VALIDE = "VALIDE", "Validé"
        REJETE = "REJETE", "Rejeté"

    username = None
    email = models.EmailField("adresse e-mail", unique=True)
    role = models.CharField(
        "rôle", max_length=20, choices=Role.choices, default=Role.CONTRIBUTEUR
    )
    phone = models.CharField("téléphone", max_length=20, blank=True)
    avatar = models.ImageField(
        "photo de profil",
        upload_to="avatars/%Y/%m/",
        null=True,
        blank=True,
    )
    organization_name = models.CharField("organisation", max_length=160, blank=True)
    city = models.CharField("ville", max_length=120, blank=True)
    bio = models.TextField("présentation publique", max_length=700, blank=True)
    email_verified_at = models.DateTimeField(
        "adresse e-mail vérifiée le", null=True, blank=True
    )
    kyc_assigned_to = models.ForeignKey(
        "self",
        verbose_name="dossier KYC attribué à",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_kyc_users",
    )

    kyc_status = models.CharField(
        "statut KYC",
        max_length=20,
        choices=KycStatus.choices,
        default=KycStatus.NON_SOUMIS,
    )
    kyc_review_note = models.TextField("motif de la décision KYC", blank=True)
    kyc_reviewed_at = models.DateTimeField("date de revue KYC", null=True, blank=True)
    kyc_reviewed_by = models.ForeignKey(
        "self",
        verbose_name="revu par",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kyc_reviews",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self):
        return self.email

    @property
    def is_email_verified(self):
        return self.email_verified_at is not None


class EmailVerificationOtp(models.Model):
    """Code à usage unique envoyé uniquement par e-mail."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="email_verification_otps"
    )
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "OTP de vérification e-mail"
        verbose_name_plural = "OTP de vérification e-mail"

    def set_code(self, code):
        self.code_hash = make_password(code)

    def check_code(self, code):
        return check_password(code, self.code_hash)

    @property
    def is_valid(self):
        return (
            self.used_at is None
            and self.expires_at > timezone.now()
            and self.attempts < 5
        )


class AdminLoginOtp(models.Model):
    """Second facteur à usage unique pour les connexions administrateur."""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="admin_login_otps"
    )
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "OTP de connexion administrateur"

    def set_code(self, code):
        self.code_hash = make_password(code)

    def check_code(self, code):
        return check_password(code, self.code_hash)

    @property
    def is_valid(self):
        return (
            self.used_at is None
            and self.expires_at > timezone.now()
            and self.attempts < 5
        )
