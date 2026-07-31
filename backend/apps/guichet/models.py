from django.conf import settings
from django.db import models


class FinancingScheme(models.Model):
    """Dispositif de financement référencé au Guichet Unique (fonds public,
    bailleur, banque partenaire, programme d'appui) avec ses critères
    d'éligibilité, utilisés pour le matching automatique avec les porteurs."""

    class ProviderType(models.TextChoices):
        FONDS_PUBLIC = "FONDS_PUBLIC", "Fonds public"
        BAILLEUR = "BAILLEUR", "Bailleur"
        BANQUE = "BANQUE", "Banque partenaire"
        PROGRAMME_APPUI = "PROGRAMME_APPUI", "Programme d'appui"

    class Status(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        PUBLIE = "PUBLIE", "Publié"
        ARCHIVE = "ARCHIVE", "Archivé"

    class DiasporaRequirement(models.TextChoices):
        INDIFFERENT = "INDIFFERENT", "Indifférent"
        DIASPORA_UNIQUEMENT = "DIASPORA_UNIQUEMENT", "Réservé à la diaspora"
        DIASPORA_EXCLUE = "DIASPORA_EXCLUE", "Diaspora non éligible"

    name = models.CharField("nom du dispositif", max_length=160)
    provider_name = models.CharField("organisme", max_length=160)
    provider_type = models.CharField(
        "type d'organisme", max_length=20, choices=ProviderType.choices
    )
    description = models.TextField("description")
    website_url = models.URLField("site web", blank=True)
    contact_email = models.EmailField("e-mail de contact", blank=True)

    # Critères d'éligibilité, utilisés par le moteur de matching.
    min_score = models.PositiveSmallIntegerField(
        "score Jappandale minimum", default=0
    )
    requires_kyc_valide = models.BooleanField(
        "identité vérifiée requise", default=True
    )
    diaspora_requirement = models.CharField(
        "condition diaspora",
        max_length=20,
        choices=DiasporaRequirement.choices,
        default=DiasporaRequirement.INDIFFERENT,
    )
    eligible_categories = models.JSONField(
        "catégories de projets éligibles", default=list, blank=True
    )
    eligible_regions = models.JSONField(
        "villes/régions éligibles", default=list, blank=True
    )
    min_goal_amount = models.PositiveIntegerField(
        "objectif de collecte minimum (FCFA)", null=True, blank=True
    )
    max_goal_amount = models.PositiveIntegerField(
        "objectif de collecte maximum (FCFA)", null=True, blank=True
    )

    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.BROUILLON
    )
    published_at = models.DateTimeField("publié le", null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="créé par",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financing_schemes_created",
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        verbose_name = "dispositif de financement"
        verbose_name_plural = "dispositifs de financement"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.provider_name}"


class SchemeReferral(models.Model):
    """Orientation d'un porteur vers un dispositif de financement — historique
    append-only permettant de suivre le taux de transformation du Guichet
    Unique (intérêt manifesté -> financement obtenu ou non)."""

    class Status(models.TextChoices):
        INTERET = "INTERET", "Intérêt manifesté"
        EN_COURS = "EN_COURS", "Contact engagé"
        ACCEPTE = "ACCEPTE", "Financement obtenu"
        REFUSE = "REFUSE", "Refusé"
        ABANDONNE = "ABANDONNE", "Abandonné"

    OPEN_STATUSES = (Status.INTERET, Status.EN_COURS)

    scheme = models.ForeignKey(
        FinancingScheme,
        verbose_name="dispositif",
        on_delete=models.CASCADE,
        related_name="referrals",
    )
    porteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="porteur",
        on_delete=models.CASCADE,
        related_name="scheme_referrals",
    )
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.INTERET
    )
    note = models.TextField("note de suivi", blank=True)
    created_at = models.DateTimeField("orienté le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="mis à jour par",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheme_referrals_updated",
    )

    class Meta:
        verbose_name = "orientation vers un dispositif"
        verbose_name_plural = "orientations vers un dispositif"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.porteur_id} → {self.scheme.name} ({self.status})"
