from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_email_verification_and_assignment"),
        ("campaigns", "0003_campaignreport"),
    ]

    operations = [
        migrations.AddField(model_name="campaign", name="moderation_assigned_to", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_campaigns", to=settings.AUTH_USER_MODEL, verbose_name="modération attribuée à")),
        migrations.AddField(model_name="campaign", name="suspended_at", field=models.DateTimeField(blank=True, null=True, verbose_name="suspendue le")),
        migrations.AddField(model_name="campaign", name="suspension_note", field=models.TextField(blank=True, verbose_name="motif de suspension")),
        migrations.AddField(model_name="campaignreport", name="assigned_to", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_campaign_reports", to=settings.AUTH_USER_MODEL, verbose_name="attribué à")),
        migrations.AlterField(model_name="campaign", name="status", field=models.CharField(choices=[("BROUILLON", "Brouillon"), ("EN_MODERATION", "En modération"), ("PUBLIEE", "Publiée"), ("REJETEE", "Rejetée"), ("SUSPENDUE", "Suspendue"), ("CLOTUREE", "Clôturée")], default="BROUILLON", max_length=20, verbose_name="statut")),
        migrations.CreateModel(
            name="CampaignAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[("SUBMITTED", "Soumise à modération"), ("PUBLISHED", "Publiée"), ("REJECTED", "Rejetée"), ("SUSPENDED", "Suspendue"), ("REACTIVATED", "Réactivée"), ("CLOSED", "Clôturée")], max_length=20)),
                ("previous_status", models.CharField(max_length=20)),
                ("new_status", models.CharField(max_length=20)),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="campaign_audit_actions", to=settings.AUTH_USER_MODEL)),
                ("campaign", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="audit_logs", to="campaigns.campaign")),
            ],
            options={"verbose_name": "événement d’audit de campagne", "verbose_name_plural": "événements d’audit de campagne", "ordering": ["-created_at"]},
        ),
    ]
