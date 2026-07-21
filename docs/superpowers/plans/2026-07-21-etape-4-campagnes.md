# Plan d'implémentation — Étape 4 : Campagnes de don

**Goal:** Permettre à un porteur validé (KYC) de créer une campagne de don, à l'administrateur de la modérer, et au public de découvrir les campagnes publiées (liste + page détail avec barre de progression). Les contributions/paiements arrivent à l'étape 5 : le montant collecté reste à 0 pour l'instant.

**Architecture:** Nouvelle app `apps.campaigns` (modèles `Campaign`, `CampaignUpdate`). API REST `/api/campaigns/`. Modération via l'admin Django. Frontend : page liste `/campagnes`, page détail `/campagnes/:slug`, création `/campagnes/nouvelle` (réservée aux porteurs validés), section « Mes campagnes » dans l'espace compte.

## Global Constraints
- Backend port 8001. Commits français sans « Co-Authored-By ». Aucune mention « YAMB International ».
- Charte or/blanc, Playfair + Inter. Interface française. Montants en FCFA (F CFA), entiers.
- TDD backend. Création réservée à un `User` `role=PORTEUR` **et** `kyc_status=VALIDE`.
- Design des pages confié à Fable 5.

## Modèle de données
- `Campaign` : `owner` (FK User, related_name="campaigns"), `title`, `slug` (unique, auto), `summary` (accroche courte), `description` (long), `category` (choices), `goal_amount` (Decimal, FCFA), `collected_amount` (Decimal, défaut 0), `cover_image` (ImageField, upload_to="campaigns/%Y/%m/"), `deadline` (DateField), `status` (BROUILLON / EN_MODERATION / PUBLIEE / REJETEE / CLOTUREE), `moderation_note` (blank), `created_at`, `updated_at`, `published_at` (nullable).
  - Propriétés : `progress_percent` (collected/goal borné à 100), `days_left`.
  - Catégories : Artisanat, Commerce, Agriculture, Éducation, Santé, Technologie, Culture, Autre.
- `CampaignUpdate` : `campaign` (FK, related_name="updates"), `title`, `content`, `created_at`.

## Endpoints (`/api/campaigns/`)
- `GET /api/campaigns/` : liste publique (PUBLIEE + CLOTUREE), filtres `?category=`, `?search=`.
- `GET /api/campaigns/<slug>/` : détail public (inclut `updates`, infos porteur limitées).
- `GET /api/campaigns/mine/` : campagnes du porteur connecté (tous statuts).
- `POST /api/campaigns/` : création (porteur validé KYC) → statut BROUILLON.
- `PATCH /api/campaigns/<slug>/` : édition par le propriétaire (BROUILLON/REJETEE uniquement).
- `POST /api/campaigns/<slug>/submit/` : propriétaire soumet à modération (BROUILLON/REJETEE → EN_MODERATION).
- `POST /api/campaigns/<slug>/updates/` : propriétaire publie une actualité (campagne PUBLIEE).
- Modération admin : actions « Publier » (→ PUBLIEE, `published_at`) / « Rejeter » (→ REJETEE, motif).

## Permissions
- Création : `IsAuthenticated` + `role==PORTEUR` + `kyc_status==VALIDE` (sinon 403 avec message clair).
- Édition / soumission / actualités : propriétaire uniquement.
- Lecture liste/détail : public (AllowAny), mais seules les campagnes PUBLIEE/CLOTUREE sont visibles au public ; le propriétaire voit les siennes via `/mine/`.

## Frontend
- `Campaign` type + client API.
- Page `/campagnes` : grille de cartes (image, catégorie, titre, accroche, barre de progression, objectif, jours restants). Filtre par catégorie + recherche. [DESIGN — Fable]
- Page `/campagnes/:slug` : couverture, titre, porteur, barre de progression + objectif, description, actualités, bouton « Contribuer » (désactivé « Bientôt » tant que l'étape 5 n'est pas là). [DESIGN — Fable]
- Page `/campagnes/nouvelle` : formulaire de création (réservé porteur validé ; sinon message invitant à compléter le KYC). [DESIGN — Fable]
- Header : lien « Découvrir ». Espace compte : section « Mes campagnes » (liste + statut + lien créer). [DESIGN — Fable]

## Tâches
1. Backend : app `apps.campaigns`, modèles + migration (Pillow), admin modération.
2. Backend : serializers + permissions + vues + urls + tests.
3. Frontend : types + client, page liste campagnes [Fable].
4. Frontend : page détail campagne [Fable].
5. Frontend : création campagne + « Mes campagnes » + lien header [Fable].
