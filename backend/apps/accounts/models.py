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
        extra_fields.setdefault("account_status", User.AccountStatus.VALIDE)
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

    class AccountStatus(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente de validation"
        VALIDE = "VALIDE", "Validé"
        SUSPENDU = "SUSPENDU", "Suspendu"
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
    is_diaspora = models.BooleanField(
        "réside à l'étranger (diaspora)", default=False
    )
    country = models.CharField("pays de résidence", max_length=100, blank=True)
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

    account_status = models.CharField(
        "statut du compte",
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.EN_ATTENTE,
    )
    account_status_note = models.TextField("motif de la dernière décision", blank=True)
    account_status_changed_at = models.DateTimeField(
        "statut de compte modifié le", null=True, blank=True
    )
    account_status_changed_by = models.ForeignKey(
        "self",
        verbose_name="statut modifié par",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="account_status_changes",
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


class UserAuditLog(models.Model):
    """Journal append-only des actions administratives sur un compte utilisateur."""

    class Action(models.TextChoices):
        ROLE_CHANGED = "ROLE_CHANGED", "Rôle modifié"
        ACCOUNT_STATUS_CHANGED = "ACCOUNT_STATUS_CHANGED", "Statut de compte modifié"

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="account_audit_logs",
        verbose_name="utilisateur",
    )
    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_user_audits",
        verbose_name="administrateur",
    )
    action = models.CharField("action", max_length=30, choices=Action.choices)
    previous_value = models.CharField("valeur précédente", max_length=50, blank=True)
    new_value = models.CharField("nouvelle valeur", max_length=50, blank=True)
    note = models.TextField("note", blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "journal d'audit utilisateur"
        verbose_name_plural = "journaux d'audit utilisateur"

    def __str__(self):
        return f"{self.get_action_display()} — {self.user_id}"
