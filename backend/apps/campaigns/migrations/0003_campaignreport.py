from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("campaigns", "0002_campaign_beneficiaries_campaign_funding_plan_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CampaignReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reason", models.CharField(choices=[("FRAUDE", "Suspicion de fraude"), ("INFORMATION_TROMPEUSE", "Informations trompeuses"), ("CONTENU_INAPPROPRIE", "Contenu inapproprié"), ("USURPATION", "Usurpation d’identité"), ("AUTRE", "Autre motif")], max_length=30, verbose_name="motif")),
                ("details", models.TextField(max_length=1500, verbose_name="précisions")),
                ("status", models.CharField(choices=[("NOUVEAU", "Nouveau"), ("EN_COURS", "En cours d’examen"), ("RESOLU", "Résolu"), ("CLASSE", "Classé sans suite")], default="NOUVEAU", max_length=20, verbose_name="statut")),
                ("admin_note", models.TextField(blank=True, verbose_name="note interne")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="signalé le")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="mise à jour le")),
                ("campaign", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="campaigns.campaign", verbose_name="campagne")),
                ("reporter", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="campaign_reports", to=settings.AUTH_USER_MODEL, verbose_name="auteur du signalement")),
            ],
            options={"verbose_name": "signalement de campagne", "verbose_name_plural": "signalements de campagne", "ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="campaignreport",
            constraint=models.UniqueConstraint(fields=("campaign", "reporter"), name="uniq_campaign_reporter"),
        ),
    ]
