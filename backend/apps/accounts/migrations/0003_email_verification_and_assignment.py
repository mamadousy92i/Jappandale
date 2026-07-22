from django.db import migrations, models
from django.utils import timezone
import django.db.models.deletion


def mark_existing_emails_verified(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(email_verified_at__isnull=True).update(email_verified_at=timezone.now())


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_user_kyc_review_note_user_kyc_reviewed_at_and_more")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_verified_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="adresse e-mail vérifiée le"),
        ),
        migrations.AddField(model_name="user", name="organization_name", field=models.CharField(blank=True, max_length=160, verbose_name="organisation")),
        migrations.AddField(model_name="user", name="city", field=models.CharField(blank=True, max_length=120, verbose_name="ville")),
        migrations.AddField(model_name="user", name="bio", field=models.TextField(blank=True, max_length=700, verbose_name="présentation publique")),
        migrations.AddField(
            model_name="user",
            name="kyc_assigned_to",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_kyc_users", to="accounts.user", verbose_name="dossier KYC attribué à"),
        ),
        migrations.RunPython(mark_existing_emails_verified, migrations.RunPython.noop),
        migrations.CreateModel(
            name="EmailVerificationOtp",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code_hash", models.CharField(max_length=128)),
                ("expires_at", models.DateTimeField()),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="email_verification_otps", to="accounts.user")),
            ],
            options={"verbose_name": "OTP de vérification e-mail", "verbose_name_plural": "OTP de vérification e-mail", "ordering": ["-created_at"]},
        ),
    ]
