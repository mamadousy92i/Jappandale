from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="SupportRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=150, verbose_name="nom")),
                ("email", models.EmailField(max_length=254, verbose_name="adresse e-mail")),
                ("subject", models.CharField(max_length=160, verbose_name="objet")),
                ("message", models.TextField(max_length=3000, verbose_name="message")),
                ("status", models.CharField(choices=[("NOUVELLE", "Nouvelle"), ("EN_COURS", "En cours"), ("RESOLUE", "Résolue")], default="NOUVELLE", max_length=20, verbose_name="statut")),
                ("admin_note", models.TextField(blank=True, verbose_name="note interne")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="reçue le")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="mise à jour le")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="support_requests", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "demande d'assistance", "verbose_name_plural": "demandes d'assistance", "ordering": ["-created_at"]},
        ),
    ]
