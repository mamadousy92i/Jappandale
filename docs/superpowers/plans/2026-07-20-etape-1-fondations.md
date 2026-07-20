# Plan d'implémentation — Étape 1 : Fondations Jappandale

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le squelette complet du projet — backend Django connecté à PostgreSQL avec modèle utilisateur personnalisé et tests, frontend React stylé à la charte YAMB — avec une page d'accueil qui communique avec l'API.

**Architecture:** Monorepo `backend/` (Django + DRF, apps métier) et `frontend/` (React + Vite + TypeScript + Tailwind v4 + shadcn/ui). Le frontend parle au backend via un proxy Vite `/api` en développement.

**Tech Stack:** Python 3.12+, Django 5.2, Django REST Framework, PostgreSQL (base locale `jappandale_db`), pytest-django, Node 20+, Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui.

## Global Constraints

- Base de données locale : `jappandale_db`, utilisateur `jappandale_user` — identifiants UNIQUEMENT dans `backend/.env` (jamais versionné, jamais en dur dans le code).
- Messages de commit en français, descriptifs, **sans aucune ligne « Co-Authored-By »**.
- Charte graphique (valeurs exactes, cf. `charte-graphique.md`) : or `#FAC502`, or clair `#FDD835`, or foncé `#C99A00`, texte `#1A1A1A` / `#555555` / `#888888`, fonds `#FFFFFF` / `#F5F5F5`. Titres **Playfair Display**, corps **Inter**.
- Langue de l'interface et des textes : français. `LANGUAGE_CODE = "fr"`, `TIME_ZONE = "Africa/Dakar"`.
- Le modèle utilisateur personnalisé DOIT exister avant la toute première migration (`migrate`) — c'est irréversible en Django.
- Plans suivants (hors périmètre ici) : comptes/JWT, KYC, campagnes, contributions/paiement simulé, tableaux de bord/e-mails, déploiement.

---

### Task 1 : Squelette backend Django + connexion PostgreSQL

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/config/settings.py` (généré puis modifié)
- Create: `backend/.env`, `backend/.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: projet Django `config` fonctionnel dans `backend/`, lisant sa configuration depuis `.env` ; commande `python manage.py check` sans erreur.

- [ ] **Step 1 : Créer l'environnement virtuel et les dépendances**

```bash
cd /Users/lucifer/dev/Jappandale
mkdir -p backend && cd backend
python3 -m venv .venv
source .venv/bin/activate
```

Créer `backend/requirements.txt` :

```txt
Django>=5.2,<6.0
djangorestframework>=3.16
django-environ>=0.12
psycopg[binary]>=3.2
djangorestframework-simplejwt>=5.5
drf-spectacular>=0.28
django-cors-headers>=4.7
pytest>=8.3
pytest-django>=4.11
```

```bash
pip install -r requirements.txt
```

Expected: installation sans erreur.

- [ ] **Step 2 : Générer le projet Django**

```bash
django-admin startproject config .
```

Expected: `backend/manage.py` et `backend/config/settings.py` existent.

- [ ] **Step 3 : Créer `.env` et `.env.example`**

`backend/.env` (JAMAIS commité) :

```env
SECRET_KEY=dev-secret-key-a-changer-en-production
DEBUG=True
DATABASE_URL=postgres://jappandale_user:admin@localhost:5432/jappandale_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

`backend/.env.example` (commité, sans secrets réels) :

```env
SECRET_KEY=changez-moi
DEBUG=True
DATABASE_URL=postgres://utilisateur:motdepasse@localhost:5432/jappandale_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Vérifier que `.gitignore` à la racine contient bien `.env` et ajouter les entrées Python :

```gitignore
.env
.DS_Store
__pycache__/
node_modules/
backend/.venv/
*.pyc
backend/staticfiles/
backend/media/
```

- [ ] **Step 4 : Configurer `settings.py`**

Remplacer le contenu de `backend/config/settings.py` par :

```python
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tierces
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": env.db("DATABASE_URL")}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API Jappandale",
    "DESCRIPTION": "Plateforme de crowdfunding de YAMB International",
    "VERSION": "0.1.0",
}
```

- [ ] **Step 5 : Vérifier la configuration et la connexion à la base**

```bash
python manage.py check
python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
connection.ensure_connection()
print('Connexion PostgreSQL OK')
"
```

Expected: `System check identified no issues` puis `Connexion PostgreSQL OK`.
⚠️ NE PAS lancer `migrate` maintenant (le modèle User personnalisé arrive à la tâche 2).

- [ ] **Step 6 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add .gitignore backend/requirements.txt backend/manage.py backend/config/ backend/.env.example
git commit -m "Backend : squelette Django configuré (PostgreSQL, DRF, CORS, fuseau Dakar)"
```

---

### Task 2 : Modèle utilisateur personnalisé et première migration

**Files:**
- Create: `backend/apps/__init__.py`
- Create: `backend/apps/accounts/` (app Django complète)
- Modify: `backend/config/settings.py`

**Interfaces:**
- Produces: modèle `apps.accounts.models.User` (hérite d'`AbstractUser`, connexion par e-mail, champ `role` avec choix `PORTEUR`/`CONTRIBUTEUR`/`ADMIN`, défaut `CONTRIBUTEUR`) ; `AUTH_USER_MODEL = "accounts.User"` ; base migrée.

- [ ] **Step 1 : Créer l'app accounts**

```bash
cd /Users/lucifer/dev/Jappandale/backend
mkdir -p apps/accounts
touch apps/__init__.py
python manage.py startapp accounts apps/accounts
```

Dans `backend/apps/accounts/apps.py`, remplacer par :

```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Comptes utilisateurs"
```

- [ ] **Step 2 : Écrire le modèle User**

Remplacer `backend/apps/accounts/models.py` par :

```python
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Gestionnaire d'utilisateurs : l'e-mail remplace le nom d'utilisateur."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Utilisateur Jappandale : identification par e-mail, rôle métier."""

    class Role(models.TextChoices):
        PORTEUR = "PORTEUR", "Porteur de projet"
        CONTRIBUTEUR = "CONTRIBUTEUR", "Contributeur"
        ADMIN = "ADMIN", "Administrateur"

    username = None
    email = models.EmailField("adresse e-mail", unique=True)
    role = models.CharField(
        "rôle", max_length=20, choices=Role.choices, default=Role.CONTRIBUTEUR
    )
    phone = models.CharField("téléphone", max_length=20, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self):
        return self.email
```

- [ ] **Step 3 : Déclarer l'app et le modèle dans settings**

Dans `backend/config/settings.py`, ajouter à la fin de `INSTALLED_APPS` :

```python
    # Apps Jappandale
    "apps.accounts",
```

Et ajouter en dessous de `DEFAULT_AUTO_FIELD` :

```python
AUTH_USER_MODEL = "accounts.User"
```

- [ ] **Step 4 : Enregistrer le modèle dans l'admin**

Remplacer `backend/apps/accounts/admin.py` par :

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "phone")}),
        ("Rôle et permissions", {
            "fields": ("role", "is_active", "is_staff", "is_superuser", "groups"),
        }),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "role", "password1", "password2"),
        }),
    )
```

- [ ] **Step 5 : Générer et appliquer les migrations**

```bash
python manage.py makemigrations accounts
python manage.py migrate
```

Expected: `Applying accounts.0001_initial... OK` parmi les migrations.

- [ ] **Step 6 : Créer le superutilisateur (interactif — demander à Mamadou)**

```bash
python manage.py createsuperuser
```

Saisir un e-mail et un mot de passe. Vérifier ensuite :

```bash
python manage.py runserver
```

Ouvrir http://localhost:8000/admin — la connexion avec l'e-mail doit fonctionner.

- [ ] **Step 7 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add backend/apps/ backend/config/settings.py
git commit -m "Comptes : modèle utilisateur personnalisé (e-mail + rôles) et admin"
```

---

### Task 3 : Outillage de tests (pytest) et endpoint de santé en TDD

**Files:**
- Create: `backend/pytest.ini`
- Create: `backend/apps/core/` (app Django `core`)
- Create: `backend/apps/core/tests/test_health.py`
- Create: `backend/apps/accounts/tests/test_models.py`
- Modify: `backend/config/settings.py`, `backend/config/urls.py`

**Interfaces:**
- Produces: `GET /api/health/` → `200 {"status": "ok"}` ; commande `pytest` fonctionnelle depuis `backend/`.
- Consumes: modèle `apps.accounts.models.User` (Task 2).

- [ ] **Step 1 : Configurer pytest**

Créer `backend/pytest.ini` :

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = test_*.py
testpaths = apps
```

- [ ] **Step 2 : Créer l'app core**

```bash
cd /Users/lucifer/dev/Jappandale/backend
mkdir -p apps/core
python manage.py startapp core apps/core
rm apps/core/models.py apps/core/admin.py apps/core/tests.py
mkdir apps/core/tests && touch apps/core/tests/__init__.py
```

Dans `backend/apps/core/apps.py`, remplacer par :

```python
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
```

Ajouter `"apps.core",` à `INSTALLED_APPS` dans `backend/config/settings.py`.

- [ ] **Step 3 : Écrire le test qui échoue**

Créer `backend/apps/core/tests/test_health.py` :

```python
import pytest
from django.test import Client


@pytest.mark.django_db
def test_health_endpoint_repond_ok():
    client = Client()
    response = client.get("/api/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 4 : Vérifier que le test échoue**

```bash
pytest apps/core/tests/test_health.py -v
```

Expected: FAIL (404, l'URL n'existe pas encore).

- [ ] **Step 5 : Implémenter l'endpoint**

Remplacer `backend/apps/core/views.py` par :

```python
from django.http import JsonResponse


def health(request):
    return JsonResponse({"status": "ok"})
```

Remplacer `backend/config/urls.py` par :

```python
from django.contrib import admin
from django.urls import path

from apps.core.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
]
```

- [ ] **Step 6 : Vérifier que le test passe**

```bash
pytest apps/core/tests/test_health.py -v
```

Expected: `1 passed`.

- [ ] **Step 7 : Test du modèle User**

```bash
mkdir -p apps/accounts/tests && touch apps/accounts/tests/__init__.py
rm apps/accounts/tests.py
```

Créer `backend/apps/accounts/tests/test_models.py` :

```python
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
```

```bash
pytest -v
```

Expected: `4 passed`.

- [ ] **Step 8 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add backend/pytest.ini backend/apps/ backend/config/
git commit -m "Tests : pytest configuré, endpoint de santé /api/health et tests du modèle User"
```

---

### Task 4 : Squelette frontend React + Vite + TypeScript

**Files:**
- Create: `frontend/` (projet Vite complet)

**Interfaces:**
- Produces: application Vite React TypeScript qui démarre sur http://localhost:5173.

- [ ] **Step 1 : Générer le projet**

```bash
cd /Users/lucifer/dev/Jappandale
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2 : Vérifier le démarrage**

```bash
npm run dev
```

Expected: serveur sur http://localhost:5173 affichant la page Vite par défaut. Arrêter avec Ctrl+C.

- [ ] **Step 3 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add frontend/
git commit -m "Frontend : squelette React + Vite + TypeScript"
```

---

### Task 5 : Tailwind CSS v4, shadcn/ui et thème de la charte YAMB

**Files:**
- Modify: `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`
- Create: `frontend/src/index.css` (remplacé), `frontend/components.json` (généré par shadcn)

**Interfaces:**
- Produces: classes Tailwind avec tokens charte (`text-gold`, `bg-gold`, `font-heading`, `font-body`) ; composants shadcn `Button` et `Card` installés dans `frontend/src/components/ui/`.

- [ ] **Step 1 : Installer Tailwind v4**

```bash
cd /Users/lucifer/dev/Jappandale/frontend
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node
```

- [ ] **Step 2 : Configurer Vite (plugin + alias `@/`)**

Remplacer `frontend/vite.config.ts` par :

```ts
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
})
```

Dans `frontend/tsconfig.json`, ajouter dans l'objet `compilerOptions` (le créer s'il n'existe pas au niveau racine) :

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Ajouter les mêmes `baseUrl`/`paths` dans `compilerOptions` de `frontend/tsconfig.app.json`.

- [ ] **Step 3 : Thème charte dans le CSS**

Remplacer `frontend/src/index.css` par :

```css
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap");
@import "tailwindcss";

@theme {
  /* Charte YAMB — cf. charte-graphique.md */
  --color-gold: #fac502;
  --color-gold-light: #fdd835;
  --color-gold-dark: #c99a00;
  --color-ink: #1a1a1a;
  --color-ink-secondary: #555555;
  --color-ink-muted: #888888;
  --color-surface: #ffffff;
  --color-surface-alt: #f5f5f5;

  --font-heading: "Playfair Display", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;
}

body {
  font-family: var(--font-body);
  color: var(--color-ink);
  background-color: var(--color-surface);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5 {
  font-family: var(--font-heading);
  font-weight: 700;
  line-height: 1.2;
}
```

Supprimer `frontend/src/App.css` et retirer son import dans `App.tsx`.

- [ ] **Step 4 : Initialiser shadcn/ui**

```bash
npx shadcn@latest init
```

Répondre : base color `Neutral` (on personnalisera avec la charte). Puis :

```bash
npx shadcn@latest add button card
```

Expected: `frontend/src/components/ui/button.tsx` et `card.tsx` créés.

- [ ] **Step 5 : Aligner shadcn sur la charte**

Dans le bloc `:root` ajouté par shadcn dans `frontend/src/index.css`, remplacer les valeurs des variables `--primary`, `--primary-foreground`, `--ring` et `--radius` par :

```css
  --primary: #fac502;
  --primary-foreground: #1a1a1a;
  --ring: #c99a00;
  --radius: 0.75rem;
```

- [ ] **Step 6 : Vérification visuelle**

Remplacer `frontend/src/App.tsx` par :

```tsx
import { Button } from "@/components/ui/button"

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface">
      <h1 className="font-heading text-4xl text-ink">
        Jappandale <span className="text-gold-dark">·</span> test charte
      </h1>
      <Button className="rounded-full px-8">Bouton or YAMB</Button>
    </main>
  )
}

export default App
```

```bash
npm run dev
```

Expected: titre en Playfair Display, bouton or `#FAC502` texte noir, arrondi.

- [ ] **Step 7 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add frontend/
git commit -m "Frontend : Tailwind v4, shadcn/ui et thème de la charte YAMB (or, Playfair, Inter)"
```

---

### Task 6 : Client API et page d'accueil provisoire branchée sur le backend

**Files:**
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `GET /api/health/` (Task 3), proxy Vite `/api` (Task 5).
- Produces: `apiFetch(path: string, options?: RequestInit): Promise<unknown>` dans `@/lib/api` — le client HTTP que toutes les étapes suivantes utiliseront.

- [ ] **Step 1 : Écrire le client API**

Créer `frontend/src/lib/api.ts` :

```ts
const API_BASE = "/api"

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!response.ok) {
    throw new ApiError(response.status, `Erreur API ${response.status}`)
  }
  return response.json()
}
```

- [ ] **Step 2 : Page d'accueil provisoire avec statut de l'API**

Remplacer `frontend/src/App.tsx` par :

```tsx
import { useEffect, useState } from "react"

import { apiFetch } from "@/lib/api"

function App() {
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    apiFetch("/health/")
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-xs font-semibold uppercase tracking-[4px] text-gold-dark">
        YAMB International
      </span>
      <h1 className="font-heading text-5xl">Jappandale</h1>
      <p className="max-w-md text-ink-secondary">
        La plateforme sénégalaise de financement participatif. En construction.
      </p>
      <p className="text-sm text-ink-muted">
        API backend :{" "}
        {apiOk === null ? "vérification…" : apiOk ? "✅ connectée" : "❌ injoignable"}
      </p>
    </main>
  )
}

export default App
```

- [ ] **Step 3 : Vérification de bout en bout**

Terminal 1 :

```bash
cd /Users/lucifer/dev/Jappandale/backend && source .venv/bin/activate && python manage.py runserver
```

Terminal 2 :

```bash
cd /Users/lucifer/dev/Jappandale/frontend && npm run dev
```

Ouvrir http://localhost:5173 — Expected: « API backend : ✅ connectée ».

- [ ] **Step 4 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add frontend/src/
git commit -m "Frontend : client API et page d'accueil provisoire reliée au backend"
```

---

### Task 7 : README et publication

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: documentation d'installation à jour sur GitHub.

- [ ] **Step 1 : Écrire le README**

Créer `README.md` à la racine :

```markdown
# Jappandale

Plateforme sénégalaise de crowdfunding et de mise en relation financière, portée par YAMB International.

## Stack

- **Backend :** Django 5 + Django REST Framework, PostgreSQL
- **Frontend :** React + Vite + TypeScript, Tailwind CSS v4, shadcn/ui
- **Charte graphique :** voir `charte-graphique.md`

## Démarrer en local

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # puis renseigner les identifiants PostgreSQL
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application sur http://localhost:5173, API sur http://localhost:8000/api/.

### Tests

```bash
cd backend && pytest
```

## Documentation

- Cahier des charges : `Jappandale_Cahier_des_Charges.docx`
- Conception du MVP : `docs/superpowers/specs/2026-07-20-jappandale-mvp-design.md`
- Plans d'implémentation : `docs/superpowers/plans/`
```

- [ ] **Step 2 : Commit et push**

```bash
cd /Users/lucifer/dev/Jappandale
git add README.md
git commit -m "Documentation : README avec instructions d'installation"
git push
```
