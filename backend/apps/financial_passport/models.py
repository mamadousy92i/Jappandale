import uuid

from django.conf import settings
from django.db import models


class PassportExport(models.Model):
    """Export figé (immuable) du Passeport Financier d'un porteur."""

    porteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="porteur",
        on_delete=models.CASCADE,
        related_name="passport_exports",
    )
    verification_id = models.UUIDField(
        "identifiant de vérification", default=uuid.uuid4, unique=True, editable=False
    )
    snapshot = models.JSONField("données figées à l'export")
    generated_at = models.DateTimeField("généré le", auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]
        verbose_name = "export du Passeport Financier"
        verbose_name_plural = "exports du Passeport Financier"

    def __str__(self):
        return f"Passeport — {self.porteur_id} — {self.verification_id}"
