# Plan d'implémentation — Étape 2 : Comptes et authentification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre l'inscription, la connexion (JWT) et la consultation de son profil, avec les premières vraies pages de la plateforme (layout global, connexion, inscription, espace compte) au niveau de design attendu.

**Architecture:** Backend : app `apps.accounts` enrichie (serializers, vues DRF, urls `/api/auth/*`), authentification JWT via djangorestframework-simplejwt (déjà dans requirements). Frontend : React Router, `AuthContext` (tokens en localStorage, rafraîchissement automatique), layout Header/Footer partagé, pages Connexion/Inscription/Mon compte.

**Tech Stack:** existant + react-router-dom (nouveau), shadcn `input` et `label` (nouveaux composants).

## Global Constraints

- Backend sur le **port 8001** (`python manage.py runserver 8001`) ; proxy Vite `/api` → `http://localhost:8001` (déjà configuré).
- **Aucune mention « YAMB International »** dans les textes visibles de la plateforme.
- Messages de commit en français, **sans ligne « Co-Authored-By »**.
- Charte : or `#FAC502` / `#FDD835` / `#C99A00`, encre `#1A1A1A`/`#555555`/`#888888`, surfaces `#FFFFFF`/`#F5F5F5` ; titres `font-heading` (Playfair Display), corps Inter. Tokens Tailwind déjà disponibles : `text-gold`, `bg-gold`, `text-gold-dark`, `bg-surface`, `bg-surface-alt`, `text-ink`, `text-ink-secondary`, `text-ink-muted`, `font-heading`.
- **Design :** les tâches frontend marquées « [DESIGN — Fable] » sont exécutées par un agent de niveau Fable. Le code JSX de ce plan y est un squelette fonctionnel de référence : l'implémenteur DOIT en conserver la logique, les routes, les noms de champs et les `data-testid`, et DOIT élever le design (composition, espacements, micro-interactions, états hover/focus, responsive mobile-first) au niveau « grande plateforme de crowdfunding, épuré et professionnel ». Interface en français.
- Rôles autorisés à l'inscription : `PORTEUR` et `CONTRIBUTEUR` uniquement (jamais `ADMIN`).
- TDD sur tout le backend : test écrit et vu échouer avant l'implémentation.
- Toutes les commandes backend : `cd /Users/lucifer/dev/Jappandale/backend && source .venv/bin/activate`.

---

### Task 1 : Backend — Authentification JWT (config + endpoints token)

**Files:**
- Modify: `backend/config/settings.py`
- Create: `backend/apps/accounts/urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/apps/accounts/tests/test_auth.py`

**Interfaces:**
- Produces: `POST /api/auth/token/` (body `{"email", "password"}` → `{"access", "refresh"}`), `POST /api/auth/token/refresh/` (body `{"refresh"}` → `{"access"}`). DRF configuré avec `JWTAuthentication` par défaut.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/accounts/tests/test_auth.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="porteur@test.sn", password="MotDePasse123!", role=User.Role.PORTEUR
    )


@pytest.mark.django_db
def test_obtention_token_avec_bons_identifiants(user):
    client = APIClient()
    response = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        format="json",
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_refus_token_mauvais_mot_de_passe(user):
    client = APIClient()
    response = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "mauvais"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_rafraichissement_token(user):
    client = APIClient()
    tokens = client.post(
        "/api/auth/token/",
        {"email": "porteur@test.sn", "password": "MotDePasse123!"},
        format="json",
    ).data
    response = client.post(
        "/api/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json"
    )
    assert response.status_code == 200
    assert "access" in response.data
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/accounts/tests/test_auth.py -v`
Expected: FAIL (404 — les URLs n'existent pas).

- [ ] **Step 3 : Configurer simplejwt et les URLs**

Dans `backend/config/settings.py`, ajouter `"rest_framework_simplejwt",` dans `INSTALLED_APPS` (section tierces), et remplacer le bloc `REST_FRAMEWORK` par :

```python
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

from datetime import timedelta  # noqa: E402  (placé ici pour rester proche de son usage)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "UPDATE_LAST_LOGIN": True,
}
```

(Convention Python : déplacer le `from datetime import timedelta` en tête de fichier avec les autres imports — c'est la forme attendue.)

Créer `backend/apps/accounts/urls.py` :

```python
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
```

Dans `backend/config/urls.py`, ajouter l'import `include` et la route :

```python
from django.urls import include, path
```

```python
    path("api/auth/", include("apps.accounts.urls")),
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run: `pytest apps/accounts/tests/test_auth.py -v`
Expected: 3 passed. Puis `pytest` complet : 7 passed.

- [ ] **Step 5 : Commit**

```bash
git add backend/
git commit -m "Auth : connexion JWT (obtention et rafraîchissement de jetons)"
```

---

### Task 2 : Backend — Inscription

**Files:**
- Create: `backend/apps/accounts/serializers.py`
- Modify: `backend/apps/accounts/views.py`, `backend/apps/accounts/urls.py`
- Test: `backend/apps/accounts/tests/test_register.py`

**Interfaces:**
- Consumes: modèle `User` (rôles `PORTEUR`/`CONTRIBUTEUR`/`ADMIN`), routes `/api/auth/` (Task 1).
- Produces: `POST /api/auth/register/` — body `{"email", "password", "first_name", "last_name", "role", "phone"?}` → 201 `{"id", "email", "first_name", "last_name", "role", "phone"}` ; erreurs de validation → 400 avec détails par champ.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/accounts/tests/test_register.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

DONNEES_VALIDES = {
    "email": "nouveau@test.sn",
    "password": "MotDePasse123!",
    "first_name": "Awa",
    "last_name": "Diop",
    "role": "PORTEUR",
}


@pytest.mark.django_db
def test_inscription_valide():
    client = APIClient()
    response = client.post("/api/auth/register/", DONNEES_VALIDES, format="json")
    assert response.status_code == 201
    assert response.data["email"] == "nouveau@test.sn"
    assert response.data["role"] == "PORTEUR"
    assert "password" not in response.data
    user = User.objects.get(email="nouveau@test.sn")
    assert user.check_password("MotDePasse123!")


@pytest.mark.django_db
def test_inscription_role_admin_refusee():
    client = APIClient()
    response = client.post(
        "/api/auth/register/", {**DONNEES_VALIDES, "role": "ADMIN"}, format="json"
    )
    assert response.status_code == 400
    assert "role" in response.data


@pytest.mark.django_db
def test_inscription_email_deja_pris():
    User.objects.create_user(email="nouveau@test.sn", password="Xx12345678!")
    client = APIClient()
    response = client.post("/api/auth/register/", DONNEES_VALIDES, format="json")
    assert response.status_code == 400
    assert "email" in response.data


@pytest.mark.django_db
def test_inscription_mot_de_passe_faible_refusee():
    client = APIClient()
    response = client.post(
        "/api/auth/register/", {**DONNEES_VALIDES, "password": "1234"}, format="json"
    )
    assert response.status_code == 400
    assert "password" in response.data
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/accounts/tests/test_register.py -v`
Expected: FAIL (404).

- [ ] **Step 3 : Implémenter serializer et vue**

Créer `backend/apps/accounts/serializers.py` :

```python
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(
        choices=[User.Role.PORTEUR, User.Role.CONTRIBUTEUR],
        default=User.Role.CONTRIBUTEUR,
    )

    class Meta:
        model = User
        fields = ["id", "email", "password", "first_name", "last_name", "role", "phone"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "phone"]
        read_only_fields = ["id", "email", "role"]
```

Remplacer `backend/apps/accounts/views.py` par :

```python
from rest_framework import generics, permissions

from .serializers import RegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
```

Dans `backend/apps/accounts/urls.py`, ajouter :

```python
from .views import RegisterView
```

```python
    path("register/", RegisterView.as_view(), name="register"),
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run: `pytest apps/accounts/tests/test_register.py -v` → 4 passed. Suite complète : 11 passed.

- [ ] **Step 5 : Commit**

```bash
git add backend/
git commit -m "Auth : inscription avec validation du mot de passe et des rôles"
```

---

### Task 3 : Backend — Profil courant (`/api/auth/me/`)

**Files:**
- Modify: `backend/apps/accounts/views.py`, `backend/apps/accounts/urls.py`
- Test: `backend/apps/accounts/tests/test_me.py`

**Interfaces:**
- Consumes: `UserSerializer` (Task 2), JWT (Task 1).
- Produces: `GET /api/auth/me/` (authentifié → 200 profil ; anonyme → 401) et `PATCH /api/auth/me/` (modification de `first_name`, `last_name`, `phone` uniquement).

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/apps/accounts/tests/test_me.py` :

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def client_authentifie(db):
    user = User.objects.create_user(
        email="moi@test.sn", password="MotDePasse123!", first_name="Awa"
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
def test_me_authentifie(client_authentifie):
    client, user = client_authentifie
    response = client.get("/api/auth/me/")
    assert response.status_code == 200
    assert response.data["email"] == "moi@test.sn"
    assert response.data["first_name"] == "Awa"


@pytest.mark.django_db
def test_me_anonyme_refuse():
    response = APIClient().get("/api/auth/me/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_modification_prenom(client_authentifie):
    client, user = client_authentifie
    response = client.patch("/api/auth/me/", {"first_name": "Fatou"}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Fatou"


@pytest.mark.django_db
def test_me_email_et_role_non_modifiables(client_authentifie):
    client, user = client_authentifie
    client.patch(
        "/api/auth/me/", {"email": "pirate@test.sn", "role": "ADMIN"}, format="json"
    )
    user.refresh_from_db()
    assert user.email == "moi@test.sn"
    assert user.role == User.Role.CONTRIBUTEUR
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `pytest apps/accounts/tests/test_me.py -v` → FAIL (404).

- [ ] **Step 3 : Implémenter la vue**

Dans `backend/apps/accounts/views.py`, ajouter :

```python
from .serializers import RegisterSerializer, UserSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
```

(ajuster la ligne d'import existante plutôt que la dupliquer)

Dans `backend/apps/accounts/urls.py` :

```python
from .views import MeView, RegisterView
```

```python
    path("me/", MeView.as_view(), name="me"),
```

- [ ] **Step 4 : Vérifier**

Run: `pytest apps/accounts/tests/test_me.py -v` → 4 passed. Suite complète : 15 passed.

- [ ] **Step 5 : Commit**

```bash
git add backend/
git commit -m "Auth : consultation et modification du profil courant (/api/auth/me)"
```

---

### Task 4 : Frontend — Routeur, types et contexte d'authentification

**Files:**
- Create: `frontend/src/lib/types.ts`, `frontend/src/lib/auth.tsx`
- Modify: `frontend/src/lib/api.ts`, `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/token/`, `/token/refresh/`, `/register/`, `GET /api/auth/me/` (Tasks 1-3) ; `apiFetch` existant.
- Produces:
  - Type `User = { id: number; email: string; first_name: string; last_name: string; role: "PORTEUR" | "CONTRIBUTEUR" | "ADMIN"; phone: string }`
  - Hook `useAuth(): { user: User | null; loading: boolean; login(email, password): Promise<void>; register(data: RegisterData): Promise<void>; logout(): void; authFetch(path, options?): Promise<unknown> }`
  - `<AuthProvider>` monté au-dessus du routeur dans `main.tsx` ; `<BrowserRouter>` installé.

- [ ] **Step 1 : Installer react-router-dom**

```bash
cd /Users/lucifer/dev/Jappandale/frontend
npm install react-router-dom
```

- [ ] **Step 2 : Créer les types**

Créer `frontend/src/lib/types.ts` :

```ts
export type Role = "PORTEUR" | "CONTRIBUTEUR" | "ADMIN"

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: Role
  phone: string
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: "PORTEUR" | "CONTRIBUTEUR"
  phone?: string
}
```

- [ ] **Step 3 : Exposer le corps des erreurs API**

Dans `frontend/src/lib/api.ts`, enrichir `ApiError` pour transporter les détails de validation DRF (nécessaire aux formulaires) :

```ts
const API_BASE = "/api"

export class ApiError extends Error {
  status: number
  details: Record<string, string[]> | null

  constructor(status: number, message: string, details: Record<string, string[]> | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!response.ok) {
    let details: Record<string, string[]> | null = null
    try {
      details = (await response.json()) as Record<string, string[]>
    } catch {
      details = null
    }
    throw new ApiError(response.status, `Erreur API ${response.status}`, details)
  }
  if (response.status === 204) return null
  return response.json()
}
```

- [ ] **Step 4 : Créer le contexte d'authentification**

Créer `frontend/src/lib/auth.tsx` :

```tsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

import { ApiError, apiFetch } from "@/lib/api"
import type { RegisterData, User } from "@/lib/types"

const ACCESS_KEY = "jappandale_access"
const REFRESH_KEY = "jappandale_refresh"

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  authFetch: (path: string, options?: RequestInit) => Promise<unknown>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null
  try {
    const data = (await apiFetch("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    })) as { access: string }
    localStorage.setItem(ACCESS_KEY, data.access)
    return data.access
  } catch {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const authFetch = useCallback(
    async (path: string, options?: RequestInit): Promise<unknown> => {
      const access = localStorage.getItem(ACCESS_KEY)
      const withToken = (token: string | null): RequestInit => ({
        ...options,
        headers: {
          ...options?.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      try {
        return await apiFetch(path, withToken(access))
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const newAccess = await refreshAccessToken()
          if (newAccess) return apiFetch(path, withToken(newAccess))
          setUser(null)
        }
        throw error
      }
    },
    []
  )

  useEffect(() => {
    const bootstrap = async () => {
      if (!localStorage.getItem(ACCESS_KEY) && !localStorage.getItem(REFRESH_KEY)) {
        setLoading(false)
        return
      }
      try {
        setUser((await authFetch("/auth/me/")) as User)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    void bootstrap()
  }, [authFetch])

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = (await apiFetch("/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })) as { access: string; refresh: string }
      localStorage.setItem(ACCESS_KEY, tokens.access)
      localStorage.setItem(REFRESH_KEY, tokens.refresh)
      setUser((await authFetch("/auth/me/")) as User)
    },
    [authFetch]
  )

  const register = useCallback(
    async (data: RegisterData) => {
      await apiFetch("/auth/register/", { method: "POST", body: JSON.stringify(data) })
      await login(data.email, data.password)
    },
    [login]
  )

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>")
  return ctx
}
```

- [ ] **Step 5 : Monter le provider et le routeur**

Remplacer `frontend/src/main.tsx` par :

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import App from "./App.tsx"
import { AuthProvider } from "@/lib/auth"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 6 : Vérifier la compilation**

Run: `npm run build`
Expected: succès sans erreur TypeScript.

- [ ] **Step 7 : Commit**

```bash
cd /Users/lucifer/dev/Jappandale
git add frontend/
git commit -m "Frontend : routeur, types et contexte d'authentification JWT"
```

---

### Task 5 : [DESIGN — Fable] Layout global (Header, Footer, structure des routes)

**Files:**
- Create: `frontend/src/components/layout/Header.tsx`, `frontend/src/components/layout/Footer.tsx`, `frontend/src/components/layout/Layout.tsx`
- Create: `frontend/src/pages/HomePage.tsx` (extraction de l'accueil provisoire)
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4), tokens charte, composants shadcn.
- Produces: `<Layout>` (Header + `<Outlet/>` + Footer) englobant toutes les routes ; routes déclarées dans `App.tsx` : `/` (HomePage), et emplacements prêts pour `/connexion`, `/inscription`, `/compte` (Task 6-7). Le Header affiche : logo/nom « Jappandale », navigation, et à droite soit « Se connecter » / « S'inscrire », soit le prénom de l'utilisateur + bouton « Se déconnecter » (`data-testid="header-user"`).

- [ ] **Step 1 : Créer le layout**

Squelette de référence (à élever au niveau design exigé — voir Global Constraints) :

`frontend/src/components/layout/Header.tsx` :

```tsx
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-heading text-2xl font-bold">
          Jappandale<span className="text-gold">.</span>
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3" data-testid="header-user">
              <Link to="/compte" className="text-sm font-medium text-ink-secondary hover:text-ink">
                {user.first_name || user.email}
              </Link>
              <Button variant="outline" className="rounded-full" onClick={logout}>
                Se déconnecter
              </Button>
            </div>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/connexion">Se connecter</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link to="/inscription">S'inscrire</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
```

`frontend/src/components/layout/Footer.tsx` :

```tsx
export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-surface-alt">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-10 text-center text-sm text-ink-muted">
        <p className="font-heading text-lg text-ink">
          Jappandale<span className="text-gold">.</span>
        </p>
        <p>Le financement participatif au service des projets sénégalais.</p>
        <p>© {new Date().getFullYear()} Jappandale — Dakar, Sénégal</p>
      </div>
    </footer>
  )
}
```

`frontend/src/components/layout/Layout.tsx` :

```tsx
import { Outlet } from "react-router-dom"

import { Footer } from "./Footer"
import { Header } from "./Header"

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2 : Extraire la page d'accueil et déclarer les routes**

Créer `frontend/src/pages/HomePage.tsx` (reprendre le contenu actuel d'`App.tsx` — statut API inclus — en l'améliorant visuellement : vraie section héro épurée, accroche, boutons d'appel à l'action vers /inscription et un second lien secondaire).

Remplacer `frontend/src/App.tsx` par :

```tsx
import { Route, Routes } from "react-router-dom"

import { Layout } from "@/components/layout/Layout"
import HomePage from "@/pages/HomePage"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  )
}

export default App
```

- [ ] **Step 3 : Vérifier**

Run: `npm run build` → succès. Dev server + `curl -s http://localhost:5173` → page servie.

- [ ] **Step 4 : Commit**

```bash
git add frontend/
git commit -m "Frontend : layout global (header, footer) et routage des pages"
```

---

### Task 6 : [DESIGN — Fable] Pages Connexion et Inscription

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useAuth().login/register` (Task 4), `ApiError.details` (erreurs par champ), shadcn `input`/`label` (à installer : `npx shadcn@latest add input label`).
- Produces: routes `/connexion` et `/inscription`. Champs requis inscription : prénom, nom, e-mail, mot de passe, choix du rôle (« Je porte un projet » → `PORTEUR` / « Je veux contribuer » → `CONTRIBUTEUR`), téléphone optionnel. Après succès → redirection `/` (connexion) ou `/compte` (inscription). Erreurs API affichées par champ, en français, sans jargon technique. `data-testid` : `login-form`, `register-form`.

- [ ] **Step 1 : Installer les composants shadcn**

```bash
cd /Users/lucifer/dev/Jappandale/frontend
npx shadcn@latest add input label
```

- [ ] **Step 2 : Implémenter les deux pages**

Exigences fonctionnelles précises (le design est confié à l'implémenteur, niveau « grande plateforme », formulaire centré, carte épurée, hiérarchie typographique claire, états de chargement sur les boutons, lien croisé entre les deux pages) :

- `LoginPage` : champs e-mail + mot de passe ; soumission → `login(email, password)` ; succès → `navigate("/")` ; échec 401 → message « E-mail ou mot de passe incorrect. » ; autres erreurs → « Une erreur est survenue. Réessayez. » ; bouton désactivé + libellé « Connexion… » pendant l'appel ; lien « Pas encore de compte ? S'inscrire ».
- `RegisterPage` : champs prénom, nom, e-mail, mot de passe, téléphone (optionnel), sélecteur de rôle (deux cartes/boutons radio stylés : « Je porte un projet » / « Je veux contribuer », défaut CONTRIBUTEUR) ; soumission → `register(data)` ; succès → `navigate("/compte")` ; en cas d'`ApiError` avec `details`, afficher chaque message sous le champ concerné (les clés correspondent aux noms de champs API : `email`, `password`, `first_name`, `last_name`, `role`, `phone`) ; lien « Déjà un compte ? Se connecter ».

Ajouter les routes dans `App.tsx` :

```tsx
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
```

```tsx
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
```

- [ ] **Step 3 : Vérifier**

`npm run build` → succès. Vérification de bout en bout avec les deux serveurs (backend port 8001) : inscription d'un utilisateur test via l'UI impossible en agent — à la place, vérifier avec curl que `POST /api/auth/register/` fonctionne à travers le proxy Vite :

```bash
curl -s -X POST http://localhost:5173/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.sn","password":"MotDePasse123!","first_name":"Demo","last_name":"Test","role":"CONTRIBUTEUR"}'
```

Expected: JSON 201 avec l'e-mail. (Supprimer ensuite cet utilisateur : `python manage.py shell -c "from django.contrib.auth import get_user_model; get_user_model().objects.filter(email='demo@test.sn').delete()"`)

- [ ] **Step 4 : Commit**

```bash
git add frontend/
git commit -m "Frontend : pages de connexion et d'inscription"
```

---

### Task 7 : [DESIGN — Fable] Espace compte protégé et vérification de bout en bout

**Files:**
- Create: `frontend/src/components/RequireAuth.tsx`, `frontend/src/pages/AccountPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4), `PATCH /api/auth/me/` (Task 3).
- Produces: route `/compte` protégée (anonyme → redirection `/connexion`). Page « Mon compte » : salutation avec le prénom, badge du rôle (libellés français : « Porteur de projet » / « Contributeur » / « Administrateur »), statut du compte, formulaire de modification (prénom, nom, téléphone) via `PATCH /api/auth/me/` avec message de confirmation.

- [ ] **Step 1 : Créer la garde de route**

`frontend/src/components/RequireAuth.tsx` :

```tsx
import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/lib/auth"

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ink-muted">
        Chargement…
      </div>
    )
  }
  if (!user) return <Navigate to="/connexion" replace />
  return children
}
```

- [ ] **Step 2 : Implémenter la page compte et sa route**

`AccountPage` selon les exigences d'interface ci-dessus (design libre niveau Fable, cohérent avec les pages précédentes). Route dans `App.tsx` :

```tsx
        <Route
          path="/compte"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
```

- [ ] **Step 3 : Vérification de bout en bout**

`npm run build` → succès. Avec les deux serveurs lancés (backend 8001) : cycle complet en curl à travers le proxy — register (201) → token (200) → me avec Bearer (200) → patch prénom (200) → suppression de l'utilisateur de test via manage.py shell.

- [ ] **Step 4 : Commit et push**

```bash
git add frontend/
git commit -m "Frontend : espace compte protégé avec modification du profil"
git push
```
