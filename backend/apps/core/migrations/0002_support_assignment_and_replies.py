from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_email_verification_and_assignment"),
        ("core", "0001_supportrequest"),
    ]

    operations = [
        migrations.AddField(model_name="supportrequest", name="assigned_to", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_support_requests", to=settings.AUTH_USER_MODEL, verbose_name="attribuée à")),
        migrations.CreateModel(
            name="SupportReply",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recipient_email", models.EmailField(max_length=254)),
                ("subject", models.CharField(max_length=180)),
                ("message", models.TextField(max_length=5000)),
                ("delivery_status", models.CharField(choices=[("SENT", "Envoyée"), ("FAILED", "Échec")], max_length=10)),
                ("delivery_error", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="support_replies", to=settings.AUTH_USER_MODEL)),
                ("support_request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="replies", to="core.supportrequest")),
            ],
            options={"verbose_name": "réponse d’assistance", "verbose_name_plural": "réponses d’assistance", "ordering": ["created_at"]},
        ),
    ]
