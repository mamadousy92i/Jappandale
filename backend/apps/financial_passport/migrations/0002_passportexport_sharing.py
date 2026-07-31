from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("financial_passport", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="passportexport",
            name="is_shared",
            field=models.BooleanField(default=False, verbose_name="partage autorisé"),
        ),
        migrations.AddField(
            model_name="passportexport",
            name="shared_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="partagé le"),
        ),
    ]
