from django.conf import settings
from django.db import models

from apps.campaigns.models import Campaign


class ProjectDocument(models.Model):
    """Document ajouté au dossier d'un projet, partageable avec les partenaires."""

    class DocumentType(models.TextChoices):
        BUSINESS_PLAN = "BUSINESS_PLAN", "Business plan"
        PITCH_DECK = "PITCH_DECK", "Pitch deck"
        BUDGET = "BUDGET", "Budget / prévisions"
        JUSTIFICATIF = "JUSTIFICATIF", "Justificatif"
        AUTRE = "AUTRE", "Autre document"

    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name="project_documents", verbose_name="projet"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_project_documents",
        verbose_name="téléversé par",
    )
    title = models.CharField("titre", max_length=140)
    document_type = models.CharField(
        "type", max_length=25, choices=DocumentType.choices, default=DocumentType.AUTRE
    )
    file = models.FileField("fichier", upload_to="project-documents/%Y/%m/")
    shared_with_partners = models.BooleanField(
        "partageable avec les partenaires financiers", default=True
    )
    created_at = models.DateTimeField("téléversé le", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "document de projet"
        verbose_name_plural = "documents de projet"

    def __str__(self):
        return f"{self.title} — {self.campaign.title}"


class PartnerProjectInterest(models.Model):
    """Marque l'intérêt d'un partenaire pour une campagne publiée."""

    class Status(models.TextChoices):
        INTERESSE = "INTERESSE", "Intéressé"
        EN_COURS = "EN_COURS", "En cours d'étude"
        CONTACTE = "CONTACTE", "Porteur contacté"
        CLOTURE = "CLOTURE", "Clôturé"

    partner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_interests",
        verbose_name="partenaire",
    )
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name="partner_interests", verbose_name="projet"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INTERESSE)
    note = models.TextField("note interne", max_length=1000, blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["partner", "campaign"], name="unique_partner_campaign_interest")
        ]
        verbose_name = "intérêt partenaire"
        verbose_name_plural = "intérêts partenaires"

    def __str__(self):
        return f"{self.partner.email} — {self.campaign.title}"
