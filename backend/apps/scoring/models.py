from decimal import Decimal

from django.conf import settings
from django.db import models


class ScoringSettings(models.Model):
    """Poids et plafonds du calcul du Score Jappandale (un seul enregistrement, pk=1)."""

    score_base = models.DecimalField("score de base", max_digits=5, decimal_places=2, default=Decimal("50"))
    poids_kyc = models.DecimalField("bonus KYC validé", max_digits=5, decimal_places=2, default=Decimal("15"))
    poids_anciennete_max = models.DecimalField(
        "bonus ancienneté (plafond)", max_digits=5, decimal_places=2, default=Decimal("5")
    )
    poids_activite_max = models.DecimalField(
        "bonus activité (plafond)", max_digits=5, decimal_places=2, default=Decimal("10")
    )
    poids_reussite_max = models.DecimalField(
        "bonus taux de réussite (plafond)", max_digits=5, decimal_places=2, default=Decimal("20")
    )
    poids_montant_max = models.DecimalField(
        "bonus montant collecté (plafond)", max_digits=5, decimal_places=2, default=Decimal("10")
    )
    penalite_litige_max = models.DecimalField(
        "pénalité litiges (plafond)", max_digits=5, decimal_places=2, default=Decimal("30")
    )
    penalite_signalement_unite = models.DecimalField(
        "pénalité par signalement résolu", max_digits=5, decimal_places=2, default=Decimal("5")
    )
    penalite_signalement_max = models.DecimalField(
        "pénalité signalements (plafond)", max_digits=5, decimal_places=2, default=Decimal("15")
    )
    penalite_campagne_rejetee_unite = models.DecimalField(
        "pénalité par campagne rejetée/suspendue", max_digits=5, decimal_places=2, default=Decimal("5")
    )
    penalite_campagne_rejetee_max = models.DecimalField(
        "pénalité campagnes rejetées (plafond)", max_digits=5, decimal_places=2, default=Decimal("15")
    )

    class Meta:
        verbose_name = "réglages du Score Jappandale"
        verbose_name_plural = "réglages du Score Jappandale"

    def __str__(self):
        return "Réglages du Score Jappandale"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Score(models.Model):
    """Score Jappandale calculé pour un porteur, append-only (un calcul = une ligne)."""

    porteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="porteur",
        on_delete=models.CASCADE,
        related_name="scores",
    )
    value = models.PositiveSmallIntegerField("score calculé")
    breakdown = models.JSONField("détail du calcul", default=dict, blank=True)
    is_manual_override = models.BooleanField("surclassé manuellement", default=False)
    override_value = models.PositiveSmallIntegerField("valeur imposée", null=True, blank=True)
    override_note = models.TextField("justification de la validation humaine", blank=True)
    override_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="surclassé par",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="score_overrides",
    )
    computed_at = models.DateTimeField("calculé le", auto_now_add=True)

    class Meta:
        ordering = ["-computed_at"]
        verbose_name = "score Jappandale"
        verbose_name_plural = "scores Jappandale"

    def __str__(self):
        return f"Score {self.effective_value} — {self.porteur_id}"

    @property
    def effective_value(self):
        return self.override_value if self.is_manual_override else self.value
