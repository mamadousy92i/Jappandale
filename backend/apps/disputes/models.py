from django.conf import settings
from django.db import models

from apps.contributions.models import Contribution


class Dispute(models.Model):
    """Litige ouvert par un financeur sur une contribution confirmée."""

    class Reason(models.TextChoices):
        PROJET_NON_CONFORME = "PROJET_NON_CONFORME", "Projet non conforme / fonds mal utilisés"
        PORTEUR_INJOIGNABLE = "PORTEUR_INJOIGNABLE", "Porteur injoignable"
        ERREUR_CONTRIBUTION = "ERREUR_CONTRIBUTION", "Contribution non voulue / erreur"
        AUTRE = "AUTRE", "Autre motif"

    class Status(models.TextChoices):
        OUVERT = "OUVERT", "Ouvert"
        EN_EXAMEN = "EN_EXAMEN", "En examen"
        ACCEPTE = "ACCEPTE", "Accepté"
        REJETE = "REJETE", "Rejeté"

    contribution = models.ForeignKey(
        Contribution,
        verbose_name="contribution",
        on_delete=models.PROTECT,
        related_name="disputes",
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="auteur du litige",
        on_delete=models.CASCADE,
        related_name="disputes",
    )
    reason = models.CharField("motif", max_length=30, choices=Reason.choices)
    details = models.TextField("précisions", max_length=1500)
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.OUVERT
    )
    admin_note = models.TextField("note interne", blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="attribué à",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_disputes",
    )
    resolved_at = models.DateTimeField("tranché le", null=True, blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        verbose_name = "litige"
        verbose_name_plural = "litiges"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Litige #{self.pk} — contribution #{self.contribution_id}"
