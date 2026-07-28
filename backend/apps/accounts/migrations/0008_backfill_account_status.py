from django.db import migrations


def backfill_account_status(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(email_verified_at__isnull=False).update(account_status="VALIDE")
    User.objects.filter(is_superuser=True).update(account_status="VALIDE")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_user_account_status_user_account_status_changed_at_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_account_status, noop),
    ]
