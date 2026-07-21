from django.conf import settings
from django.db import models


class KycDocument(models.Model):
    """Pièce justificative téléversée par un utilisateur pour son KYC."""

    class DocumentType(models.TextChoices):
        CNI = "CNI", "Carte nationale d'identité"
        PASSEPORT = "PASSEPORT", "Passeport"
        JUSTIFICATIF_ACTIVITE = "JUSTIFICATIF_ACTIVITE", "Justificatif d'activité"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="utilisateur",
        on_delete=models.CASCADE,
        related_name="kyc_documents",
    )
    document_type = models.CharField(
        "type de pièce", max_length=30, choices=DocumentType.choices
    )
    file = models.FileField("fichier", upload_to="kyc/%Y/%m/")
    uploaded_at = models.DateTimeField("téléversé le", auto_now_add=True)

    class Meta:
        verbose_name = "document KYC"
        verbose_name_plural = "documents KYC"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.get_document_type_display()} — {self.user.email}"
