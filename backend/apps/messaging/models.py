from django.conf import settings
from django.db import models

from apps.campaigns.models import Campaign


class MessageThread(models.Model):
    """Conversation entre le porteur d'une campagne et un autre utilisateur."""

    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.PROTECT,
        related_name="message_threads",
    )
    other_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="autre participant",
        on_delete=models.PROTECT,
        related_name="message_threads",
    )
    last_message_at = models.DateTimeField("dernier message le", null=True, blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)

    class Meta:
        verbose_name = "conversation"
        verbose_name_plural = "conversations"
        ordering = ["-last_message_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["campaign", "other_user"], name="unique_campaign_other_user_thread"
            )
        ]

    def __str__(self):
        return f"{self.campaign.title} — {self.other_user.email}"


class Message(models.Model):
    """Message échangé au sein d'une conversation."""

    thread = models.ForeignKey(
        MessageThread, on_delete=models.CASCADE, related_name="messages", verbose_name="conversation"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="auteur",
        on_delete=models.PROTECT,
        related_name="sent_messages",
    )
    body = models.TextField("message", max_length=3000)
    created_at = models.DateTimeField("envoyé le", auto_now_add=True)
    read_at = models.DateTimeField("lu le", null=True, blank=True)

    class Meta:
        verbose_name = "message"
        verbose_name_plural = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.email} — {self.created_at:%d/%m/%Y %H:%M}"


class MessageReport(models.Model):
    """Signalement traçable d'un message par un participant du fil."""

    class Reason(models.TextChoices):
        SPAM = "SPAM", "Spam ou sollicitation"
        HARCELEMENT = "HARCELEMENT", "Harcèlement"
        CONTENU_INAPPROPRIE = "CONTENU_INAPPROPRIE", "Contenu inapproprié"
        TENTATIVE_CONTOURNEMENT = "TENTATIVE_CONTOURNEMENT", "Tentative de contournement de la plateforme"
        AUTRE = "AUTRE", "Autre motif"

    class Status(models.TextChoices):
        NOUVEAU = "NOUVEAU", "Nouveau"
        EN_COURS = "EN_COURS", "En cours d’examen"
        RESOLU = "RESOLU", "Résolu"
        CLASSE = "CLASSE", "Classé sans suite"

    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="reports", verbose_name="message"
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reports",
        verbose_name="auteur du signalement",
    )
    reason = models.CharField("motif", max_length=30, choices=Reason.choices)
    details = models.TextField("précisions", max_length=1500)
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.NOUVEAU
    )
    admin_note = models.TextField("note interne", blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_message_reports",
        verbose_name="attribué à",
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        verbose_name = "signalement de message"
        verbose_name_plural = "signalements de messages"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Signalement — message #{self.message_id}"
