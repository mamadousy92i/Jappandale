# Messagerie porteur↔financeurs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à tout utilisateur KYC validé d'échanger des messages avec le porteur d'une campagne publiée/clôturée, avec signalement des messages et modération back-office.

**Architecture:** Nouvelle app Django `apps.messaging` (modèles `MessageThread`, `Message`, `MessageReport`, endpoints REST), extension du back-office existant (revue des signalements, agrégats du tableau de bord), nouvel onglet « Messages » côté compte et point d'entrée sur la page de campagne.

**Tech Stack:** Django 5 / DRF (backend), React + TypeScript + Vite (frontend), pytest-django, Vitest.

## Global Constraints

- Référence : `docs/superpowers/specs/2026-07-28-messagerie-design.md` — toutes les valeurs exactes viennent de ce document.
- Une conversation (`MessageThread`) est rattachée à une campagne précise ; contrainte d'unicité `(campaign, other_user)`.
- KYC validé requis pour envoyer un message (réutilise `apps.contributions.permissions.IsKycValidated`).
- Seul un utilisateur non-porteur de la campagne peut **initier** un fil ; le porteur ne peut que répondre à un fil existant.
- Une campagne n'accepte de nouveaux fils que si son statut est `PUBLIEE` ou `CLOTUREE`.
- Pas de temps réel : le front interroge (polling) toutes les ~8 secondes tant qu'une conversation est ouverte.
- Modération a posteriori : bouton « Signaler » par message, sur le modèle exact de `CampaignReport`.
- Commits en français, sans ligne « Co-Authored-By ». TDD sur tout le backend.
- Toutes les commandes backend : `cd /Users/lucifer/dev/Jappandale/backend && source .venv/bin/activate`.
- Toutes les commandes frontend : `cd /Users/lucifer/dev/Jappandale/frontend`.

---

### Task 1 : App `messaging` — modèles `MessageThread` et `Message`

**Files:**
- Create: `backend/apps/messaging/__init__.py`
- Create: `backend/apps/messaging/apps.py`
- Create: `backend/apps/messaging/models.py`
- Create: `backend/apps/messaging/admin.py`
- Create: `backend/apps/messaging/migrations/__init__.py`
- Modify: `backend/config/settings.py`
- Test: `backend/apps/messaging/tests/__init__.py`
- Test: `backend/apps/messaging/tests/test_models.py`

**Interfaces:**
- Produces: `MessageThread` (champs : `campaign` FK `Campaign`, `other_user` FK `User`, `last_message_at` DateTime nul, `created_at`) ; `Message` (champs : `thread` FK `MessageThread`, `sender` FK `User`, `body`, `created_at`, `read_at` nul).

- [ ] **Step 1 : Créer la structure de l'app**

```bash
mkdir -p backend/apps/messaging/migrations backend/apps/messaging/tests
touch backend/apps/messaging/__init__.py backend/apps/messaging/migrations/__init__.py backend/apps/messaging/tests/__init__.py
```

- [ ] **Step 2 : `apps.py`**

Créer `backend/apps/messaging/apps.py` :

```python
from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.messaging"
    verbose_name = "Messagerie"
```

- [ ] **Step 3 : Enregistrer l'app**

Dans `backend/config/settings.py`, ajouter `"apps.messaging",` à la fin de la liste `INSTALLED_APPS` (après `"apps.backoffice",`).

- [ ] **Step 4 : Écrire le test qui échoue**

Créer `backend/apps/messaging/tests/test_models.py` :

```python
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageThread

User = get_user_model()


def make_user(email, role=User.Role.CONTRIBUTEUR):
    return User.objects.create_user(
        email=email,
        password="MotDePasse123!",
        role=role,
        kyc_status=User.KycStatus.VALIDE,
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


@pytest.mark.django_db
def test_creation_dun_fil_et_dun_message():
    owner = make_user("owner-msg1@test.sn", User.Role.PORTEUR)
    other = make_user("other-msg1@test.sn")
    campaign = make_campaign(owner)

    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Bonjour !")

    assert message.read_at is None
    assert thread.messages.count() == 1


@pytest.mark.django_db
def test_unicite_campagne_autre_utilisateur():
    owner = make_user("owner-msg2@test.sn", User.Role.PORTEUR)
    other = make_user("other-msg2@test.sn")
    campaign = make_campaign(owner)
    MessageThread.objects.create(campaign=campaign, other_user=other)

    with pytest.raises(IntegrityError):
        MessageThread.objects.create(campaign=campaign, other_user=other)
```

- [ ] **Step 5 : Vérifier l'échec**

```bash
pytest apps/messaging/tests/test_models.py -v
```

Expected: FAIL (`ModuleNotFoundError: No module named 'apps.messaging.models'` ou équivalent).

- [ ] **Step 6 : Implémenter les modèles**

Créer `backend/apps/messaging/models.py` :

```python
from django.conf import settings
from django.db import models

from apps.campaigns.models import Campaign


class MessageThread(models.Model):
    """Conversation entre le porteur d'une campagne et un autre utilisateur."""

    campaign = models.ForeignKey(
        Campaign,
        verbose_name="campagne",
        on_delete=models.PROTECT,
        related_name="message_threads",
    )
    other_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="autre participant",
        on_delete=models.PROTECT,
        related_name="message_threads",
    )
    last_message_at = models.DateTimeField("dernier message le", null=True, blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)

    class Meta:
        verbose_name = "conversation"
        verbose_name_plural = "conversations"
        ordering = ["-last_message_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["campaign", "other_user"], name="unique_campaign_other_user_thread"
            )
        ]

    def __str__(self):
        return f"{self.campaign.title} — {self.other_user.email}"


class Message(models.Model):
    """Message échangé au sein d'une conversation."""

    thread = models.ForeignKey(
        MessageThread, on_delete=models.CASCADE, related_name="messages", verbose_name="conversation"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="auteur",
        on_delete=models.PROTECT,
        related_name="sent_messages",
    )
    body = models.TextField("message", max_length=3000)
    created_at = models.DateTimeField("envoyé le", auto_now_add=True)
    read_at = models.DateTimeField("lu le", null=True, blank=True)

    class Meta:
        verbose_name = "message"
        verbose_name_plural = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.email} — {self.created_at:%d/%m/%Y %H:%M}"
```

- [ ] **Step 7 : Admin (lecture seule)**

Créer `backend/apps/messaging/admin.py` :

```python
from django.contrib import admin

from .models import Message, MessageThread


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("sender", "body", "created_at", "read_at")
    can_delete = False


@admin.register(MessageThread)
class MessageThreadAdmin(admin.ModelAdmin):
    list_display = ("campaign", "other_user", "last_message_at", "created_at")
    search_fields = ("campaign__title", "other_user__email")
    readonly_fields = ("campaign", "other_user", "last_message_at", "created_at")
    inlines = (MessageInline,)

    def has_add_permission(self, request):
        return False
```

- [ ] **Step 8 : Migration et vérification**

```bash
python manage.py makemigrations messaging
python manage.py migrate
pytest apps/messaging/tests/test_models.py -v
```

Expected: `2 passed`.

- [ ] **Step 9 : Commit**

```bash
git add backend/apps/messaging/ backend/config/settings.py
git commit -m "Messagerie : app messaging avec MessageThread et Message"
```

---

### Task 2 : Création et liste des fils (`ThreadListCreateView`)

**Files:**
- Create: `backend/apps/messaging/serializers.py`
- Create: `backend/apps/messaging/views.py`
- Create: `backend/apps/messaging/urls.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/apps/notifications/models.py`
- Test: `backend/apps/messaging/tests/test_threads.py`

**Interfaces:**
- Consumes: `MessageThread`, `Message` (Task 1) ; `apps.contributions.permissions.IsKycValidated` ; `apps.notifications.services.notify_user`.
- Produces: `GET/POST /api/messagerie/threads/` ; `ThreadSerializer`, `ThreadCreateSerializer`, `_display_name(user) -> str` (réutilisé par les tâches suivantes).

- [ ] **Step 1 : Ajouter le type de notification**

Dans `backend/apps/notifications/models.py`, ajouter un choix à `Notification.Kind` (juste après `PAYOUT_RELEASED`) :

```python
        MESSAGE_RECEIVED = "MESSAGE_RECEIVED", "Nouveau message reçu"
```

```bash
python manage.py makemigrations notifications
python manage.py migrate
```

- [ ] **Step 2 : Écrire les tests qui échouent**

Créer `backend/apps/messaging/tests/test_threads.py` :

```python
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import MessageThread
from apps.notifications.models import Notification

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
def test_utilisateur_kyc_valide_peut_creer_un_fil():
    owner = make_user("owner-t1@test.sn", User.Role.PORTEUR)
    other = make_user("other-t1@test.sn")
    campaign = make_campaign(owner)

    response = authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour, une question sur votre projet."},
        format="json",
    )

    assert response.status_code == 201
    assert MessageThread.objects.filter(campaign=campaign, other_user=other).exists()
    assert Notification.objects.filter(
        recipient=owner, kind=Notification.Kind.MESSAGE_RECEIVED
    ).exists()


@pytest.mark.django_db
def test_utilisateur_non_kyc_valide_ne_peut_pas_creer_un_fil():
    owner = make_user("owner-t2@test.sn", User.Role.PORTEUR)
    other = make_user("other-t2@test.sn", kyc=User.KycStatus.EN_ATTENTE)
    campaign = make_campaign(owner)

    response = authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_porteur_ne_peut_pas_creer_un_fil_sur_sa_propre_campagne():
    owner = make_user("owner-t3@test.sn", User.Role.PORTEUR)
    campaign = make_campaign(owner)

    response = authenticated_client(owner).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_fil_refuse_sur_campagne_en_brouillon():
    owner = make_user("owner-t4@test.sn", User.Role.PORTEUR)
    other = make_user("other-t4@test.sn")
    campaign = make_campaign(owner, status=Campaign.Status.BROUILLON)

    response = authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_liste_des_fils_pour_le_porteur_et_lautre_utilisateur():
    owner = make_user("owner-t5@test.sn", User.Role.PORTEUR)
    other = make_user("other-t5@test.sn")
    campaign = make_campaign(owner)
    authenticated_client(other).post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour"},
        format="json",
    )

    owner_response = authenticated_client(owner).get("/api/messagerie/threads/")
    other_response = authenticated_client(other).get("/api/messagerie/threads/")

    assert owner_response.status_code == 200
    assert len(owner_response.data) == 1
    assert other_response.status_code == 200
    assert len(other_response.data) == 1
    assert owner_response.data[0]["other_participant"]["id"] == other.id
    assert other_response.data[0]["other_participant"]["id"] == owner.id
```

- [ ] **Step 3 : Vérifier l'échec**

```bash
pytest apps/messaging/tests/test_threads.py -v
```

Expected: FAIL (404 — aucune route `/api/messagerie/threads/` n'existe encore).

- [ ] **Step 4 : Serializers**

Créer `backend/apps/messaging/serializers.py` :

```python
from rest_framework import serializers

from apps.campaigns.models import Campaign

from .models import Message, MessageThread


def _display_name(user):
    initial = f" {user.last_name[:1].upper()}." if user.last_name else ""
    return f"{user.first_name or 'Utilisateur'}{initial}"


class ThreadCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ["slug", "title"]


class ThreadSerializer(serializers.ModelSerializer):
    campaign = ThreadCampaignSerializer(read_only=True)
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "campaign",
            "other_participant",
            "last_message",
            "unread_count",
            "created_at",
        ]

    def get_other_participant(self, obj):
        request_user = self.context["request"].user
        other = obj.campaign.owner if request_user.id == obj.other_user_id else obj.other_user
        return {"id": other.id, "name": _display_name(other)}

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        if not message:
            return None
        return {
            "body": message.body,
            "created_at": message.created_at,
            "sender_id": message.sender_id,
        }

    def get_unread_count(self, obj):
        request_user = self.context["request"].user
        return obj.messages.filter(read_at__isnull=True).exclude(sender_id=request_user.id).count()


class ThreadCreateSerializer(serializers.Serializer):
    campaign_slug = serializers.SlugField()
    body = serializers.CharField(max_length=3000)

    def validate(self, attrs):
        try:
            campaign = Campaign.objects.get(slug=attrs["campaign_slug"])
        except Campaign.DoesNotExist:
            raise serializers.ValidationError(
                {"campaign_slug": "Cette campagne n'existe pas."}
            )
        if campaign.owner_id == self.context["request"].user.id:
            raise serializers.ValidationError(
                {"campaign_slug": "Vous ne pouvez pas vous écrire à vous-même."}
            )
        if campaign.status not in (Campaign.Status.PUBLIEE, Campaign.Status.CLOTUREE):
            raise serializers.ValidationError(
                {"campaign_slug": "Cette campagne n'accepte pas de messages."}
            )
        attrs["campaign"] = campaign
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    is_mine = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender_name", "is_mine", "body", "created_at", "read_at"]

    def get_is_mine(self, obj):
        return obj.sender_id == self.context["request"].user.id

    def get_sender_name(self, obj):
        return _display_name(obj.sender)


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=3000)
```

- [ ] **Step 5 : Vue de création/liste**

Créer `backend/apps/messaging/views.py` :

```python
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.contributions.permissions import IsKycValidated
from apps.notifications.models import Notification
from apps.notifications.services import notify_user

from .models import Message, MessageThread
from .serializers import (
    ThreadCreateSerializer,
    ThreadSerializer,
    _display_name,
)


class ThreadListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsKycValidated]

    def get_serializer_class(self):
        return ThreadSerializer

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        user = self.request.user
        return (
            MessageThread.objects.filter(Q(campaign__owner=user) | Q(other_user=user))
            .select_related("campaign", "campaign__owner", "other_user")
        )

    def create(self, request, *args, **kwargs):
        serializer = ThreadCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        campaign = serializer.validated_data["campaign"]
        body = serializer.validated_data["body"]

        thread, _created = MessageThread.objects.get_or_create(
            campaign=campaign, other_user=request.user
        )
        message = Message.objects.create(thread=thread, sender=request.user, body=body)
        thread.last_message_at = message.created_at
        thread.save(update_fields=["last_message_at"])

        notify_user(
            recipient=campaign.owner,
            kind=Notification.Kind.MESSAGE_RECEIVED,
            subject="Nouveau message reçu",
            message=(
                f"{_display_name(request.user)} vous a envoyé un message à propos de "
                f"« {campaign.title} »."
            ),
            action_url="/compte?onglet=messages",
        )
        return Response(
            ThreadSerializer(thread, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 6 : URLs**

Créer `backend/apps/messaging/urls.py` :

```python
from django.urls import path

from .views import ThreadListCreateView

urlpatterns = [
    path("threads/", ThreadListCreateView.as_view(), name="thread_list_create"),
]
```

Dans `backend/config/urls.py`, ajouter la route (après `"api/backoffice/"`) :

```python
    path("api/messagerie/", include("apps.messaging.urls")),
```

- [ ] **Step 7 : Vérifier**

```bash
pytest apps/messaging/tests/test_threads.py -v
```

Expected: `5 passed`.

- [ ] **Step 8 : Commit**

```bash
git add backend/apps/messaging/ backend/apps/notifications/ backend/config/urls.py
git commit -m "Messagerie : création et liste des conversations"
```

---

### Task 3 : Messages d'un fil (liste, envoi, marquage lu)

**Files:**
- Modify: `backend/apps/messaging/views.py`
- Modify: `backend/apps/messaging/urls.py`
- Test: `backend/apps/messaging/tests/test_messages.py`

**Interfaces:**
- Consumes: `MessageSerializer`, `MessageCreateSerializer` (Task 2), `MessageThread`, `Message` (Task 1).
- Produces: `GET/POST /api/messagerie/threads/<thread_id>/messages/`.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/messaging/tests/test_messages.py` :

```python
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageThread
from apps.notifications.models import Notification

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


def _creer_fil(owner, other, campaign):
    client = authenticated_client(other)
    response = client.post(
        "/api/messagerie/threads/",
        {"campaign_slug": campaign.slug, "body": "Bonjour, une question."},
        format="json",
    )
    return MessageThread.objects.get(pk=response.data["id"])


@pytest.mark.django_db
def test_le_porteur_peut_repondre_a_un_fil():
    owner = make_user("owner-m1@test.sn", User.Role.PORTEUR)
    other = make_user("other-m1@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    response = authenticated_client(owner).post(
        f"/api/messagerie/threads/{thread.id}/messages/",
        {"body": "Merci pour votre question, je réponds tout de suite."},
        format="json",
    )

    assert response.status_code == 201
    assert thread.messages.count() == 2
    assert Notification.objects.filter(
        recipient=other, kind=Notification.Kind.MESSAGE_RECEIVED
    ).count() == 1


@pytest.mark.django_db
def test_un_tiers_ne_peut_pas_consulter_le_fil():
    owner = make_user("owner-m2@test.sn", User.Role.PORTEUR)
    other = make_user("other-m2@test.sn")
    tiers = make_user("tiers-m2@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    response = authenticated_client(tiers).get(f"/api/messagerie/threads/{thread.id}/messages/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_consulter_le_fil_marque_les_messages_recus_comme_lus():
    owner = make_user("owner-m3@test.sn", User.Role.PORTEUR)
    other = make_user("other-m3@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    authenticated_client(owner).get(f"/api/messagerie/threads/{thread.id}/messages/")

    message = Message.objects.get(thread=thread, sender=other)
    message.refresh_from_db()
    assert message.read_at is not None


@pytest.mark.django_db
def test_lecture_ne_marque_pas_ses_propres_messages():
    owner = make_user("owner-m4@test.sn", User.Role.PORTEUR)
    other = make_user("other-m4@test.sn")
    campaign = make_campaign(owner)
    thread = _creer_fil(owner, other, campaign)

    authenticated_client(other).get(f"/api/messagerie/threads/{thread.id}/messages/")

    message = Message.objects.get(thread=thread, sender=other)
    message.refresh_from_db()
    assert message.read_at is None
```

- [ ] **Step 2 : Vérifier l'échec**

```bash
pytest apps/messaging/tests/test_messages.py -v
```

Expected: FAIL (404 — route inexistante).

- [ ] **Step 3 : Implémenter la vue**

Dans `backend/apps/messaging/views.py`, ajouter les imports :

```python
from django.http import Http404
from django.shortcuts import get_object_or_404

from .serializers import MessageCreateSerializer, MessageSerializer
```

Puis ajouter la vue (à la fin du fichier) :

```python
class ThreadMessagesView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsKycValidated]

    def get_serializer_context(self):
        return {"request": self.request}

    def _get_thread(self):
        thread = get_object_or_404(
            MessageThread.objects.select_related("campaign", "campaign__owner", "other_user"),
            pk=self.kwargs["thread_id"],
        )
        user = self.request.user
        if user.id not in (thread.campaign.owner_id, thread.other_user_id):
            raise Http404
        return thread

    def get_queryset(self):
        thread = self._get_thread()
        return thread.messages.select_related("sender").order_by("created_at")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        thread = self._get_thread()
        thread.messages.filter(read_at__isnull=True).exclude(sender_id=request.user.id).update(
            read_at=timezone.now()
        )
        return response

    def create(self, request, *args, **kwargs):
        thread = self._get_thread()
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(
            thread=thread, sender=request.user, body=serializer.validated_data["body"]
        )
        thread.last_message_at = message.created_at
        thread.save(update_fields=["last_message_at"])

        recipient = (
            thread.other_user
            if request.user.id == thread.campaign.owner_id
            else thread.campaign.owner
        )
        notify_user(
            recipient=recipient,
            kind=Notification.Kind.MESSAGE_RECEIVED,
            subject="Nouveau message reçu",
            message=(
                f"{_display_name(request.user)} vous a envoyé un message à propos de "
                f"« {thread.campaign.title} »."
            ),
            action_url="/compte?onglet=messages",
        )
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 4 : Ajouter la route**

Dans `backend/apps/messaging/urls.py` :

```python
from django.urls import path

from .views import ThreadListCreateView, ThreadMessagesView

urlpatterns = [
    path("threads/", ThreadListCreateView.as_view(), name="thread_list_create"),
    path(
        "threads/<int:thread_id>/messages/",
        ThreadMessagesView.as_view(),
        name="thread_messages",
    ),
]
```

- [ ] **Step 5 : Vérifier**

```bash
pytest apps/messaging/tests/test_messages.py -v
```

Expected: `4 passed`. Puis la suite complète :

```bash
pytest -q
```

Expected: tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
git add backend/apps/messaging/
git commit -m "Messagerie : messages d'un fil, réponse et marquage lu"
```

---

### Task 4 : Signalement de message (`MessageReport`)

**Files:**
- Modify: `backend/apps/messaging/models.py`
- Modify: `backend/apps/messaging/serializers.py`
- Modify: `backend/apps/messaging/views.py`
- Modify: `backend/apps/messaging/urls.py`
- Modify: `backend/apps/messaging/admin.py`
- Test: `backend/apps/messaging/tests/test_reports.py`

**Interfaces:**
- Consumes: `Message` (Task 1).
- Produces: modèle `MessageReport` ; `POST /api/messagerie/messages/<message_id>/report/`.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/messaging/tests/test_reports.py` :

```python
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageReport, MessageThread

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
def test_signalement_dun_message():
    owner = make_user("owner-r1@test.sn", User.Role.PORTEUR)
    other = make_user("other-r1@test.sn")
    campaign = make_campaign(owner)
    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Contenu litigieux")

    response = authenticated_client(owner).post(
        f"/api/messagerie/messages/{message.id}/report/",
        {"reason": "CONTENU_INAPPROPRIE", "details": "Message déplacé."},
        format="json",
    )

    assert response.status_code == 201
    report = MessageReport.objects.get(message=message)
    assert report.reporter == owner
    assert report.status == MessageReport.Status.NOUVEAU


@pytest.mark.django_db
def test_un_tiers_ne_peut_pas_signaler_un_message_hors_de_son_fil():
    owner = make_user("owner-r2@test.sn", User.Role.PORTEUR)
    other = make_user("other-r2@test.sn")
    tiers = make_user("tiers-r2@test.sn")
    campaign = make_campaign(owner)
    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Contenu")

    response = authenticated_client(tiers).post(
        f"/api/messagerie/messages/{message.id}/report/",
        {"reason": "AUTRE", "details": "Détails."},
        format="json",
    )

    assert response.status_code == 404
```

- [ ] **Step 2 : Vérifier l'échec**

```bash
pytest apps/messaging/tests/test_reports.py -v
```

Expected: FAIL (`ImportError: cannot import name 'MessageReport'`).

- [ ] **Step 3 : Ajouter le modèle**

Dans `backend/apps/messaging/models.py`, ajouter à la fin du fichier :

```python
class MessageReport(models.Model):
    """Signalement traçable d'un message par un participant du fil."""

    class Reason(models.TextChoices):
        SPAM = "SPAM", "Spam ou sollicitation"
        HARCELEMENT = "HARCELEMENT", "Harcèlement"
        CONTENU_INAPPROPRIE = "CONTENU_INAPPROPRIE", "Contenu inapproprié"
        TENTATIVE_CONTOURNEMENT = "TENTATIVE_CONTOURNEMENT", "Tentative de contournement de la plateforme"
        AUTRE = "AUTRE", "Autre motif"

    class Status(models.TextChoices):
        NOUVEAU = "NOUVEAU", "Nouveau"
        EN_COURS = "EN_COURS", "En cours d’examen"
        RESOLU = "RESOLU", "Résolu"
        CLASSE = "CLASSE", "Classé sans suite"

    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="reports", verbose_name="message"
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reports",
        verbose_name="auteur du signalement",
    )
    reason = models.CharField("motif", max_length=30, choices=Reason.choices)
    details = models.TextField("précisions", max_length=1500)
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.NOUVEAU
    )
    admin_note = models.TextField("note interne", blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_message_reports",
        verbose_name="attribué à",
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        verbose_name = "signalement de message"
        verbose_name_plural = "signalements de messages"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Signalement — message #{self.message_id}"
```

- [ ] **Step 4 : Serializer**

Dans `backend/apps/messaging/serializers.py`, ajouter à la fin :

```python
from .models import MessageReport


class MessageReportCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=MessageReport.Reason.choices)
    details = serializers.CharField(max_length=1500)
```

Attention : `from .models import Message, MessageThread` est déjà importé en tête du fichier — ajouter `MessageReport` à cet import existant plutôt que de dupliquer l'import :

```python
from .models import Message, MessageReport, MessageThread
```

(et retirer le second `from .models import MessageReport` ajouté ci-dessus).

- [ ] **Step 5 : Vue de signalement**

Dans `backend/apps/messaging/views.py`, ajouter à l'import des modèles :

```python
from .models import Message, MessageReport, MessageThread
```

Ajouter l'import du serializer :

```python
from .serializers import (
    MessageCreateSerializer,
    MessageReportCreateSerializer,
    MessageSerializer,
    ThreadCreateSerializer,
    ThreadSerializer,
    _display_name,
)
```

Ajouter la vue (à la fin du fichier) :

```python
class MessageReportCreateView(generics.CreateAPIView):
    serializer_class = MessageReportCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        message = get_object_or_404(
            Message.objects.select_related("thread__campaign", "thread__other_user"),
            pk=self.kwargs["message_id"],
        )
        thread = message.thread
        if request.user.id not in (thread.campaign.owner_id, thread.other_user_id):
            raise Http404
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        MessageReport.objects.create(
            message=message,
            reporter=request.user,
            reason=serializer.validated_data["reason"],
            details=serializer.validated_data["details"],
        )
        return Response({"detail": "Signalement enregistré."}, status=status.HTTP_201_CREATED)
```

- [ ] **Step 6 : Route**

Dans `backend/apps/messaging/urls.py` :

```python
from django.urls import path

from .views import MessageReportCreateView, ThreadListCreateView, ThreadMessagesView

urlpatterns = [
    path("threads/", ThreadListCreateView.as_view(), name="thread_list_create"),
    path(
        "threads/<int:thread_id>/messages/",
        ThreadMessagesView.as_view(),
        name="thread_messages",
    ),
    path(
        "messages/<int:message_id>/report/",
        MessageReportCreateView.as_view(),
        name="message_report",
    ),
]
```

- [ ] **Step 7 : Admin (lecture seule)**

Dans `backend/apps/messaging/admin.py`, ajouter :

```python
from .models import Message, MessageReport, MessageThread
```

```python
@admin.register(MessageReport)
class MessageReportAdmin(admin.ModelAdmin):
    list_display = ("message", "reporter", "reason", "status", "created_at")
    list_filter = ("status", "reason")
    search_fields = ("reporter__email", "details")
    readonly_fields = ("message", "reporter", "reason", "details", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False
```

- [ ] **Step 8 : Migration et vérification**

```bash
python manage.py makemigrations messaging
python manage.py migrate
pytest apps/messaging/tests/test_reports.py -v
```

Expected: `2 passed`. Puis la suite complète :

```bash
pytest -q
```

Expected: tous les tests passent.

- [ ] **Step 9 : Commit**

```bash
git add backend/apps/messaging/
git commit -m "Messagerie : signalement de message"
```

---

### Task 5 : Back-office — revue des signalements de messages

**Files:**
- Modify: `backend/apps/backoffice/serializers.py`
- Modify: `backend/apps/backoffice/views.py`
- Modify: `backend/apps/backoffice/urls.py`
- Test: `backend/apps/backoffice/tests/test_message_reports.py`

**Interfaces:**
- Consumes: `MessageReport` (Task 4).
- Produces: `PATCH /api/backoffice/message-reports/<report_id>/` ; extension de `WorkAssignmentView` (kind `"message_report"`) ; extension de `DashboardView` (clé `message_reports`, métrique `open_message_reports`).

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/backoffice/tests/test_message_reports.py` :

```python
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.campaigns.models import Campaign
from apps.messaging.models import Message, MessageReport, MessageThread

User = get_user_model()


def _admin():
    return User.objects.create_superuser(email="admin-msgreport@test.sn", password="MotDePasse123!")


def _signalement():
    owner = User.objects.create_user(
        email="owner-mr@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )
    other = User.objects.create_user(email="other-mr@test.sn", password="MotDePasse123!")
    campaign = Campaign.objects.create(
        owner=owner,
        title="Projet signalé",
        summary="Résumé.",
        description="Description.",
        category=Campaign.Category.EDUCATION,
        goal_amount=100_000,
        deadline=timezone.localdate() + timedelta(days=30),
        status=Campaign.Status.PUBLIEE,
    )
    thread = MessageThread.objects.create(campaign=campaign, other_user=other)
    message = Message.objects.create(thread=thread, sender=other, body="Contenu")
    return MessageReport.objects.create(
        message=message, reporter=owner, reason="AUTRE", details="Détails."
    )


@pytest.mark.django_db
def test_admin_peut_mettre_a_jour_un_signalement_de_message():
    report = _signalement()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.patch(
        f"/api/backoffice/message-reports/{report.id}/",
        {"status": "RESOLU", "admin_note": "Traité."},
        format="json",
    )

    assert response.status_code == 200
    report.refresh_from_db()
    assert report.status == "RESOLU"
    assert report.admin_note == "Traité."


@pytest.mark.django_db
def test_non_admin_ne_peut_pas_mettre_a_jour_un_signalement():
    report = _signalement()
    client = APIClient()
    client.force_authenticate(report.reporter)

    response = client.patch(
        f"/api/backoffice/message-reports/{report.id}/",
        {"status": "RESOLU"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_dashboard_expose_les_signalements_de_messages():
    report = _signalement()
    admin = _admin()
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get("/api/backoffice/dashboard/")

    assert response.status_code == 200
    assert response.data["metrics"]["open_message_reports"] == 1
    assert len(response.data["message_reports"]) == 1
    assert response.data["message_reports"][0]["id"] == report.id
```

- [ ] **Step 2 : Vérifier l'échec**

```bash
pytest apps/backoffice/tests/test_message_reports.py -v
```

Expected: FAIL (404 sur la route `message-reports`, et `KeyError: 'open_message_reports'`).

- [ ] **Step 3 : Serializer de revue**

Dans `backend/apps/backoffice/serializers.py`, ajouter l'import :

```python
from apps.messaging.models import MessageReport
```

Ajouter le serializer (à côté de `ReportReviewSerializer`) :

```python
class MessageReportReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=MessageReport.Status.choices)
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    assigned_to = serializers.IntegerField(required=False, allow_null=True)
```

- [ ] **Step 4 : Étendre `WorkAssignmentSerializer`**

Dans `backend/apps/backoffice/serializers.py`, modifier :

```python
class WorkAssignmentSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["kyc", "campaign", "report", "support", "message_report"])
    object_id = serializers.IntegerField()
    admin_id = serializers.IntegerField(required=False, allow_null=True)
```

- [ ] **Step 5 : Vue de revue et extension de `WorkAssignmentView`**

Dans `backend/apps/backoffice/views.py`, ajouter l'import :

```python
from apps.messaging.models import MessageReport
```

Ajouter l'import du serializer dans le bloc d'import existant depuis `.serializers` :

```python
from .serializers import (
    CampaignDecisionSerializer,
    CampaignWorkflowSerializer,
    KycDecisionSerializer,
    MessageReportReviewSerializer,
    ReportReviewSerializer,
    SupportReplySerializer,
    SupportReviewSerializer,
    UserManagementSerializer,
    WorkAssignmentSerializer,
)
```

Étendre le mapping de `WorkAssignmentView.post` :

```python
        mapping = {
            "kyc": (User, "kyc_assigned_to"),
            "campaign": (Campaign, "moderation_assigned_to"),
            "report": (CampaignReport, "assigned_to"),
            "support": (SupportRequest, "assigned_to"),
            "message_report": (MessageReport, "assigned_to"),
        }
```

Ajouter la vue de revue (à côté de `ReportReviewView`) :

```python
class MessageReportReviewView(APIView):
    permission_classes = [IsJappandaleAdmin]

    def patch(self, request, report_id):
        serializer = MessageReportReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = get_object_or_404(MessageReport, pk=report_id)
        report.status = serializer.validated_data["status"]
        report.admin_note = serializer.validated_data.get("admin_note", "").strip()
        if "assigned_to" in serializer.validated_data:
            report.assigned_to = _admin_or_none(serializer.validated_data["assigned_to"])
        report.save(update_fields=["status", "admin_note", "assigned_to", "updated_at"])
        return Response({"detail": "Signalement mis à jour."})
```

- [ ] **Step 6 : Étendre `DashboardView`**

Dans `backend/apps/backoffice/views.py`, dans `DashboardView.get`, ajouter après la définition de `open_support` :

```python
        open_message_reports = (
            MessageReport.objects.exclude(
                status__in=[MessageReport.Status.RESOLU, MessageReport.Status.CLASSE]
            )
            .select_related("message__thread__campaign", "reporter", "assigned_to")
            .order_by("created_at")[:30]
        )
```

Dans le dictionnaire `"metrics": {...}`, ajouter (à côté de `"open_support"`) :

```python
                    "open_message_reports": MessageReport.objects.exclude(
                        status__in=[MessageReport.Status.RESOLU, MessageReport.Status.CLASSE]
                    ).count(),
```

Dans le dictionnaire de réponse, ajouter la clé `"message_reports"` (à côté de `"reports"`) :

```python
                "message_reports": [
                    {
                        "id": report.id,
                        "campaign": {
                            "slug": report.message.thread.campaign.slug,
                            "title": report.message.thread.campaign.title,
                        },
                        "message_excerpt": report.message.body[:200],
                        "reporter": _person(report.reporter),
                        "reason": report.get_reason_display(),
                        "details": report.details,
                        "status": report.status,
                        "admin_note": report.admin_note,
                        "created_at": report.created_at,
                        "assigned_to": _person(report.assigned_to) if report.assigned_to else None,
                    }
                    for report in open_message_reports
                ],
```

- [ ] **Step 7 : Route**

Dans `backend/apps/backoffice/urls.py`, ajouter l'import :

```python
from .views import (
    CampaignDecisionView,
    CampaignPayoutView,
    CampaignWorkflowView,
    DashboardView,
    KycDocumentFileView,
    KycDecisionView,
    MessageReportReviewView,
    ReportReviewView,
    ExportDownloadView,
    ExportTicketView,
    SupportReplyView,
    SupportReviewView,
    UserListView,
    UserManagementView,
    WorkAssignmentView,
)
```

Ajouter la route (après celle des signalements de campagnes) :

```python
    path("message-reports/<int:report_id>/", MessageReportReviewView.as_view(), name="message-report-review"),
```

- [ ] **Step 8 : Vérifier**

```bash
pytest apps/backoffice/tests/test_message_reports.py -v
```

Expected: `3 passed`. Puis la suite complète :

```bash
pytest -q
```

Expected: tous les tests passent.

- [ ] **Step 9 : Commit**

```bash
git add backend/apps/backoffice/
git commit -m "Back-office : revue des signalements de messages"
```

---

### Task 6 : Frontend — types + onglet « Messages » dans l'espace compte

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Create: `frontend/src/components/account/MessagesSection.tsx`
- Modify: `frontend/src/pages/AccountPage.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/messagerie/threads/`, `GET/POST /api/messagerie/threads/<id>/messages/`, `POST /api/messagerie/messages/<id>/report/` (Tasks 2-4).
- Produces: types `MessageThread`, `ThreadMessage`, `MessageReportReason` ; composant `MessagesSection`.

- [ ] **Step 1 : Types**

Dans `frontend/src/lib/types.ts`, ajouter après `ReceivedContribution` :

```typescript
export interface MessageThreadListItem {
  id: number;
  campaign: { slug: string; title: string };
  other_participant: { id: number; name: string };
  last_message: { body: string; created_at: string; sender_id: number } | null;
  unread_count: number;
  created_at: string;
}

export interface ThreadMessage {
  id: number;
  sender_name: string;
  is_mine: boolean;
  body: string;
  created_at: string;
  read_at: string | null;
}

export type MessageReportReason =
  | "SPAM"
  | "HARCELEMENT"
  | "CONTENU_INAPPROPRIE"
  | "TENTATIVE_CONTOURNEMENT"
  | "AUTRE";
```

- [ ] **Step 2 : Composant `MessagesSection`**

Créer `frontend/src/components/account/MessagesSection.tsx` :

```tsx
import { useEffect, useRef, useState } from "react"
import { Flag, Inbox, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import type { MessageReportReason, MessageThreadListItem, ThreadMessage } from "@/lib/types"

const reasonLabels: Record<MessageReportReason, string> = {
  SPAM: "Spam ou sollicitation",
  HARCELEMENT: "Harcèlement",
  CONTENU_INAPPROPRIE: "Contenu inapproprié",
  TENTATIVE_CONTOURNEMENT: "Tentative de contournement de la plateforme",
  AUTRE: "Autre motif",
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ReportForm({ onSubmit, onCancel }: { onSubmit: (reason: MessageReportReason, details: string) => Promise<void>; onCancel: () => void }) {
  const [reason, setReason] = useState<MessageReportReason>("AUTRE")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <select
        aria-label="Motif du signalement"
        value={reason}
        onChange={(event) => setReason(event.target.value as MessageReportReason)}
        className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink"
      >
        {Object.entries(reasonLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        aria-label="Précisions"
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={2}
        maxLength={1500}
        placeholder="Précisions (facultatif)"
        className="w-full resize-y rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-8 rounded-full px-3 text-xs">
          Annuler
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={() => {
            setSubmitting(true)
            void onSubmit(reason, details).finally(() => setSubmitting(false))
          }}
          className="h-8 rounded-full bg-red-600 px-3 text-xs text-white hover:bg-red-700"
        >
          Signaler
        </Button>
      </div>
    </div>
  )
}

function Conversation({ thread }: { thread: MessageThreadListItem }) {
  const { authFetch } = useAuth()
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [reportingId, setReportingId] = useState<number | null>(null)
  const [reportedIds, setReportedIds] = useState<number[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = () =>
    authFetch(`/messagerie/threads/${thread.id}/messages/`).then((data) => setMessages(data as ThreadMessage[]))

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    try {
      await authFetch(`/messagerie/threads/${thread.id}/messages/`, {
        method: "POST",
        body: JSON.stringify({ body }),
      })
      setBody("")
      await load()
    } finally {
      setSending(false)
    }
  }

  const report = async (messageId: number, reason: MessageReportReason, details: string) => {
    await authFetch(`/messagerie/messages/${messageId}/report/`, {
      method: "POST",
      body: JSON.stringify({ reason, details }),
    })
    setReportedIds((current) => [...current, messageId])
    setReportingId(null)
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border border-black/5 bg-surface-alt">
      <header className="border-b border-black/5 px-4 py-3">
        <p className="font-semibold text-ink">{thread.other_participant.name}</p>
        <p className="text-xs text-ink-muted">{thread.campaign.title}</p>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex flex-col ${message.is_mine ? "items-end" : "items-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${message.is_mine ? "bg-gold/20 text-ink" : "bg-white text-ink shadow-sm"}`}>
              {message.body}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
              {formatDateTime(message.created_at)}
              {!message.is_mine && !reportedIds.includes(message.id) && (
                <button type="button" onClick={() => setReportingId(message.id)} className="inline-flex items-center gap-1 text-ink-muted hover:text-red-700">
                  <Flag className="size-3" />
                  Signaler
                </button>
              )}
              {reportedIds.includes(message.id) && <span className="text-emerald-700">Signalé</span>}
            </div>
            {reportingId === message.id && (
              <div className="w-full max-w-[80%]">
                <ReportForm onSubmit={(reason, details) => report(message.id, reason, details)} onCancel={() => setReportingId(null)} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-black/5 p-3">
        <textarea
          aria-label="Votre message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={1}
          maxLength={3000}
          placeholder="Écrivez votre message…"
          className="flex-1 resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-gold/20"
        />
        <Button type="button" disabled={sending || !body.trim()} onClick={() => void send()} className="h-10 shrink-0 rounded-full bg-gold px-4 text-ink hover:bg-gold-light">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function MessagesSection() {
  const { authFetch } = useAuth()
  const [threads, setThreads] = useState<MessageThreadListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const loadThreads = () =>
    authFetch("/messagerie/threads/").then((data) => setThreads(data as MessageThreadListItem[]))

  useEffect(() => {
    void loadThreads().finally(() => setLoading(false))
  }, [])

  const selected = threads.find((thread) => thread.id === selectedId) ?? null

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-black/[0.05]" />
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-surface-alt p-8 text-center">
        <Inbox className="mx-auto size-6 text-gold-dark" />
        <p className="mt-3 text-sm text-ink-secondary">Aucune conversation pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <ul className="space-y-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => setSelectedId(thread.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selectedId === thread.id ? "border-gold-dark bg-gold/10" : "border-black/5 bg-surface hover:border-gold/40"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{thread.other_participant.name}</span>
                {thread.unread_count > 0 && (
                  <span className="rounded-full bg-gold-dark px-2 py-0.5 text-[11px] font-semibold text-white">
                    {thread.unread_count}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">{thread.campaign.title}</span>
              {thread.last_message && <span className="mt-1 block truncate text-xs text-ink-secondary">{thread.last_message.body}</span>}
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <Conversation key={selected.id} thread={selected} />
      ) : (
        <div className="flex h-[28rem] items-center justify-center rounded-2xl border border-dashed border-black/10 text-sm text-ink-muted">
          Sélectionnez une conversation.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Onglet dans `AccountPage.tsx`**

Dans `frontend/src/pages/AccountPage.tsx`, ajouter l'import :

```tsx
import { MessagesSection } from "@/components/account/MessagesSection"
```

Modifier le type et les icônes importées :

```tsx
import { Camera, IdCard, LoaderCircle, MessageCircle, Trash2, UserRound, WalletCards } from "lucide-react"
```

```tsx
type TabKey = "profil" | "kyc" | "contributions" | "messages"
```

```tsx
  const requestedTab = searchParams.get("onglet")
  const activeTab: TabKey =
    requestedTab === "kyc" || requestedTab === "contributions" || requestedTab === "messages"
      ? requestedTab
      : "profil"
```

```tsx
  const tabs: { key: TabKey; label: string; icon: typeof UserRound; alert?: boolean }[] = [
    { key: "profil", label: "Informations personnelles", icon: UserRound },
    { key: "kyc", label: "Vérification d'identité", icon: IdCard, alert: user.kyc_status !== "VALIDE" },
    { key: "contributions", label: "Contributions", icon: WalletCards },
    { key: "messages", label: "Messages", icon: MessageCircle },
  ]
```

```tsx
  let tabContent: ReactNode
  if (activeTab === "kyc") {
    tabContent = <KycSection status={user.kyc_status} role={user.role} />
  } else if (activeTab === "contributions") {
    tabContent = (
      <div className="space-y-6">
        <MyContributions />
        {user.role === "PORTEUR" && <ReceivedContributions />}
      </div>
    )
  } else if (activeTab === "messages") {
    tabContent = <MessagesSection />
  } else {
```

- [ ] **Step 4 : Vérifier la compilation**

```bash
npm run build
npm test -- --run
```

Expected: build sans erreur TypeScript, 6 tests toujours verts.

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/components/account/MessagesSection.tsx frontend/src/pages/AccountPage.tsx
git commit -m "Frontend : onglet Messages dans l'espace compte"
```

---

### Task 7 : Frontend — « Contacter le porteur » sur la page de campagne

**Files:**
- Modify: `frontend/src/pages/CampaignDetailPage.tsx`

**Interfaces:**
- Consumes: `POST /api/messagerie/threads/` (Task 2), `useAuth()` (`user`, `authFetch`).
- Produces: composant `ContactOwnerCard` inséré dans la section « Le porteur du projet ».

- [ ] **Step 1 : Ajouter le composant**

Dans `frontend/src/pages/CampaignDetailPage.tsx`, ajouter l'import :

```tsx
import { useAuth } from "@/lib/auth"
```

Ajouter, juste après la fonction `ownerName` :

```tsx
function ContactOwnerCard({ campaign }: { campaign: CampaignDetail }) {
  const { user, authFetch } = useAuth()
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <p className="mt-4 text-sm text-ink-secondary">
        <Link to="/connexion" className="font-semibold text-gold-dark hover:underline">
          Connectez-vous
        </Link>{" "}
        pour contacter le porteur de ce projet.
      </p>
    )
  }

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      await authFetch("/messagerie/threads/", {
        method: "POST",
        body: JSON.stringify({ campaign_slug: campaign.slug, body }),
      })
      setSent(true)
      setBody("")
    } catch {
      setError("Impossible d’envoyer ce message. Vérifiez votre identité (KYC) et réessayez.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <p className="mt-4 text-sm text-emerald-700">
        Message envoyé. Retrouvez la conversation dans{" "}
        <Link to="/compte?onglet=messages" className="font-semibold underline">
          votre espace Messages
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="mt-4 space-y-2">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <textarea
        aria-label="Votre message au porteur"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={3000}
        placeholder="Posez votre question au porteur du projet…"
        className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-gold-dark/30"
      />
      <Button type="button" disabled={sending || !body.trim()} onClick={() => void send()} className="rounded-full bg-gold px-5 text-ink hover:bg-gold-light">
        {sending ? "Envoi…" : "Contacter le porteur"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2 : Insérer le composant dans la section « Le porteur du projet »**

Repérer la ligne (section porteur, autour de la ligne 404) :

```tsx
{(campaign.owner.organization_name || campaign.owner.bio) && <section className="mt-10 rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm" aria-labelledby="porteur-profil"><p className="text-xs font-semibold tracking-[3px] text-gold-dark uppercase">Le porteur du projet</p><h2 id="porteur-profil" className="mt-3 font-heading text-2xl font-bold text-ink">{campaign.owner.organization_name || ownerName(campaign.owner)}</h2>{campaign.owner.city && <p className="mt-1 text-sm text-ink-muted">{campaign.owner.city}</p>}{campaign.owner.bio && <p className="mt-4 leading-relaxed text-ink-secondary">{campaign.owner.bio}</p>}</section>}
```

La remplacer par (ajout de `<ContactOwnerCard campaign={campaign} />` avant la fermeture de `</section>`, et retrait de la condition sur `organization_name`/`bio` pour que la section — et donc le bouton de contact — reste visible même si le porteur n'a pas rempli sa bio) :

```tsx
<section className="mt-10 rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm" aria-labelledby="porteur-profil">
  <p className="text-xs font-semibold tracking-[3px] text-gold-dark uppercase">Le porteur du projet</p>
  <h2 id="porteur-profil" className="mt-3 font-heading text-2xl font-bold text-ink">{campaign.owner.organization_name || ownerName(campaign.owner)}</h2>
  {campaign.owner.city && <p className="mt-1 text-sm text-ink-muted">{campaign.owner.city}</p>}
  {campaign.owner.bio && <p className="mt-4 leading-relaxed text-ink-secondary">{campaign.owner.bio}</p>}
  <ContactOwnerCard campaign={campaign} />
</section>
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npm run build
npm test -- --run
```

Expected: build sans erreur TypeScript, 6 tests toujours verts.

- [ ] **Step 4 : Commit**

```bash
git add frontend/src/pages/CampaignDetailPage.tsx
git commit -m "Frontend : bouton Contacter le porteur sur la page de campagne"
```

---

### Task 8 : Frontend — onglet « Signalements messages » dans le back-office

**Files:**
- Modify: `frontend/src/pages/AdminDashboardPage.tsx`

**Interfaces:**
- Consumes: `metrics.open_message_reports`, clé `message_reports` de `GET /api/backoffice/dashboard/` (Task 5) ; `PATCH /api/backoffice/message-reports/<id>/` (Task 5).
- Produces: nouvel onglet `message_reports` dans le tableau de bord admin, sur le modèle exact de l'onglet Signalements campagnes.

- [ ] **Step 1 : Étendre `Tab` et `MetricKey`**

```tsx
type Tab = "overview" | "kyc" | "campaigns" | "reports" | "support" | "users" | "payouts" | "message_reports"
```

```tsx
type MetricKey = "pending_kyc" | "pending_campaigns" | "open_reports" | "open_support" | "open_message_reports"
```

- [ ] **Step 2 : Étendre `DashboardData`**

Ajouter au niveau racine de `DashboardData` (à côté de `payouts`) :

```tsx
  message_reports: Array<{
    id: number
    campaign: { slug: string; title: string }
    message_excerpt: string
    reporter: Person
    reason: string
    details: string
    status: string
    admin_note: string
    created_at: string
    assigned_to: Person | null
  }>
```

- [ ] **Step 3 : Onglet dans `tabItems`**

```tsx
  { id: "message_reports", label: "Signalements messages", icon: ShieldAlert, count: "open_message_reports" },
```

(ajouter après l'entrée `"payouts"`)

- [ ] **Step 4 : `currentItems`**

```tsx
    let items: unknown[] = tab === "kyc" ? data.kyc : tab === "campaigns" ? data.campaigns : tab === "reports" ? data.reports : tab === "support" ? data.support : tab === "payouts" ? data.payouts : tab === "message_reports" ? data.message_reports : []
```

- [ ] **Step 5 : Toolbar**

```tsx
  const queueToolbar =
    tab !== "overview" && tab !== "users" && tab !== "payouts" && tab !== "message_reports" ? (
```

- [ ] **Step 6 : Rendu de l'onglet**

Insérer juste avant `{tab === "reports" && (` :

```tsx
        {tab === "message_reports" && (
          <section className="mt-6 space-y-4" aria-labelledby="message-report-title">
            <div>
              <h2 id="message-report-title" className="font-heading text-2xl font-bold text-ink">
                Signalements de messages
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Attribuez, examinez et consignez la conclusion.</p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="signalement de message" />
            ) : (
              (visibleItems as DashboardData["message_reports"]).map((item) => {
                const key = `message-report-${item.id}`
                const note = drafts[key] ?? item.admin_note
                return (
                  <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <StatusPill status={item.status} label={item.reason} />
                        <h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.campaign.title}</h3>
                        <p className="mt-3 max-w-3xl rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-secondary">« {item.message_excerpt} »</p>
                        <p className="mt-3 max-w-3xl text-sm text-ink-secondary">{item.details}</p>
                        <p className="mt-3 text-xs text-ink-muted">
                          {item.reporter.email} · {formatDate(item.created_at)}
                        </p>
                      </div>
                      <Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("message_report", item.id, adminId)} />
                    </div>
                    <div className="mt-5">
                      <NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Conclusion interne de l’examen" />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          void perform(
                            `/backoffice/message-reports/${item.id}/`,
                            "PATCH",
                            { status: "EN_COURS", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                            "Signalement pris en charge.",
                          )
                        }
                        className="rounded-full"
                      >
                        Prendre en charge
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          ask("Classer ce signalement ?", "Le dossier quittera la file active sans action.", "Classer", () =>
                            perform(
                              `/backoffice/message-reports/${item.id}/`,
                              "PATCH",
                              { status: "CLASSE", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                              "Signalement classé.",
                            ),
                          )
                        }
                        className="rounded-full"
                      >
                        Classer
                      </Button>
                      <Button
                        onClick={() =>
                          ask("Marquer ce signalement résolu ?", "Assurez-vous que la conclusion est consignée dans la note interne.", "Résoudre", () =>
                            perform(
                              `/backoffice/message-reports/${item.id}/`,
                              "PATCH",
                              { status: "RESOLU", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                              "Signalement résolu.",
                            ),
                          )
                        }
                        className="rounded-full bg-ink text-white"
                      >
                        Résoudre
                      </Button>
                    </div>
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "reports" && (
```

- [ ] **Step 7 : Vérifier**

```bash
npm run build
npm test -- --run
```

Expected: build sans erreur TypeScript, 6 tests toujours verts.

- [ ] **Step 8 : Commit**

```bash
git add frontend/src/pages/AdminDashboardPage.tsx
git commit -m "Back-office : onglet Signalements messages dans le tableau de bord"
```

---

## Vérification finale

Après la Tâche 8 :

```bash
cd /Users/lucifer/dev/Jappandale/backend && source .venv/bin/activate && pytest -q
cd /Users/lucifer/dev/Jappandale/frontend && npm run build && npm test -- --run
```

Expected: tous les tests backend et frontend passent, build frontend sans erreur.
