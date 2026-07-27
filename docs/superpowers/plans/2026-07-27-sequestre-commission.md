# Séquestre des fonds et commission de plateforme — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modéliser le cycle de vie financier d'une contribution confirmée (séquestre → reversement) et calculer une commission de plateforme, sans déclencher de vrai virement — en préparation de l'intégration PayDunya.

**Architecture:** Extension de l'app `apps.contributions` existante (nouveaux champs sur `Contribution`, nouveau modèle `PlatformSettings` singleton, nouveau modèle `PayoutAuditLog`) + un nouvel endpoint dans `apps.backoffice` pour déclencher le reversement en lot par campagne + affichage dans le tableau de bord admin et l'espace porteur.

**Tech Stack:** Django 5 / DRF (backend), React + TypeScript + Vite (frontend), pytest-django, Vitest.

## Global Constraints

- Référence : `docs/superpowers/specs/2026-07-27-sequestre-commission-design.md` — toutes les valeurs exactes (noms de champs, statuts) viennent de ce document.
- Taux de commission **unique et global** (pas de taux par campagne) : `PlatformSettings.commission_rate`, modifiable par l'admin sans redéploiement.
- Le reversement est déclenché **manuellement par un administrateur**, jamais automatiquement.
- `commission_rate_applied`, `commission_amount`, `net_amount` sont **figés à la confirmation du paiement** — jamais recalculés rétroactivement si le taux change.
- `Campaign.collected_amount` (montant public, barre de progression) reste le montant **brut** — jamais recalculé à partir de `net_amount`.
- Un remboursement n'est autorisé que si `payout_status == EN_SEQUESTRE` (refus si déjà `REVERSEE`).
- Commits en français, sans ligne « Co-Authored-By ». TDD sur tout le backend.
- Toutes les commandes backend : `cd /Users/lucifer/dev/Jappandale/backend && source .venv/bin/activate`.

---

### Task 1 : `PlatformSettings` (taux de commission configurable)

**Files:**
- Create: `backend/apps/contributions/models.py` (ajout, fichier existant)
- Modify: `backend/apps/contributions/admin.py`
- Test: `backend/apps/contributions/tests/test_platform_settings.py`

**Interfaces:**
- Produces: `PlatformSettings.get_solo() -> PlatformSettings` (classmethod, crée l'enregistrement unique s'il n'existe pas) ; champ `commission_rate` (Decimal, 4 chiffres, 2 décimales, défaut `0.05`).

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `backend/apps/contributions/tests/test_platform_settings.py` :

```python
import pytest
from decimal import Decimal

from apps.contributions.models import PlatformSettings


@pytest.mark.django_db
def test_get_solo_cree_un_enregistrement_par_defaut():
    settings_obj = PlatformSettings.get_solo()
    assert settings_obj.pk == 1
    assert settings_obj.commission_rate == Decimal("0.05")


@pytest.mark.django_db
def test_get_solo_reutilise_le_meme_enregistrement():
    first = PlatformSettings.get_solo()
    first.commission_rate = Decimal("0.10")
    first.save(update_fields=["commission_rate"])

    second = PlatformSettings.get_solo()

    assert second.pk == first.pk
    assert second.commission_rate == Decimal("0.10")


@pytest.mark.django_db
def test_un_seul_enregistrement_possible():
    PlatformSettings.get_solo()
    assert PlatformSettings.objects.count() == 1
    PlatformSettings.get_solo()
    assert PlatformSettings.objects.count() == 1
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/contributions/tests/test_platform_settings.py -v`
Expected: FAIL (`ImportError: cannot import name 'PlatformSettings'`)

- [ ] **Step 3 : Implémenter le modèle**

Ajouter en tête de `backend/apps/contributions/models.py` (après les imports existants, avant `class Contribution`) :

```python
from decimal import Decimal


class PlatformSettings(models.Model):
    """Réglages globaux de la plateforme (un seul enregistrement, pk=1)."""

    commission_rate = models.DecimalField(
        "taux de commission",
        max_digits=4,
        decimal_places=2,
        default=Decimal("0.05"),
    )

    class Meta:
        verbose_name = "réglages de la plateforme"
        verbose_name_plural = "réglages de la plateforme"

    def __str__(self):
        return f"Commission : {self.commission_rate * 100:.0f} %"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
```

- [ ] **Step 4 : Enregistrer dans l'admin**

Dans `backend/apps/contributions/admin.py`, ajouter l'import et l'enregistrement :

```python
from .models import Contribution, PlatformSettings, Transaction
```

```python
@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ("commission_rate",)

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
```

- [ ] **Step 5 : Migration et vérification**

```bash
python manage.py makemigrations contributions
python manage.py migrate
pytest apps/contributions/tests/test_platform_settings.py -v
```

Expected: `3 passed`.

- [ ] **Step 6 : Commit**

```bash
git add backend/apps/contributions/
git commit -m "Contributions : réglages de plateforme (taux de commission configurable)"
```

---

### Task 2 : Champs de séquestre/reversement sur `Contribution`

**Files:**
- Modify: `backend/apps/contributions/models.py`
- Test: `backend/apps/contributions/tests/test_platform_settings.py` (ajout)

**Interfaces:**
- Consumes: `PlatformSettings` (Task 1).
- Produces : sur `Contribution` — `payout_status` (choix `EN_SEQUESTRE`/`REVERSEE`, défaut `EN_SEQUESTRE`), `commission_rate_applied` (Decimal, nul), `commission_amount` (entier, nul), `net_amount` (entier, nul), `payout_released_at` (DateTime, nul), `payout_released_by` (FK `User`, nul).

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin de `backend/apps/contributions/tests/test_platform_settings.py` :

```python
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution

User = get_user_model()


@pytest.mark.django_db
def test_contribution_a_les_champs_de_reversement_par_defaut():
    owner = User.objects.create_user(
        email="owner-payout@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    contributor = User.objects.create_user(
        email="contrib-payout@test.sn", password="MotDePasse123!"
    )
    campaign = Campaign.objects.create(
        owner=owner,
        title="Test reversement",
        summary="Résumé.",
        description="Description.",
        category="ARTISANAT",
        goal_amount=100_000,
        deadline=timezone.localdate(),
        status=Campaign.Status.PUBLIEE,
    )
    contribution = Contribution.objects.create(
        contributor=contributor, campaign=campaign, amount=10_000
    )

    assert contribution.payout_status == Contribution.PayoutStatus.EN_SEQUESTRE
    assert contribution.commission_rate_applied is None
    assert contribution.commission_amount is None
    assert contribution.net_amount is None
    assert contribution.payout_released_at is None
    assert contribution.payout_released_by is None
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/contributions/tests/test_platform_settings.py::test_contribution_a_les_champs_de_reversement_par_defaut -v`
Expected: FAIL (`AttributeError: 'Contribution' object has no attribute 'payout_status'`)

- [ ] **Step 3 : Implémenter les champs**

Dans `backend/apps/contributions/models.py`, modifier la classe `Contribution` :

```python
class Contribution(models.Model):
    """Intention de don d'un utilisateur envers une campagne."""

    class Status(models.TextChoices):
        INITIEE = "INITIEE", "Initiée"
        CONFIRMEE = "CONFIRMEE", "Confirmée"
        ECHOUEE = "ECHOUEE", "Échouée"
        REMBOURSEE = "REMBOURSEE", "Remboursée"

    class PayoutStatus(models.TextChoices):
        EN_SEQUESTRE = "EN_SEQUESTRE", "En séquestre"
        REVERSEE = "REVERSEE", "Reversée"

    public_reference = models.UUIDField(
        "référence publique", default=uuid.uuid4, unique=True, editable=False
    )
    contributor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="contributeur",
        on_delete=models.PROTECT,
        related_name="contributions",
    )
    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.PROTECT,
        related_name="contributions",
    )
    reward = models.ForeignKey(
        "campaigns.Reward",
        verbose_name="contrepartie",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="contributions",
    )
    amount = models.PositiveBigIntegerField("montant (FCFA)")
    anonymous = models.BooleanField("contribution anonyme", default=False)
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.INITIEE
    )
    payout_status = models.CharField(
        "statut de reversement",
        max_length=20,
        choices=PayoutStatus.choices,
        default=PayoutStatus.EN_SEQUESTRE,
    )
    commission_rate_applied = models.DecimalField(
        "taux de commission appliqué", max_digits=4, decimal_places=2, null=True, blank=True
    )
    commission_amount = models.PositiveIntegerField(
        "montant de la commission (FCFA)", null=True, blank=True
    )
    net_amount = models.PositiveIntegerField(
        "montant net pour le porteur (FCFA)", null=True, blank=True
    )
    payout_released_at = models.DateTimeField("reversée le", null=True, blank=True)
    payout_released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="reversée par",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="released_payouts",
    )
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    confirmed_at = models.DateTimeField("confirmée le", null=True, blank=True)
    refunded_at = models.DateTimeField("remboursée le", null=True, blank=True)

    class Meta:
        verbose_name = "contribution"
        verbose_name_plural = "contributions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["campaign", "status"]),
            models.Index(fields=["contributor", "status"]),
            models.Index(fields=["campaign", "payout_status"]),
        ]

    def __str__(self):
        return f"{self.amount} FCFA — {self.campaign.title}"
```

(Seuls les champs `payout_status` à `payout_released_by` et l'ajout d'un index sont nouveaux ; le reste de la classe est inchangé — recopie fidèlement le reste depuis le fichier existant.)

- [ ] **Step 4 : Migration et vérification**

```bash
python manage.py makemigrations contributions
python manage.py migrate
pytest apps/contributions/tests/test_platform_settings.py -v
```

Expected: `4 passed`.

- [ ] **Step 5 : Commit**

```bash
git add backend/apps/contributions/
git commit -m "Contributions : champs de séquestre et de reversement sur Contribution"
```

---

### Task 3 : `PayoutAuditLog` et calcul de la commission à la confirmation

**Files:**
- Modify: `backend/apps/contributions/models.py`
- Modify: `backend/apps/contributions/admin.py`
- Modify: `backend/apps/contributions/services.py`
- Test: `backend/apps/contributions/tests/test_payout.py`

**Interfaces:**
- Consumes: `PlatformSettings.get_solo()` (Task 1), champs de `Contribution` (Task 2), `process_simulated_payment(contribution, outcome)` (existant).
- Produces: modèle `PayoutAuditLog` (append-only) ; `process_simulated_payment` calcule et fige `commission_rate_applied`/`commission_amount`/`net_amount` à la confirmation.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/contributions/tests/test_payout.py` :

```python
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution, PlatformSettings

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR, kyc=User.KycStatus.VALIDE):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=kyc,
        first_name="Awa",
        last_name="Ndiaye",
        email_verified_at=timezone.now(),
    )


def make_campaign(owner, **overrides):
    values = {
        "title": "Cantine scolaire de quartier",
        "summary": "Financer du matériel pour la cantine scolaire.",
        "description": "Un projet concret porté par les habitants du quartier.",
        "category": Campaign.Category.EDUCATION,
        "goal_amount": 500_000,
        "deadline": timezone.localdate() + timedelta(days=30),
        "status": Campaign.Status.PUBLIEE,
    }
    values.update(overrides)
    return Campaign.objects.create(owner=owner, **values)


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_confirmation_calcule_la_commission_et_le_montant_net():
    PlatformSettings.get_solo()  # taux par défaut 5 %
    owner = make_user("owner-p1@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p1@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )

    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    contribution = Contribution.objects.get(public_reference=created.data["public_reference"])
    assert contribution.commission_rate_applied == Decimal("0.05")
    assert contribution.commission_amount == 1_000
    assert contribution.net_amount == 19_000
    assert contribution.payout_status == Contribution.PayoutStatus.EN_SEQUESTRE


@pytest.mark.django_db
def test_taux_fige_ne_change_pas_retroactivement():
    settings_obj = PlatformSettings.get_solo()
    owner = make_user("owner-p2@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p2@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    settings_obj.commission_rate = Decimal("0.20")
    settings_obj.save(update_fields=["commission_rate"])

    contribution = Contribution.objects.get(public_reference=created.data["public_reference"])
    assert contribution.commission_rate_applied == Decimal("0.05")
    assert contribution.commission_amount == 1_000


@pytest.mark.django_db
def test_montant_public_collecte_reste_brut():
    owner = make_user("owner-p3@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-p3@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    campaign.refresh_from_db()
    assert campaign.collected_amount == 20_000
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/contributions/tests/test_payout.py -v`
Expected: FAIL (`commission_rate_applied` reste `None` après confirmation).

- [ ] **Step 3 : Ajouter `PayoutAuditLog`**

Dans `backend/apps/contributions/models.py`, ajouter à la fin du fichier :

```python
class PayoutAuditLog(models.Model):
    """Historique append-only des reversements déclenchés par campagne."""

    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.PROTECT,
        related_name="payout_audit_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="administrateur",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_payout_releases",
    )
    contributions_count = models.PositiveIntegerField("nombre de contributions reversées")
    gross_amount = models.PositiveIntegerField("montant brut reversé (FCFA)")
    commission_amount = models.PositiveIntegerField("commission totale (FCFA)")
    net_amount = models.PositiveIntegerField("montant net reversé (FCFA)")
    created_at = models.DateTimeField("effectué le", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "événement de reversement"
        verbose_name_plural = "événements de reversement"

    def __str__(self):
        return f"Reversement — {self.campaign.title} — {self.created_at:%d/%m/%Y}"
```

Il faut importer `Campaign` : vérifier que `from apps.campaigns.models import Campaign` est bien déjà présent en tête de `backend/apps/contributions/models.py` (c'est le cas, utilisé par `Contribution.campaign`).

- [ ] **Step 4 : Étendre `process_simulated_payment`**

Dans `backend/apps/contributions/services.py`, repérer la fonction `process_simulated_payment` existante. Ajouter l'import en tête de fichier :

```python
from .models import Contribution, PlatformSettings, Transaction
```

Puis, dans le bloc `if result.success:` de `process_simulated_payment` (juste après `locked.confirmed_at = now` et avant `locked.save(...)`), ajouter le calcul de la commission :

```python
        commission_rate = PlatformSettings.get_solo().commission_rate
        locked.commission_rate_applied = commission_rate
        locked.commission_amount = round(locked.amount * commission_rate)
        locked.net_amount = locked.amount - locked.commission_amount
```

Et mettre à jour l'appel `locked.save(update_fields=[...])` qui suit pour inclure les nouveaux champs :

```python
        locked.save(
            update_fields=[
                "status",
                "confirmed_at",
                "commission_rate_applied",
                "commission_amount",
                "net_amount",
            ]
        )
```

(Le reste de la fonction — verrouillage, notifications, recalcul du total de la campagne — reste inchangé.)

- [ ] **Step 5 : Admin pour `PayoutAuditLog`**

Dans `backend/apps/contributions/admin.py`, ajouter :

```python
from .models import Contribution, PayoutAuditLog, PlatformSettings, Transaction
```

```python
@admin.register(PayoutAuditLog)
class PayoutAuditLogAdmin(admin.ModelAdmin):
    list_display = ("campaign", "actor", "contributions_count", "net_amount", "created_at")
    readonly_fields = (
        "campaign", "actor", "contributions_count", "gross_amount",
        "commission_amount", "net_amount", "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
```

- [ ] **Step 6 : Migration et vérification**

```bash
python manage.py makemigrations contributions
python manage.py migrate
pytest apps/contributions/tests/test_payout.py -v
```

Expected: `3 passed`.

- [ ] **Step 7 : Commit**

```bash
git add backend/apps/contributions/
git commit -m "Contributions : calcul et gel de la commission à la confirmation du paiement"
```

---

### Task 4 : Service de reversement en lot + restriction du remboursement

**Files:**
- Modify: `backend/apps/contributions/services.py`
- Test: `backend/apps/contributions/tests/test_payout.py`

**Interfaces:**
- Consumes: `PayoutAuditLog`, champs `Contribution` (Tasks 2-3), `apps.notifications.services.notify_user`, `apps.notifications.models.Notification.Kind`.
- Produces: `release_campaign_payout(*, campaign, actor) -> PayoutAuditLog` (lève `ValueError` si la campagne n'est pas `CLOTUREE` ou si aucune contribution à reverser) ; `refund_contribution` refuse désormais une contribution déjà `REVERSEE`.

- [ ] **Step 1 : Ajouter le type de notification**

Dans `backend/apps/notifications/models.py`, ajouter un choix à `Notification.Kind` (juste après `GOAL_REACHED`) :

```python
        PAYOUT_RELEASED = "PAYOUT_RELEASED", "Fonds reversés"
```

Générer la migration :

```bash
python manage.py makemigrations notifications
python manage.py migrate
```

- [ ] **Step 2 : Écrire les tests qui échouent**

Ajouter à la fin de `backend/apps/contributions/tests/test_payout.py` :

```python
from apps.contributions.services import (
    process_simulated_payment,
    refund_contribution,
    release_campaign_payout,
)
from apps.notifications.models import Notification


def _confirmer_contribution(client, campaign, amount=20_000):
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": amount},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    return Contribution.objects.get(public_reference=created.data["public_reference"])


@pytest.mark.django_db
def test_reversement_refuse_si_campagne_pas_cloturee():
    owner = make_user("owner-p4@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p4@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)

    with pytest.raises(ValueError):
        release_campaign_payout(campaign=campaign, actor=admin)


@pytest.mark.django_db
def test_reversement_marque_toutes_les_contributions_de_la_campagne():
    owner = make_user("owner-p5@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p5@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    contributor1 = make_user("c1-p5@test.sn")
    contributor2 = make_user("c2-p5@test.sn")
    contribution1 = _confirmer_contribution(authenticated_client(contributor1), campaign, 10_000)
    contribution2 = _confirmer_contribution(authenticated_client(contributor2), campaign, 30_000)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])

    log = release_campaign_payout(campaign=campaign, actor=admin)

    contribution1.refresh_from_db()
    contribution2.refresh_from_db()
    assert contribution1.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution2.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution1.payout_released_by_id == admin.id
    assert contribution1.payout_released_at is not None
    assert log.contributions_count == 2
    assert log.gross_amount == 40_000
    assert log.net_amount == contribution1.net_amount + contribution2.net_amount
    assert Notification.objects.filter(
        recipient=owner, kind=Notification.Kind.PAYOUT_RELEASED
    ).exists()


@pytest.mark.django_db
def test_reversement_ne_touche_pas_une_autre_campagne():
    owner1 = make_user("owner-p6a@test.sn", User.Role.PORTEUR)
    owner2 = make_user("owner-p6b@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p6@test.sn", User.Role.ADMIN)
    campaign1 = make_campaign(owner1, title="Campagne 1", status=Campaign.Status.PUBLIEE)
    campaign2 = make_campaign(owner2, title="Campagne 2", status=Campaign.Status.PUBLIEE)
    contribution1 = _confirmer_contribution(authenticated_client(make_user("c1-p6@test.sn")), campaign1)
    contribution2 = _confirmer_contribution(authenticated_client(make_user("c2-p6@test.sn")), campaign2)
    campaign1.status = Campaign.Status.CLOTUREE
    campaign1.save(update_fields=["status"])
    campaign2.status = Campaign.Status.CLOTUREE
    campaign2.save(update_fields=["status"])

    release_campaign_payout(campaign=campaign1, actor=admin)

    contribution1.refresh_from_db()
    contribution2.refresh_from_db()
    assert contribution1.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution2.payout_status == Contribution.PayoutStatus.EN_SEQUESTRE


@pytest.mark.django_db
def test_reversement_idempotent_sur_contributions_deja_reversees():
    owner = make_user("owner-p7@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p7@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    _confirmer_contribution(authenticated_client(make_user("c1-p7@test.sn")), campaign)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    release_campaign_payout(campaign=campaign, actor=admin)

    with pytest.raises(ValueError):
        release_campaign_payout(campaign=campaign, actor=admin)


@pytest.mark.django_db
def test_remboursement_refuse_si_deja_reversee():
    owner = make_user("owner-p8@test.sn", User.Role.PORTEUR)
    admin = make_user("admin-p8@test.sn", User.Role.ADMIN)
    campaign = make_campaign(owner, status=Campaign.Status.PUBLIEE)
    contribution = _confirmer_contribution(authenticated_client(make_user("c1-p8@test.sn")), campaign)
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    release_campaign_payout(campaign=campaign, actor=admin)
    contribution.refresh_from_db()

    assert refund_contribution(contribution) is False

    contribution.refresh_from_db()
    assert contribution.status == Contribution.Status.CONFIRMEE
```

- [ ] **Step 3 : Vérifier l'échec**

Run: `pytest apps/contributions/tests/test_payout.py -v`
Expected: FAIL (`ImportError: cannot import name 'release_campaign_payout'`)

- [ ] **Step 4 : Implémenter `release_campaign_payout`**

Dans `backend/apps/contributions/services.py`, ajouter les imports nécessaires en tête de fichier :

```python
from django.db import transaction as db_transaction

from apps.campaigns.models import Campaign
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import Contribution, PayoutAuditLog, PlatformSettings, Transaction
```

Puis ajouter la fonction (à la fin du fichier) :

```python
@db_transaction.atomic
def release_campaign_payout(*, campaign, actor):
    """Marque en lot les contributions confirmées d'une campagne comme reversées."""
    if campaign.status != Campaign.Status.CLOTUREE:
        raise ValueError("Seule une campagne clôturée peut faire l'objet d'un reversement.")

    contributions = list(
        Contribution.objects.select_for_update().filter(
            campaign=campaign,
            status=Contribution.Status.CONFIRMEE,
            payout_status=Contribution.PayoutStatus.EN_SEQUESTRE,
        )
    )
    if not contributions:
        raise ValueError("Aucune contribution en séquestre à reverser pour cette campagne.")

    now = timezone.now()
    gross_amount = sum(c.amount for c in contributions)
    commission_amount = sum(c.commission_amount for c in contributions)
    net_amount = sum(c.net_amount for c in contributions)

    for contribution in contributions:
        contribution.payout_status = Contribution.PayoutStatus.REVERSEE
        contribution.payout_released_at = now
        contribution.payout_released_by = actor
        contribution.save(
            update_fields=["payout_status", "payout_released_at", "payout_released_by"]
        )

    log = PayoutAuditLog.objects.create(
        campaign=campaign,
        actor=actor,
        contributions_count=len(contributions),
        gross_amount=gross_amount,
        commission_amount=commission_amount,
        net_amount=net_amount,
    )
    notify_user(
        recipient=campaign.owner,
        kind=Notification.Kind.PAYOUT_RELEASED,
        subject="Les fonds de votre campagne ont été reversés",
        message=(
            f"Les fonds de la campagne « {campaign.title} » ont été reversés : "
            f"{net_amount} FCFA net, pour {len(contributions)} contribution(s)."
        ),
        action_url="/compte?onglet=contributions",
    )
    return log
```

`timezone` est déjà importé en tête de `backend/apps/contributions/services.py` (utilisé par `process_simulated_payment` et `refund_contribution` existants) — ne pas le réimporter en double.

- [ ] **Step 5 : Restreindre `refund_contribution`**

Dans `backend/apps/contributions/services.py`, repérer la fonction `refund_contribution` existante. Juste après la ligne `if locked.status != Contribution.Status.CONFIRMEE: return False`, ajouter :

```python
    if locked.payout_status != Contribution.PayoutStatus.EN_SEQUESTRE:
        return False
```

- [ ] **Step 6 : Vérifier que les tests passent**

```bash
pytest apps/contributions/tests/test_payout.py -v
```

Expected: `6 passed`. Puis la suite complète :

```bash
pytest -q
```

Expected: tous les tests passent (aucune régression sur les tests de remboursement existants).

- [ ] **Step 7 : Commit**

```bash
git add backend/apps/contributions/ backend/apps/notifications/
git commit -m "Contributions : service de reversement en lot par campagne et restriction du remboursement"
```

---

### Task 5 : Endpoint back-office pour déclencher le reversement

**Files:**
- Modify: `backend/apps/backoffice/views.py`
- Modify: `backend/apps/backoffice/urls.py`
- Test: `backend/apps/backoffice/tests/test_payout.py`

**Interfaces:**
- Consumes: `release_campaign_payout` (Task 4), `IsJappandaleAdmin` (existant).
- Produces: `POST /api/backoffice/campaigns/<campaign_id>/reverser/` (admin uniquement) → 200 avec un résumé, 400 si la campagne n'est pas éligible.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/backoffice/tests/test_payout.py` :

```python
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="gestion-payout@test.sn", password="MotDePasse123!")


def _campagne_cloturee_avec_contribution(montant=20_000):
    owner = User.objects.create_user(
        email="owner-bo@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    contributor = User.objects.create_user(
        email="contrib-bo@test.sn",
        password="MotDePasse123!",
        kyc_status=User.KycStatus.VALIDE,
        email_verified_at=timezone.now(),
    )
    campaign = Campaign.objects.create(
        owner=owner,
        title="Projet clôturé",
        summary="Résumé.",
        description="Description.",
        category=Campaign.Category.EDUCATION,
        goal_amount=100_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )
    client = APIClient()
    client.force_authenticate(contributor)
    created = client.post(
        "/api/contributions/", {"campaign_slug": campaign.slug, "amount": montant}, format="json"
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )
    campaign.status = Campaign.Status.CLOTUREE
    campaign.save(update_fields=["status"])
    return campaign


@pytest.mark.django_db
def test_reversement_refuse_a_un_non_admin():
    campaign = _campagne_cloturee_avec_contribution()
    client = APIClient()
    client.force_authenticate(campaign.owner)

    response = client.post(f"/api/backoffice/campaigns/{campaign.id}/reverser/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_declenche_le_reversement():
    campaign = _campagne_cloturee_avec_contribution(montant=20_000)
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(f"/api/backoffice/campaigns/{campaign.id}/reverser/")

    assert response.status_code == 200
    contribution = Contribution.objects.get(campaign=campaign)
    assert contribution.payout_status == Contribution.PayoutStatus.REVERSEE
    assert contribution.payout_released_by_id == admin.id


@pytest.mark.django_db
def test_reversement_refuse_si_campagne_pas_cloturee():
    owner = User.objects.create_user(
        email="owner-bo2@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    campaign = Campaign.objects.create(
        owner=owner,
        title="Projet en cours",
        summary="Résumé.",
        description="Description.",
        category=Campaign.Category.EDUCATION,
        goal_amount=100_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.post(f"/api/backoffice/campaigns/{campaign.id}/reverser/")

    assert response.status_code == 400
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/backoffice/tests/test_payout.py -v`
Expected: FAIL (404 — l'URL n'existe pas).

- [ ] **Step 3 : Implémenter la vue**

Dans `backend/apps/backoffice/views.py`, ajouter l'import :

```python
from apps.contributions.services import release_campaign_payout
```

Puis ajouter la vue (par exemple juste après `CampaignWorkflowView`) :

```python
class CampaignPayoutView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def post(self, request, campaign_id):
        campaign = get_object_or_404(Campaign, pk=campaign_id)
        try:
            log = release_campaign_payout(campaign=campaign, actor=request.user)
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "detail": "Reversement effectué.",
                "contributions_count": log.contributions_count,
                "net_amount": log.net_amount,
            }
        )
```

- [ ] **Step 4 : Ajouter la route**

Dans `backend/apps/backoffice/urls.py`, ajouter l'import et la route :

```python
from .views import (
    CampaignDecisionView,
    CampaignPayoutView,
    CampaignWorkflowView,
    ...  # conserver les imports existants
)
```

```python
    path("campaigns/<int:campaign_id>/reverser/", CampaignPayoutView.as_view(), name="campaign-payout"),
```

- [ ] **Step 5 : Vérifier**

```bash
pytest apps/backoffice/tests/test_payout.py -v
```

Expected: `3 passed`. Puis la suite complète :

```bash
pytest -q
```

Expected: tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
git add backend/apps/backoffice/
git commit -m "Back-office : endpoint de déclenchement du reversement par campagne"
```

---

### Task 6 : Agrégats séquestre/reversé dans le tableau de bord admin

**Files:**
- Modify: `backend/apps/backoffice/views.py` (`DashboardView`)
- Test: `backend/apps/backoffice/tests/test_payout.py`

**Interfaces:**
- Consumes: champs `Contribution.payout_status`/`net_amount`/`commission_amount` (Task 2-3).
- Produces: `GET /api/backoffice/dashboard/` renvoie en plus `metrics.total_en_sequestre`, `metrics.total_reverse`, et une clé `payouts` (liste des campagnes clôturées ayant des contributions encore en séquestre, avec les totaux par campagne).

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `backend/apps/backoffice/tests/test_payout.py` :

```python
@pytest.mark.django_db
def test_dashboard_expose_les_agregats_de_reversement():
    campaign = _campagne_cloturee_avec_contribution(montant=20_000)
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get("/api/backoffice/dashboard/")

    assert response.status_code == 200
    assert response.data["metrics"]["total_en_sequestre"] == 19_000
    assert response.data["metrics"]["total_reverse"] == 0
    payout_entry = next(
        item for item in response.data["payouts"] if item["campaign"]["slug"] == campaign.slug
    )
    assert payout_entry["net_amount"] == 19_000
    assert payout_entry["contributions_count"] == 1
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/backoffice/tests/test_payout.py::test_dashboard_expose_les_agregats_de_reversement -v`
Expected: FAIL (`KeyError: 'total_en_sequestre'`).

- [ ] **Step 3 : Étendre `DashboardView`**

Dans `backend/apps/backoffice/views.py`, dans `DashboardView.get`, ajouter l'import :

```python
from apps.contributions.models import Contribution
from django.db.models import Sum
```

(vérifier que ces imports ne sont pas déjà dupliqués — `Contribution` et `Sum` sont probablement déjà importés en tête de fichier ; dans ce cas ne rien ajouter).

Juste après la ligne `confirmed = Contribution.objects.filter(status=Contribution.Status.CONFIRMEE)` existante, ajouter :

```python
        en_sequestre = confirmed.filter(payout_status=Contribution.PayoutStatus.EN_SEQUESTRE)
        reversees = confirmed.filter(payout_status=Contribution.PayoutStatus.REVERSEE)
        payout_campaigns = (
            Campaign.objects.filter(
                status=Campaign.Status.CLOTUREE,
                contributions__status=Contribution.Status.CONFIRMEE,
                contributions__payout_status=Contribution.PayoutStatus.EN_SEQUESTRE,
            )
            .distinct()
            .select_related("owner")
        )
```

Dans le dictionnaire `"metrics": {...}` retourné, ajouter deux clés (à côté de `confirmed_amount`) :

```python
                    "total_en_sequestre": en_sequestre.aggregate(total=Sum("net_amount"))["total"] or 0,
                    "total_reverse": reversees.aggregate(total=Sum("net_amount"))["total"] or 0,
```

Dans le dictionnaire `Response({...})` final, ajouter la clé `"payouts"` (au même niveau que `"kyc"`, `"campaigns"`, etc.) :

```python
                "payouts": [
                    {
                        "campaign": {
                            "id": campaign.id,
                            "slug": campaign.slug,
                            "title": campaign.title,
                            "owner": _person(campaign.owner),
                        },
                        "contributions_count": campaign.contributions.filter(
                            status=Contribution.Status.CONFIRMEE,
                            payout_status=Contribution.PayoutStatus.EN_SEQUESTRE,
                        ).count(),
                        "gross_amount": campaign.contributions.filter(
                            status=Contribution.Status.CONFIRMEE,
                            payout_status=Contribution.PayoutStatus.EN_SEQUESTRE,
                        ).aggregate(total=Sum("amount"))["total"] or 0,
                        "net_amount": campaign.contributions.filter(
                            status=Contribution.Status.CONFIRMEE,
                            payout_status=Contribution.PayoutStatus.EN_SEQUESTRE,
                        ).aggregate(total=Sum("net_amount"))["total"] or 0,
                    }
                    for campaign in payout_campaigns
                ],
```

- [ ] **Step 4 : Vérifier**

```bash
pytest apps/backoffice/tests/test_payout.py -v
```

Expected: `4 passed`. Puis la suite complète :

```bash
pytest -q
```

Expected: tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add backend/apps/backoffice/
git commit -m "Back-office : agrégats de séquestre et de reversement dans le tableau de bord"
```

---

### Task 7 : Statut de reversement visible dans l'espace porteur

**Files:**
- Modify: `backend/apps/contributions/serializers.py`
- Modify: `backend/apps/contributions/views.py`
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/account/ReceivedContributions.tsx`
- Test: `backend/apps/contributions/tests/test_contributions.py`

**Interfaces:**
- Consumes: `ContributionSerializer` (existant), champs `payout_status`/`net_amount` (Task 2).
- Produces: `ReceivedContributionSerializer` (hérite de `ContributionSerializer`, ajoute `payout_status`, `payout_status_display`, `net_amount`) utilisé uniquement par `ReceivedContributionsView` — `MyContributionsView` (côté contributeur) est inchangée.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `backend/apps/contributions/tests/test_contributions.py` (fichier existant — repérer la fonction `authenticated_client` et `make_user`/`make_campaign` déjà présentes dans ce fichier et les réutiliser telles quelles) :

```python
@pytest.mark.django_db
def test_contributions_recues_exposent_le_statut_de_reversement():
    owner = make_user("owner-recu@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-recu@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    response = authenticated_client(owner).get("/api/contributions/received/")

    assert response.status_code == 200
    item = response.data[0]
    assert item["payout_status"] == "EN_SEQUESTRE"
    assert item["payout_status_display"] == "En séquestre"
    assert item["net_amount"] == 19_000


@pytest.mark.django_db
def test_mes_contributions_n_expose_pas_le_reversement():
    owner = make_user("owner-mine@test.sn", User.Role.PORTEUR)
    contributor = make_user("contrib-mine@test.sn")
    campaign = make_campaign(owner)
    client = authenticated_client(contributor)
    created = client.post(
        "/api/contributions/",
        {"campaign_slug": campaign.slug, "amount": 20_000},
        format="json",
    )
    client.post(
        f"/api/contributions/{created.data['public_reference']}/confirm/",
        {"outcome": "SUCCESS"},
        format="json",
    )

    response = client.get("/api/contributions/mine/")

    assert response.status_code == 200
    assert "payout_status" not in response.data[0]
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/contributions/tests/test_contributions.py::test_contributions_recues_exposent_le_statut_de_reversement -v`
Expected: FAIL (`KeyError: 'payout_status'`).

- [ ] **Step 3 : Ajouter le serializer**

Dans `backend/apps/contributions/serializers.py`, après la classe `ContributionSerializer` existante, ajouter :

```python
class ReceivedContributionSerializer(ContributionSerializer):
    payout_status_display = serializers.CharField(
        source="get_payout_status_display", read_only=True
    )

    class Meta(ContributionSerializer.Meta):
        fields = ContributionSerializer.Meta.fields + [
            "payout_status",
            "payout_status_display",
            "net_amount",
        ]
```

- [ ] **Step 4 : Utiliser le serializer dans `ReceivedContributionsView`**

Dans `backend/apps/contributions/views.py`, modifier l'import :

```python
from .serializers import (
    ContributionCreateSerializer,
    ContributionSerializer,
    PaymentConfirmationSerializer,
    ReceivedContributionSerializer,
)
```

Puis dans `ReceivedContributionsView`, remplacer `serializer_class = ContributionSerializer` par :

```python
    serializer_class = ReceivedContributionSerializer
```

(`MyContributionsView` garde `serializer_class = ContributionSerializer`, inchangé.)

- [ ] **Step 5 : Vérifier**

```bash
pytest apps/contributions/tests/test_contributions.py -v
```

Expected: tous les tests de ce fichier passent (les 2 nouveaux + les existants, sans régression).

- [ ] **Step 6 : Mettre à jour les types frontend**

Dans `frontend/src/lib/types.ts`, ajouter après le type `ContributionStatus` existant :

```typescript
export type PayoutStatus = "EN_SEQUESTRE" | "REVERSEE";
```

Puis ajouter une nouvelle interface juste après l'interface `Contribution` existante :

```typescript
export interface ReceivedContribution extends Contribution {
  payout_status: PayoutStatus;
  payout_status_display: string;
  net_amount: number;
}
```

- [ ] **Step 7 : Afficher le statut dans l'espace porteur**

Dans `frontend/src/components/account/ReceivedContributions.tsx`, remplacer l'import de type et l'état :

```tsx
import type { ReceivedContribution } from "@/lib/types"
```

```tsx
  const [items, setItems] = useState<ReceivedContribution[]>([])
```

```tsx
      .then((data) => setItems(data as ReceivedContribution[]))
```

Remplacer le bloc d'affichage de chaque contribution (le `<div className="flex items-start justify-between gap-4">` à l'intérieur du `<li>`) par :

```tsx
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{item.contributor_display}</p>
                  <p className="mt-1 text-xs text-ink-muted">{item.campaign.title} · {item.status.toLowerCase()}</p>
                </div>
                <div className="text-right">
                  <span className="font-heading font-bold text-ink">{formatFcfa(item.amount)}</span>
                  {item.status === "CONFIRMEE" && (
                    <p className={`mt-1 text-xs font-semibold ${item.payout_status === "REVERSEE" ? "text-emerald-700" : "text-gold-dark"}`}>
                      {item.payout_status_display} · net {formatFcfa(item.net_amount)}
                    </p>
                  )}
                </div>
              </div>
```

- [ ] **Step 8 : Vérifier la compilation et les tests**

```bash
cd /Users/lucifer/dev/Jappandale/frontend
npm run build
npm test
```

Expected: build sans erreur TypeScript, 6 tests toujours verts (aucun test existant ne couvre ce composant, donc aucun nouveau test à écrire ici — c'est un rendu simple).

- [ ] **Step 9 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add backend/apps/contributions/ frontend/src/lib/types.ts frontend/src/components/account/ReceivedContributions.tsx
git commit -m "Contributions : statut de séquestre/reversement visible dans l'espace porteur"
```

---

### Task 8 : Onglet « Reversements » dans le tableau de bord admin

**Files:**
- Modify: `frontend/src/pages/AdminDashboardPage.tsx`

**Interfaces:**
- Consumes: `metrics.total_en_sequestre`, `metrics.total_reverse`, clé `payouts` de `GET /api/backoffice/dashboard/` (Task 6) ; endpoint `POST /api/backoffice/campaigns/<id>/reverser/` (Task 5) ; helpers existants `ask(title, description, confirmLabel, run, danger?)` et `perform(path, method, body, message)`.
- Produces: un nouvel onglet `payouts` dans le tableau de bord, listant les campagnes clôturées avec fonds en séquestre et un bouton d'action « Reverser les fonds ».

- [ ] **Step 1 : Étendre le type `Tab` et `MetricKey`**

Dans `frontend/src/pages/AdminDashboardPage.tsx`, modifier les lignes 11 et 19 :

```tsx
type Tab = "overview" | "kyc" | "campaigns" | "reports" | "support" | "users" | "payouts"
```

```tsx
type MetricKey = "pending_kyc" | "pending_campaigns" | "open_reports" | "open_support" | "pending_payouts"
```

- [ ] **Step 2 : Étendre `DashboardData`**

Dans l'interface `DashboardData`, ajouter dans le sous-objet `metrics` (à côté de `confirmed_amount`) :

```tsx
    total_en_sequestre: number
    total_reverse: number
```

Puis ajouter une nouvelle clé au niveau racine de `DashboardData` (à côté de `recent_contributions`) :

```tsx
  payouts: Array<{
    campaign: { id: number; slug: string; title: string; owner: Person }
    contributions_count: number
    gross_amount: number
    net_amount: number
  }>
```

- [ ] **Step 3 : Ajouter l'onglet à `tabItems`**

Dans le tableau `tabItems`, ajouter après l'entrée `"users"` :

```tsx
  { id: "payouts", label: "Reversements", icon: Banknote, count: "pending_payouts" },
```

(`Banknote` est déjà importé en tête de fichier, utilisé par la métrique « Montant des contributions confirmées ».)

- [ ] **Step 4 : Calculer `pending_payouts` côté frontend**

`pending_payouts` n'existe pas dans la réponse API (celle-ci expose `payouts` en liste, pas un compteur direct). Dans le composant, juste avant la définition du tableau `metrics` (repérer `const metrics: Array<{`), ajouter :

```tsx
  const pendingPayoutsCount = data.payouts.length
```

Puis, dans le rendu du bouton d'onglet (repérer la ligne `{count && data.metrics[count] > 0 && ...}` dans la boucle sur `tabItems`), le badge utilise `data.metrics[count]` — comme `pending_payouts` n'est pas dans `metrics`, remplacer cette ligne par une version qui gère le cas spécial :

```tsx
                {count && (count === "pending_payouts" ? pendingPayoutsCount : data.metrics[count]) > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${tab === id ? "bg-gold text-ink" : "bg-black/10 text-ink-secondary"}`}>
                    {count === "pending_payouts" ? pendingPayoutsCount : data.metrics[count]}
                  </span>
                )}
```

(Adapter aux classes exactes déjà présentes sur cette ligne dans le fichier — ne pas dupliquer le `className`, seulement remplacer la condition et la valeur affichée.)

- [ ] **Step 5 : Inclure `payouts` dans `currentItems`**

Dans le `useMemo` définissant `currentItems`, modifier la ligne :

```tsx
    let items: unknown[] = tab === "kyc" ? data.kyc : tab === "campaigns" ? data.campaigns : tab === "reports" ? data.reports : tab === "support" ? data.support : tab === "payouts" ? data.payouts : []
```

- [ ] **Step 6 : Ajouter la métrique de vue d'ensemble**

Dans le tableau `metrics` (section overview), ajouter deux entrées après « Montant des contributions confirmées » :

```tsx
    {
      label: "Fonds en séquestre",
      value: formatFcfa(data.metrics.total_en_sequestre),
      icon: Banknote,
      target: "payouts",
    },
    {
      label: "Fonds déjà reversés",
      value: formatFcfa(data.metrics.total_reverse),
      icon: CheckCircle2,
    },
```

(`CheckCircle2` est déjà importé en tête de fichier.)

- [ ] **Step 7 : Ajouter le rendu de l'onglet**

Juste avant `{tab === "reports" && (` (repérer ce bloc existant), insérer :

```tsx
        {tab === "payouts" && (
          <section className="mt-6 space-y-4" aria-labelledby="payout-title">
            <div>
              <h2 id="payout-title" className="font-heading text-2xl font-bold text-ink">
                Reversements en attente
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Campagnes clôturées dont les fonds sont encore en séquestre.
              </p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="reversement" />
            ) : (
              (visibleItems as DashboardData["payouts"]).map((item) => (
                <article key={item.campaign.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <h3 className="font-heading text-xl font-bold text-ink">{item.campaign.title}</h3>
                      <p className="text-xs text-ink-muted">
                        {item.campaign.owner.name} · {item.contributions_count} contribution(s)
                      </p>
                      <p className="text-sm text-ink-secondary">
                        Brut {formatFcfa(item.gross_amount)} · Net à reverser {formatFcfa(item.net_amount)}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        ask(
                          "Reverser les fonds de cette campagne ?",
                          `${item.contributions_count} contribution(s) seront marquées reversées pour un montant net de ${formatFcfa(item.net_amount)}.`,
                          "Reverser",
                          () => perform(`/backoffice/campaigns/${item.campaign.id}/reverser/`, "POST", {}, "Fonds reversés."),
                        )
                      }
                      className="rounded-full bg-emerald-600 text-white"
                    >
                      Reverser les fonds
                    </Button>
                  </div>
                </article>
              ))
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "reports" && (