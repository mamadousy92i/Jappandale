from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Message persistant envoyé à un utilisateur et, si possible, par e-mail."""

    class Kind(models.TextChoices):
        ACCOUNT_CREATED = "ACCOUNT_CREATED", "Compte créé"
        KYC_VALIDATED = "KYC_VALIDATED", "KYC validé"
        KYC_REJECTED = "KYC_REJECTED", "KYC rejeté"
        CAMPAIGN_PUBLISHED = "CAMPAIGN_PUBLISHED", "Campagne publiée"
        CAMPAIGN_REJECTED = "CAMPAIGN_REJECTED", "Campagne rejetée"
        CONTRIBUTION_CONFIRMED = "CONTRIBUTION_CONFIRMED", "Contribution confirmée"
        CONTRIBUTION_RECEIVED = "CONTRIBUTION_RECEIVED", "Contribution reçue"
        GOAL_REACHED = "GOAL_REACHED", "Objectif atteint"

    class DeliveryStatus(models.TextChoices):
        PENDING = "PENDING", "En attente"
        SENT = "SENT", "Envoyée"
        FAILED = "FAILED", "Échec"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="destinataire",
    )
    kind = models.CharField("type", max_length=30, choices=Kind.choices)
    subject = models.CharField("objet", max_length=160)
    message = models.TextField("message")
    action_url = models.CharField("lien d'action", max_length=255, blank=True)
    delivery_status = models.CharField(
        "statut e-mail",
        max_length=10,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
    )
    delivery_error = models.CharField("erreur d'envoi", max_length=255, blank=True)
    is_read = models.BooleanField("lue", default=False)
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    sent_at = models.DateTimeField("envoyée le", null=True, blank=True)
    read_at = models.DateTimeField("lue le", null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read", "created_at"])]
        verbose_name = "notification"
        verbose_name_plural = "notifications"

    def __str__(self):
        return f"{self.subject} — {self.recipient.email}"
