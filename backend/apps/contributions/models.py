import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.campaigns.models import Campaign


class PlatformSettings(models.Model):
    """Réglages globaux de la plateforme (un seul enregistrement, pk=1)."""

    commission_rate = models.DecimalField(
        "taux de commission",
        max_digits=4,
        decimal_places=2,
        default=Decimal("0.05"),
    )

    class Meta:
        verbose_name = "réglages de la plateforme"
        verbose_name_plural = "réglages de la plateforme"

    def __str__(self):
        return f"Commission : {self.commission_rate * 100:.0f} %"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Contribution(models.Model):
    """Intention de don d'un utilisateur envers une campagne."""

    class Status(models.TextChoices):
        INITIEE = "INITIEE", "Initiée"
        CONFIRMEE = "CONFIRMEE", "Confirmée"
        ECHOUEE = "ECHOUEE", "Échouée"
        REMBOURSEE = "REMBOURSEE", "Remboursée"

    public_reference = models.UUIDField(
        "référence publique", default=uuid.uuid4, unique=True, editable=False
    )
    contributor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="contributeur",
        on_delete=models.PROTECT,
        related_name="contributions",
    )
    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.PROTECT,
        related_name="contributions",
    )
    reward = models.ForeignKey(
        "campaigns.Reward",
        verbose_name="contrepartie",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="contributions",
    )
    amount = models.PositiveBigIntegerField("montant (FCFA)")
    anonymous = models.BooleanField("contribution anonyme", default=False)
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.INITIEE
    )
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    confirmed_at = models.DateTimeField("confirmée le", null=True, blank=True)
    refunded_at = models.DateTimeField("remboursée le", null=True, blank=True)

    class Meta:
        verbose_name = "contribution"
        verbose_name_plural = "contributions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["campaign", "status"]),
            models.Index(fields=["contributor", "status"]),
        ]

    def __str__(self):
        return f"{self.amount} FCFA — {self.campaign.title}"


class Transaction(models.Model):
    """Tentative de paiement associée à une contribution."""

    class Provider(models.TextChoices):
        SIMULATED = "SIMULATED", "Contribution Jappandale"

    class Status(models.TextChoices):
        INITIEE = "INITIEE", "Initiée"
        CONFIRMEE = "CONFIRMEE", "Confirmée"
        ECHOUEE = "ECHOUEE", "Échouée"
        REMBOURSEE = "REMBOURSEE", "Remboursée"

    contribution = models.OneToOneField(
        Contribution,
        verbose_name="contribution",
        on_delete=models.PROTECT,
        related_name="transaction",
    )
    provider = models.CharField(
        "fournisseur",
        max_length=20,
        choices=Provider.choices,
        default=Provider.SIMULATED,
    )
    external_reference = models.UUIDField(
        "référence fournisseur", default=uuid.uuid4, unique=True, editable=False
    )
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.INITIEE
    )
    failure_reason = models.CharField("motif d'échec", max_length=255, blank=True)
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    processed_at = models.DateTimeField("traitée le", null=True, blank=True)

    class Meta:
        verbose_name = "transaction"
        verbose_name_plural = "transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_provider_display()} — {self.external_reference}"
