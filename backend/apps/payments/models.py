from django.conf import settings
from django.db import models
from django.db.models import Q


class Payment(models.Model):
    """Tentative de paiement PayTech (contribution ou frais de dossier).

    Le `ref_command` est la référence envoyée à PayTech et rappelée dans sa
    notification serveur (IPN) : c'est elle qui permet de retrouver l'objet à
    créditer, même si PayTech renvoie plusieurs fois la même notification.
    """

    class Kind(models.TextChoices):
        CONTRIBUTION = "CONTRIBUTION", "Contribution"
        DOSSIER_FEE = "DOSSIER_FEE", "Frais de dossier"

    class Status(models.TextChoices):
        INITIEE = "INITIEE", "Initiée"
        CONFIRMEE = "CONFIRMEE", "Confirmée"
        ANNULEE = "ANNULEE", "Annulée"

    ref_command = models.CharField("référence PayTech", max_length=60, unique=True)
    kind = models.CharField("nature", max_length=20, choices=Kind.choices)
    amount = models.PositiveIntegerField("montant attendu (FCFA)")
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.INITIEE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="payeur",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    contribution = models.ForeignKey(
        "contributions.Contribution",
        verbose_name="contribution",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments",
    )
    campaign = models.ForeignKey(
        "campaigns.Campaign",
        verbose_name="campagne (frais de dossier)",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="fee_payments",
    )
    paytech_token = models.CharField("jeton PayTech", max_length=120, blank=True)
    payment_method = models.CharField("moyen de paiement", max_length=60, blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    confirmed_at = models.DateTimeField("confirmé le", null=True, blank=True)

    class Meta:
        verbose_name = "paiement PayTech"
        verbose_name_plural = "paiements PayTech"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(kind="CONTRIBUTION", contribution__isnull=False)
                    | Q(kind="DOSSIER_FEE", campaign__isnull=False)
                ),
                name="payment_target_matches_kind",
            )
        ]

    def __str__(self):
        return f"{self.get_kind_display()} {self.amount} FCFA — {self.ref_command}"
