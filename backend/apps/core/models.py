from django.conf import settings
from django.db import models


class SupportRequest(models.Model):
    """Demande d'assistance envoyée depuis le formulaire public."""

    class Status(models.TextChoices):
        NOUVELLE = "NOUVELLE", "Nouvelle"
        EN_COURS = "EN_COURS", "En cours"
        RESOLUE = "RESOLUE", "Résolue"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="support_requests",
        null=True,
        blank=True,
    )
    name = models.CharField("nom", max_length=150)
    email = models.EmailField("adresse e-mail")
    subject = models.CharField("objet", max_length=160)
    message = models.TextField("message", max_length=3000)
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.NOUVELLE
    )
    admin_note = models.TextField("note interne", blank=True)
    created_at = models.DateTimeField("reçue le", auto_now_add=True)
    updated_at = models.DateTimeField("mise à jour le", auto_now=True)

    class Meta:
        verbose_name = "demande d'assistance"
        verbose_name_plural = "demandes d'assistance"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subject} — {self.email}"
