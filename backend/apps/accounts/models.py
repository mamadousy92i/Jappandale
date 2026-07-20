from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


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

    username = None
    email = models.EmailField("adresse e-mail", unique=True)
    role = models.CharField(
        "rôle", max_length=20, choices=Role.choices, default=Role.CONTRIBUTEUR
    )
    phone = models.CharField("téléphone", max_length=20, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self):
        return self.email
