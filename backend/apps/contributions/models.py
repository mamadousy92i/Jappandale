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

    class PayoutStatus(models.TextChoices):
        EN_SEQUESTRE = "EN_SEQUESTRE", "En séquestre"
        REVERSEE = "REVERSEE", "Reversée"

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
    payout_status = models.CharField(
        "statut de reversement",
        max_length=20,
        choices=PayoutStatus.choices,
        default=PayoutStatus.EN_SEQUESTRE,
    )
    commission_rate_applied = models.DecimalField(
        "taux de commission appliqué", max_digits=4, decimal_places=2, null=True, blank=True
    )
    commission_amount = models.PositiveIntegerField(
        "montant de la commission (FCFA)", null=True, blank=True
    )
    net_amount = models.PositiveIntegerField(
        "montant net pour le porteur (FCFA)", null=True, blank=True
    )
    payout_released_at = models.DateTimeField("reversée le", null=True, blank=True)
    payout_released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="reversée par",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="released_payouts",
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
            models.Index(fields=["campaign", "payout_status"]),
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


class PayoutAuditLog(models.Model):
    """Historique append-only des reversements déclenchés par campagne."""

    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.PROTECT,
        related_name="payout_audit_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="administrateur",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_payout_releases",
    )
    contributions_count = models.PositiveIntegerField("nombre de contributions reversées")
    gross_amount = models.PositiveIntegerField("montant brut reversé (FCFA)")
    commission_amount = models.PositiveIntegerField("commission totale (FCFA)")
    net_amount = models.PositiveIntegerField("montant net reversé (FCFA)")
    created_at = models.DateTimeField("effectué le", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "événement de reversement"
        verbose_name_plural = "événements de reversement"

    def __str__(self):
        return f"Reversement — {self.campaign.title} — {self.created_at:%d/%m/%Y}"
