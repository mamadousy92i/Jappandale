import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_creation_utilisateur_par_email():
    user = User.objects.create_user(email="test@jappandale.sn", password="motdepasse123")
    assert user.email == "test@jappandale.sn"
    assert user.role == User.Role.CONTRIBUTEUR
    assert user.check_password("motdepasse123")


@pytest.mark.django_db
def test_email_obligatoire():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="motdepasse123")


@pytest.mark.django_db
def test_superuser_a_le_role_admin():
    admin = User.objects.create_superuser(email="admin@jappandale.sn", password="motdepasse123")
    assert admin.is_staff and admin.is_superuser
    assert admin.role == User.Role.ADMIN


@pytest.mark.django_db
def test_nouvel_utilisateur_est_en_attente():
    user = User.objects.create_user(email="attente@jappandale.sn", password="motdepasse123")
    assert user.account_status == User.AccountStatus.EN_ATTENTE
    assert user.is_active is True


@pytest.mark.django_db
def test_superuser_est_valide_directement():
    admin = User.objects.create_superuser(email="admin2@jappandale.sn", password="motdepasse123")
    assert admin.account_status == User.AccountStatus.VALIDE


@pytest.mark.django_db
def test_creation_dun_journal_daudit_utilisateur():
    from apps.accounts.models import UserAuditLog

    target = User.objects.create_user(email="cible@jappandale.sn", password="motdepasse123")
    actor = User.objects.create_superuser(email="admin3@jappandale.sn", password="motdepasse123")

    log = UserAuditLog.objects.create(
        user=target,
        actor=actor,
        action=UserAuditLog.Action.ROLE_CHANGED,
        previous_value="CONTRIBUTEUR",
        new_value="PORTEUR",
        note="Changement demandé par le membre.",
    )

    assert log.user == target
    assert log.actor == actor
    assert target.account_audit_logs.count() == 1
