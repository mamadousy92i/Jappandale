from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_dossier_fee_status(apps, schema_editor):
    """Les campagnes déjà passées par la soumission avant cette fonctionnalité
    ont été acceptées sous l'ancienne règle : on ne leur applique pas
    rétroactivement l'exigence de validation des frais de dossier."""
    Campaign = apps.get_model("campaigns", "Campaign")
    Campaign.objects.exclude(status="BROUILLON").update(dossier_fee_status="VALIDE")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("campaigns", "0006_investissement_participatif"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="campaign",
            name="dossier_fee_status",
            field=models.CharField(
                choices=[
                    ("NON_DEMANDE", "Non demandée"),
                    ("EN_ATTENTE", "En attente de validation"),
                    ("VALIDE", "Validés"),
                    ("REJETE", "Rejetés"),
                ],
                default="NON_DEMANDE",
                max_length=20,
                verbose_name="statut des frais de dossier",
            ),
        ),
        migrations.AddField(
            model_name="campaign",
            name="dossier_fee_note",
            field=models.TextField(
                blank=True, verbose_name="motif (frais de dossier)"
            ),
        ),
        migrations.AddField(
            model_name="campaign",
            name="dossier_fee_reviewed_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="frais de dossier examinés le"
            ),
        ),
        migrations.AddField(
            model_name="campaign",
            name="dossier_fee_reviewed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to=settings.AUTH_USER_MODEL,
                verbose_name="frais de dossier examinés par",
            ),
        ),
        migrations.AlterField(
            model_name="campaignauditlog",
            name="action",
            field=models.CharField(
                choices=[
                    ("SUBMITTED", "Soumise à modération"),
                    ("PUBLISHED", "Publiée"),
                    ("REJECTED", "Rejetée"),
                    ("SUSPENDED", "Suspendue"),
                    ("REACTIVATED", "Réactivée"),
                    ("CLOSED", "Clôturée"),
                    ("FEE_REQUESTED", "Validation des frais de dossier demandée"),
                    ("FEE_VALIDATED", "Frais de dossier validés"),
                    ("FEE_REJECTED", "Frais de dossier rejetés"),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_dossier_fee_status, noop),
    ]
