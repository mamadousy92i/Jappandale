from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Campaign(models.Model):
    """Campagne de collecte de dons portée par un utilisateur validé."""

    class CampaignType(models.TextChoices):
        DON_LIBRE = "DON_LIBRE", "Don libre"
        DON_CONTREPARTIE = "DON_CONTREPARTIE", "Don avec contrepartie"

    class Category(models.TextChoices):
        ARTISANAT = "ARTISANAT", "Artisanat"
        COMMERCE = "COMMERCE", "Commerce"
        AGRICULTURE = "AGRICULTURE", "Agriculture"
        EDUCATION = "EDUCATION", "Éducation"
        SANTE = "SANTE", "Santé"
        TECHNOLOGIE = "TECHNOLOGIE", "Technologie"
        CULTURE = "CULTURE", "Culture"
        AUTRE = "AUTRE", "Autre"

    class Status(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        EN_MODERATION = "EN_MODERATION", "En modération"
        PUBLIEE = "PUBLIEE", "Publiée"
        REJETEE = "REJETEE", "Rejetée"
        SUSPENDUE = "SUSPENDUE", "Suspendue"
        CLOTUREE = "CLOTUREE", "Clôturée"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="porteur",
        on_delete=models.CASCADE,
        related_name="campaigns",
    )
    title = models.CharField("titre", max_length=120)
    slug = models.SlugField("identifiant", max_length=140, unique=True, blank=True)
    summary = models.CharField("accroche", max_length=200)
    description = models.TextField("description")
    campaign_type = models.CharField(
        "type de campagne",
        max_length=20,
        choices=CampaignType.choices,
        default=CampaignType.DON_LIBRE,
    )
    location = models.CharField("localisation", max_length=120, blank=True)
    beneficiaries = models.CharField("bénéficiaires attendus", max_length=180, blank=True)
    funding_plan = models.TextField("utilisation prévue des fonds", blank=True)
    project_timeline = models.TextField("calendrier prévisionnel", blank=True)
    category = models.CharField(
        "catégorie", max_length=20, choices=Category.choices, default=Category.AUTRE
    )
    goal_amount = models.PositiveIntegerField("objectif (FCFA)")
    collected_amount = models.PositiveIntegerField("montant collecté (FCFA)", default=0)
    cover_image = models.ImageField(
        "image de couverture", upload_to="campaigns/%Y/%m/", blank=True
    )
    deadline = models.DateField("échéance")
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.BROUILLON
    )
    moderation_note = models.TextField("motif de modération", blank=True)
    moderation_assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_campaigns",
        verbose_name="modération attribuée à",
    )
    suspension_note = models.TextField("motif de suspension", blank=True)
    suspended_at = models.DateTimeField("suspendue le", null=True, blank=True)
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    updated_at = models.DateTimeField("mise à jour le", auto_now=True)
    published_at = models.DateTimeField("publiée le", null=True, blank=True)

    class Meta:
        verbose_name = "campagne"
        verbose_name_plural = "campagnes"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()
        super().save(*args, **kwargs)

    def _generate_unique_slug(self):
        base = slugify(self.title) or "campagne"
        slug = base
        suffix = 2
        while Campaign.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    @property
    def progress_percent(self):
        if not self.goal_amount:
            return 0
        return min(round(self.collected_amount / self.goal_amount * 100), 100)

    @property
    def days_left(self):
        return max((self.deadline - timezone.localdate()).days, 0)


class Reward(models.Model):
    """Contrepartie proposée par le porteur pour une campagne « don avec contrepartie »."""

    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.CASCADE,
        related_name="rewards",
    )
    title = models.CharField("titre", max_length=120)
    description = models.TextField("description", blank=True)
    minimum_amount = models.PositiveIntegerField("montant minimum (FCFA)")
    quantity_limit = models.PositiveIntegerField(
        "quantité disponible", null=True, blank=True
    )
    quantity_claimed = models.PositiveIntegerField("quantité réservée", default=0)
    created_at = models.DateTimeField("créée le", auto_now_add=True)

    class Meta:
        verbose_name = "contrepartie"
        verbose_name_plural = "contreparties"
        ordering = ["minimum_amount"]

    def __str__(self):
        return f"{self.title} — {self.campaign.title}"

    @property
    def remaining(self):
        if self.quantity_limit is None:
            return None
        return max(self.quantity_limit - self.quantity_claimed, 0)

    @property
    def sold_out(self):
        return self.quantity_limit is not None and self.quantity_claimed >= self.quantity_limit


class CampaignUpdate(models.Model):
    """Actualité publiée par le porteur sur l'avancement de sa campagne."""

    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.CASCADE,
        related_name="updates",
    )
    title = models.CharField("titre", max_length=120)
    content = models.TextField("contenu")
    created_at = models.DateTimeField("publiée le", auto_now_add=True)

    class Meta:
        verbose_name = "actualité de campagne"
        verbose_name_plural = "actualités de campagne"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — {self.campaign.title}"


class CampaignReport(models.Model):
    """Signalement traçable d'une campagne par un membre de la plateforme."""

    class Reason(models.TextChoices):
        FRAUDE = "FRAUDE", "Suspicion de fraude"
        INFORMATION_TROMPEUSE = "INFORMATION_TROMPEUSE", "Informations trompeuses"
        CONTENU_INAPPROPRIE = "CONTENU_INAPPROPRIE", "Contenu inapproprié"
        USURPATION = "USURPATION", "Usurpation d’identité"
        AUTRE = "AUTRE", "Autre motif"

    class Status(models.TextChoices):
        NOUVEAU = "NOUVEAU", "Nouveau"
        EN_COURS = "EN_COURS", "En cours d’examen"
        RESOLU = "RESOLU", "Résolu"
        CLASSE = "CLASSE", "Classé sans suite"

    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name="reports", verbose_name="campagne"
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="campaign_reports",
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
        related_name="assigned_campaign_reports",
        verbose_name="attribué à",
    )
    created_at = models.DateTimeField("signalé le", auto_now_add=True)
    updated_at = models.DateTimeField("mise à jour le", auto_now=True)

    class Meta:
        verbose_name = "signalement de campagne"
        verbose_name_plural = "signalements de campagne"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["campaign", "reporter"], name="uniq_campaign_reporter"
            )
        ]

    def __str__(self):
        return f"{self.campaign.title} — {self.get_reason_display()}"


class CampaignAuditLog(models.Model):
    """Historique append-only des décisions prises sur une campagne."""

    class Action(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Soumise à modération"
        PUBLISHED = "PUBLISHED", "Publiée"
        REJECTED = "REJECTED", "Rejetée"
        SUSPENDED = "SUSPENDED", "Suspendue"
        REACTIVATED = "REACTIVATED", "Réactivée"
        CLOSED = "CLOSED", "Clôturée"

    campaign = models.ForeignKey(
        Campaign, on_delete=models.PROTECT, related_name="audit_logs"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaign_audit_actions",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    previous_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "événement d’audit de campagne"
        verbose_name_plural = "événements d’audit de campagne"
