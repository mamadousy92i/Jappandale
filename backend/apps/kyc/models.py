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


class KycAuditLog(models.Model):
    """Journal append-only des dépôts et décisions du parcours KYC."""

    class Action(models.TextChoices):
        DOCUMENT_SUBMITTED = "DOCUMENT_SUBMITTED", "Document déposé"
        VALIDATED = "VALIDATED", "Dossier validé"
        REJECTED = "REJECTED", "Dossier rejeté"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="kyc_audit_logs",
        verbose_name="utilisateur",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="performed_kyc_actions",
        verbose_name="auteur de l'action",
    )
    document = models.ForeignKey(
        KycDocument,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="document",
    )
    action = models.CharField("action", max_length=30, choices=Action.choices)
    previous_status = models.CharField("ancien statut", max_length=20, blank=True)
    new_status = models.CharField("nouveau statut", max_length=20)
    note = models.TextField("note", blank=True)
    created_at = models.DateTimeField("effectuée le", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "événement d'audit KYC"
        verbose_name_plural = "événements d'audit KYC"

    def __str__(self):
        return f"{self.get_action_display()} — {self.user.email}"
