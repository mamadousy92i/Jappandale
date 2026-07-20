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
