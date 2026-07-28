# Statuts de compte à 4 valeurs et journalisation des actions admin — Conception

**Date :** 28 juillet 2026
**Statut :** validé (délégation explicite de l'utilisateur, décisions prises en autonomie)
**Références :** `Jappandale_Cahier_des_Charges.docx` §5.1 (statuts de compte), §6 Auditabilité (« journalisation complète et immuable des opérations financières et des actions d'administration »)

## 1. Contexte

Audit du 28/07/2026 : le compte utilisateur n'a qu'un booléen `is_active`, pas les 4 statuts demandés par le cahier des charges (« en attente de validation, validé, suspendu, rejeté »). Et les actions d'administration hors métier financier (changement de rôle, suspension de compte) ne sont pas journalisées, contrairement au KYC, aux campagnes et aux reversements qui ont déjà leurs audit logs.

## 2. Décisions de conception

- **`account_status`** (nouveau champ sur `User`) : `EN_ATTENTE` (défaut à l'inscription) → `VALIDE` (automatique à la vérification de l'e-mail) ; un administrateur peut à tout moment passer un compte à `SUSPENDU` ou `REJETE`, et revenir à `VALIDE`.
- **Relation avec `is_active`** : `is_active` (champ Django historique, contrôle réellement la connexion) reste la source de vérité technique pour l'authentification. Il est **synchronisé automatiquement** : `SUSPENDU`/`REJETE` ⇒ `is_active = False` ; `VALIDE`/`EN_ATTENTE` ⇒ `is_active = True`. Aucune migration de comportement de connexion existant — seul un nouvel état explicite et traçable s'ajoute.
- **Relation avec `kyc_status`** : `account_status` est **distinct** du statut KYC (qui documente la vérification d'identité). Un compte peut être `VALIDE` (peut se connecter, utiliser la plateforme) sans que son KYC soit validé (il ne pourra simplement pas créer de campagne ni contribuer, règle déjà en place via `IsKycValidated`/`IsValidatedPorteur`). `account_status` couvre le cycle de vie du compte lui-même (abus, fraude, décision administrative), pas la vérification d'identité.
- **Note obligatoire** : passer un compte à `SUSPENDU` ou `REJETE` exige une note explicative (même exigence que `CampaignWorkflowSerializer` pour SUSPEND/CLOSE).
- **Garde-fou** : un administrateur ne peut pas suspendre/rejeter son propre compte (même principe que le garde-fou existant sur `is_active`/`role`).
- **Journalisation** : nouveau modèle `UserAuditLog` (app `accounts`), append-only, sur le modèle exact de `CampaignAuditLog` — enregistre changement de rôle et changement d'`account_status`, avec l'administrateur auteur, l'ancienne/nouvelle valeur, une note, et l'horodatage.

## 3. Modèle de données

### `User` (app `accounts`) — nouveaux champs

| Champ | Type | Description |
|---|---|---|
| `account_status` | Choix : `EN_ATTENTE` (défaut), `VALIDE`, `SUSPENDU`, `REJETE` | Statut du compte. |
| `account_status_note` | Texte, optionnel | Motif de la dernière décision (suspension/rejet). |
| `account_status_changed_at` | DateTime, nul | Date du dernier changement. |
| `account_status_changed_by` | FK `User`, nul | Administrateur auteur du dernier changement (nul si transition automatique). |

### `UserAuditLog` (app `accounts`, nouveau modèle)

| Champ | Type | Description |
|---|---|---|
| `user` | FK `User` (`CASCADE`) | Compte concerné. |
| `actor` | FK `User`, nul (`SET_NULL`) | Administrateur auteur (nul si transition automatique). |
| `action` | Choix : `ROLE_CHANGED`, `ACCOUNT_STATUS_CHANGED` | Type d'action journalisée. |
| `previous_value` / `new_value` | Texte court | Valeurs avant/après. |
| `note` | Texte, optionnel | Motif fourni par l'admin. |
| `created_at` | DateTime | Horodatage (append-only, jamais modifié). |

## 4. Comportement

- **Inscription** : `account_status = EN_ATTENTE` par défaut. `create_superuser` force `account_status = VALIDE` (un compte admin créé directement n'a pas à attendre de validation).
- **Vérification e-mail** (`apps/accounts/views.py`, endpoint existant de confirmation OTP) : si `account_status == EN_ATTENTE` au moment où l'e-mail est vérifié, passage automatique à `VALIDE` (`account_status_changed_by` reste `None` — transition automatique, pas une décision admin).
- **Back-office** (`UserManagementView.patch`, existant) : accepte désormais aussi `account_status` (+ `note` si `SUSPENDU`/`REJETE`). Applique la synchronisation `is_active`, journalise via `UserAuditLog`, journalise également tout changement de `role` (déjà accepté par la vue, jusqu'ici non journalisé).
- **Frontend back-office** : dans l'onglet Utilisateurs, remplacement du bouton unique « Désactiver/Réactiver » par trois actions **Valider / Suspendre / Rejeter**, avec un champ de note (affiché uniquement pour Suspendre/Rejeter, sur le modèle du `NoteField` déjà utilisé pour les campagnes), et affichage du statut de compte (au lieu du simple badge Actif/Désactivé).

## 5. Hors périmètre

- Pas de notification automatique à l'utilisateur suspendu/rejeté à ce stade (peut s'ajouter plus tard sans changer la structure — même pattern que les autres décisions admin).
- Pas de délai/expiration automatique de suspension (suspension indéfinie jusqu'à décision contraire).

## 6. Tests prévus

- Un utilisateur créé a `account_status = EN_ATTENTE` par défaut ; un superutilisateur créé a `account_status = VALIDE`.
- La vérification de l'e-mail fait passer `account_status` de `EN_ATTENTE` à `VALIDE` automatiquement.
- Un administrateur peut suspendre un compte (note obligatoire) : `is_active` passe à `False`, `UserAuditLog` créé.
- Un administrateur peut réactiver (`VALIDE`) un compte suspendu : `is_active` repasse à `True`.
- Suspendre/rejeter sans note est refusé (400).
- Un administrateur ne peut pas suspendre/rejeter son propre compte.
- Un changement de rôle est journalisé dans `UserAuditLog`.
- Un non-administrateur ne peut pas modifier `account_status` (403, déjà garanti par `IsJappandaleAdmin`).
