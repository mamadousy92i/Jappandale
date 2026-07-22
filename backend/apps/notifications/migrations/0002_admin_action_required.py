from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("notifications", "0001_initial")]
    operations = [
        migrations.AlterField(
            model_name="notification",
            name="kind",
            field=models.CharField(choices=[("ACCOUNT_CREATED", "Compte créé"), ("KYC_VALIDATED", "KYC validé"), ("KYC_REJECTED", "KYC rejeté"), ("CAMPAIGN_PUBLISHED", "Campagne publiée"), ("CAMPAIGN_REJECTED", "Campagne rejetée"), ("CAMPAIGN_SUSPENDED", "Campagne suspendue"), ("CAMPAIGN_REACTIVATED", "Campagne réactivée"), ("CAMPAIGN_CLOSED", "Campagne clôturée"), ("CONTRIBUTION_CONFIRMED", "Contribution confirmée"), ("CONTRIBUTION_RECEIVED", "Contribution reçue"), ("GOAL_REACHED", "Objectif atteint"), ("ADMIN_ACTION_REQUIRED", "Action administrateur requise")], max_length=30, verbose_name="type"),
        )
    ]
