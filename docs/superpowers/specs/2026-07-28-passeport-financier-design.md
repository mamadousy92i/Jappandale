# Passeport Financier Jappandale® — Conception

**Date :** 28 juillet 2026
**Statut :** validé (délégation explicite de l'utilisateur, décisions prises en autonomie)
**Références :** `Jappandale_Cahier_des_Charges.docx` §5.3 (Passeport Financier Jappandale®)

## 1. Contexte et cadrage du périmètre

Phase 2 du cahier des charges, implémentée maintenant à la demande de l'utilisateur. Le texte exige : génération automatique d'un historique financier consolidé, export PDF certifié/horodaté/vérifiable (QR code **ou** identifiant unique), accès permanent du porteur, et possibilité de partage avec un tiers externe.

**Décisions de cadrage :**
- **« Avis des financeurs »** : aucun système de notation/avis n'existe ailleurs dans Jappandale (ni dans le cahier des charges pour un autre module, ni dans le code). Plutôt que d'inventer un système de notation isolé et non demandé explicitement en détail, ce facteur est remplacé par des indicateurs factuels déjà disponibles et équivalents en substance : nombre de financeurs distincts, nombre total de contributions confirmées reçues. Cet ajustement est documenté ici plutôt qu'implicite.
- **QR code vs identifiant unique** : le cahier des charges accepte l'un **ou** l'autre (« QR code ou identifiant unique de vérification »). Choix : **identifiant unique** (UUID) affiché en clair sur le document, associé à une URL de vérification publique — pas de génération d'image QR (évite une dépendance supplémentaire sans plus-value fonctionnelle : l'UUID et l'URL remplissent exactement le même rôle de preuve vérifiable).
- **Partage avec un tiers** : la même URL de vérification publique sert de mécanisme de partage — un tiers financeur externe qui reçoit le lien peut consulter la confirmation d'authenticité et le résumé, sans avoir besoin d'un compte Jappandale.
- **Le Score Jappandale® courant** (déjà livré) est inclus dans le Passeport comme un des indicateurs de fiabilité, cohérent avec l'objectif du cahier des charges (« historique de fiabilité réutilisable »).

## 2. Contenu du Passeport (généré automatiquement)

Pour un porteur donné, agrégé à partir des données déjà présentes :

- Identité publique du porteur (nom ou organisation, ville, date d'inscription).
- Score Jappandale® courant (`effective_value`).
- Nombre de campagnes créées, publiées, clôturées avec succès (objectif atteint), rejetées/suspendues.
- Montant total collecté (brut) toutes campagnes confirmées confondues.
- Nombre de financeurs distincts et nombre total de contributions confirmées reçues.
- Nombre de litiges reçus et taux de litiges acceptés contre lui.
- Date de génération et identifiant unique de vérification.

## 3. Modèle de données (nouvelle app `financial_passport`)

### `PassportExport`

| Champ | Type | Description |
|---|---|---|
| `porteur` | FK `User` (`CASCADE`) | Porteur concerné. |
| `verification_id` | UUID (`default=uuid4`, unique) | Identifiant public de vérification, imprimé sur le PDF et utilisé dans l'URL de partage. |
| `snapshot` | JSON | Copie figée des données agrégées au moment de l'export (le PDF déjà émis reste vérifiable même si les statistiques du porteur évoluent ensuite). |
| `generated_at` | DateTime (`auto_now_add`) | Horodatage de génération — sert de preuve d'horodatage du document. |

Aucune mise à jour possible après création (append-only, un export = un enregistrement immuable, cohérent avec l'exigence de document « certifié, horodaté »).

## 4. API

- `GET /api/passeport/mine/` — réservé au porteur authentifié (`role == PORTEUR`). Calcule et renvoie l'agrégat courant (§2) **sans** créer d'export, pour un affichage à l'écran toujours à jour.
- `POST /api/passeport/mine/export/` — réservé au même porteur. Calcule l'agrégat courant, crée un `PassportExport` (snapshot figé), génère un PDF (bibliothèque `reportlab`, nouvelle dépendance) contenant les données du §2 plus l'identifiant de vérification et l'URL publique, et renvoie le fichier PDF en réponse (téléchargement direct, `Content-Type: application/pdf`).
- `GET /api/passeport/verifier/<uuid:verification_id>/` — **public** (`AllowAny`), consultable par un tiers externe sans compte. Renvoie `{valide: true, porteur: nom_public, genere_le, resume: snapshot}` si l'identifiant existe, 404 sinon. Ne renvoie que des informations déjà publiques (le porteur figure déjà sur ses campagnes publiques) — aucune donnée sensible (pas d'e-mail, pas de document KYC).

## 5. Frontend

- **Espace porteur** (`AccountPage.tsx`, onglet Informations personnelles, `role === "PORTEUR"`) : section « Passeport Financier » sous la carte Score — affiche l'agrégat courant et un bouton « Exporter en PDF » qui déclenche le téléchargement, et un lien « Copier le lien de vérification » une fois un export généré (utilise le dernier `verification_id` connu côté client après export).
- **Page publique** `/passeport/verifier/:verificationId` (nouvelle route, sans authentification) : affiche la confirmation d'authenticité et le résumé — c'est la page que voit un tiers externe qui reçoit le lien.

## 6. Hors périmètre

- Avis/notation des financeurs : remplacé par des indicateurs factuels (cf. §1).
- QR code image : identifiant textuel + URL à la place (les deux formes sont acceptées par le cahier des charges).
- Signature cryptographique du PDF (certificat X.509, etc.) : « certifié » est interprété ici comme « émis et vérifiable par la plateforme via l'identifiant unique », pas comme une signature numérique au sens PKI — hors périmètre technique raisonnable pour cette itération.
- Notification automatique lors d'un export : non requise par le cahier des charges.

## 7. Tests prévus

- L'agrégat (`GET /mine/`) reflète correctement les campagnes/contributions/litiges/score d'un porteur donné.
- Un non-porteur ne peut pas accéder à `/mine/` (403).
- Un export (`POST /mine/export/`) crée un `PassportExport` avec un `verification_id` unique et renvoie un PDF valide (`Content-Type: application/pdf`, contenu non vide).
- Chaque export crée une nouvelle ligne (immuable) — un second export du même porteur a un `verification_id` différent.
- `GET /verifier/<id>/` renvoie les données publiques pour un identifiant existant, 404 pour un identifiant inconnu, sans authentification requise.
- Les données renvoyées par `/verifier/<id>/` ne contiennent aucune donnée sensible (pas d'e-mail, pas de téléphone).
