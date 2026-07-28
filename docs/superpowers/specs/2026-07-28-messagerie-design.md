# Messagerie porteur↔financeurs — Conception

**Date :** 28 juillet 2026
**Statut :** validé, en attente de plan d'implémentation
**Références :** `Jappandale_Cahier_des_Charges.docx` §5.7 (Suivi, reporting et communication)

## 1. Contexte et objectif

Le cahier des charges (§5.7) exige un « espace de messagerie encadrée entre porteur de projet et financeurs ». C'est un chantier indépendant de l'intégration PayDunya : il s'agit d'échanges textuels entre utilisateurs, pas de paiement. « Encadrée » signifie ici : modération a posteriori par un administrateur, sur le même principe que le signalement de campagnes déjà en place — les messages partent normalement, mais tout message peut être signalé et consulté par un admin.

**Hors périmètre de ce document** : validation admin avant envoi (rejetée par l'utilisateur au profit de la modération a posteriori), messagerie en temps réel via WebSocket (remplacée par un sondage/polling périodique), suivi des litiges (chantier séparé).

## 2. Décisions de cadrage

- **Qui peut écrire à qui** : n'importe quel utilisateur connecté et KYC validé peut initier une conversation avec le porteur d'une campagne publiée ou clôturée — pas besoin d'avoir contribué au préalable.
- **Portée d'une conversation** : une conversation est rattachée à une campagne précise. Un même couple d'utilisateurs a une conversation distincte par campagne.
- **Prérequis** : KYC validé requis pour envoyer un message (même exigence que pour créer une campagne ou contribuer — réutilise la permission `IsKycValidated` existante).
- **Livraison** : pas de temps réel. Le front interroge (polling) le serveur toutes les ~8 secondes tant que la conversation est ouverte ; une notification (in-app + e-mail) est envoyée au destinataire à chaque nouveau message via le système de notifications existant.
- **Modération** : bouton « Signaler » sur chaque message, sur le modèle exact du signalement de campagnes (`CampaignReport`) déjà en place et déjà visible dans le back-office.

## 3. Modèle de données (nouvelle app `messaging`)

### `MessageThread`

| Champ | Type | Description |
|---|---|---|
| `campaign` | FK `Campaign` (`PROTECT`) | Campagne concernée. |
| `other_user` | FK `User` (`PROTECT`) | L'utilisateur qui n'est pas le porteur (le porteur est déduit de `campaign.owner`, qui ne change jamais). |
| `created_at` | DateTime | Date de création du fil. |

Contrainte d'unicité : `(campaign, other_user)`. Un `other_user` ne peut pas être égal à `campaign.owner` (un porteur ne peut pas s'écrire un message à lui-même).

### `Message`

| Champ | Type | Description |
|---|---|---|
| `thread` | FK `MessageThread` (`CASCADE`) | Fil auquel appartient le message. |
| `sender` | FK `User` (`PROTECT`) | Auteur du message (soit `thread.campaign.owner`, soit `thread.other_user`). |
| `body` | Texte (max 3000 caractères) | Contenu du message. |
| `created_at` | DateTime | Date d'envoi. |
| `read_at` | DateTime, nul | Renseigné quand le destinataire consulte le fil. |

### `MessageReport`

Même structure que `CampaignReport`, appliquée à un message :

| Champ | Type | Description |
|---|---|---|
| `message` | FK `Message` (`CASCADE`) | Message signalé. |
| `reporter` | FK `User` (`CASCADE`) | Auteur du signalement. |
| `reason` | Choix (`SPAM`, `HARCELEMENT`, `CONTENU_INAPPROPRIE`, `TENTATIVE_CONTOURNEMENT`, `AUTRE`) | Motif. |
| `details` | Texte (max 1500 caractères) | Précisions. |
| `status` | Choix (`NOUVEAU`, `EN_COURS`, `RESOLU`, `CLASSE`) | Statut de traitement. |
| `admin_note` | Texte, optionnel | Note interne. |
| `assigned_to` | FK `User`, nul | Administrateur en charge. |
| `created_at` / `updated_at` | DateTime | Horodatage. |

## 4. API

Toutes les routes sous `/api/messagerie/`, authentification requise.

- `POST /threads/` `{campaign_slug, body}` — Crée le fil `(campaign, other_user=request.user)` s'il n'existe pas encore, puis y ajoute le message. Permission : `IsAuthenticated`, `IsKycValidated`. Refuse si `campaign.owner_id == request.user.id` ou si le statut de la campagne n'est ni `PUBLIEE` ni `CLOTUREE`. Si le fil existe déjà, ajoute simplement le message (idempotent côté création de fil).
- `GET /threads/` — Liste les fils où l'utilisateur est `campaign.owner` ou `other_user`, triés par dernier message, avec aperçu du dernier message et compteur de messages non lus.
- `GET /threads/<id>/messages/` — Liste les messages du fil (l'utilisateur doit être `campaign.owner` ou `other_user` du fil, sinon 403/404). Marque comme lus (`read_at`) tous les messages non envoyés par l'utilisateur courant.
- `POST /threads/<id>/messages/` `{body}` — Ajoute un message au fil existant. Mêmes permissions que la création.
- `POST /messages/<id>/report/` `{reason, details}` — Crée un `MessageReport`. L'utilisateur doit être participant du fil du message signalé.

## 5. Modération et notifications

- Nouveau `Notification.Kind.MESSAGE_RECEIVED` : notifie le destinataire à chaque nouveau message (in-app + e-mail), avec lien vers `/compte?onglet=messages`.
- Back-office : nouvel onglet « Signalements messages », sur le même modèle que l'onglet Signalements campagnes déjà en place — liste des `MessageReport` ouverts, attribution à un admin, note interne, changement de statut. Nouvel endpoint `PATCH /api/backoffice/message-reports/<id>/`, miroir exact de `ReportReviewView`/`CampaignReport`.
- Le tableau de bord admin (`DashboardView`) expose une clé `message_reports` et une métrique `open_message_reports`, sur le modèle exact des signalements de campagnes.

## 6. Frontend

- Nouvel onglet « Messages » dans `AccountPage.tsx` (`?onglet=messages`), avec badge de non-lus sur l'onglet (comme le point doré déjà utilisé pour l'onglet KYC).
- Composant `MessagesSection` : liste des fils à gauche (campagne, autre participant, dernier message, badge non-lu), conversation ouverte à droite. Tant que la conversation est ouverte, le front interroge `GET /threads/<id>/messages/` toutes les ~8 secondes.
- Sur la page de détail de campagne (`CampaignDetailPage.tsx`), dans la section « Le porteur du projet » déjà existante (ligne ~404), ajout d'un bouton « Contacter le porteur » qui ouvre un champ de saisie et crée le fil via `POST /threads/`.
- Chaque message affiché a un bouton « Signaler », ouvrant un petit formulaire (motif + précisions) qui appelle `POST /messages/<id>/report/`.

## 7. Tests prévus

- Un utilisateur KYC validé peut créer un fil sur une campagne publiée et y envoyer un message.
- Un utilisateur non KYC-validé ne peut pas envoyer de message (403).
- Un porteur ne peut pas créer un fil sur sa propre campagne.
- Un fil ne peut pas être créé sur une campagne en brouillon ou en modération.
- La contrainte d'unicité `(campaign, other_user)` empêche la duplication de fils.
- Seuls les deux participants d'un fil peuvent lister ses messages (403/404 pour un tiers).
- La consultation d'un fil marque les messages reçus comme lus (`read_at` renseigné), sans affecter les messages envoyés par l'utilisateur courant.
- L'envoi d'un message notifie le destinataire (`Notification.Kind.MESSAGE_RECEIVED`).
- Un signalement de message crée un `MessageReport` consultable côté back-office, avec la même logique d'attribution/statut que `CampaignReport`.
- Seul un administrateur peut mettre à jour un `MessageReport` (403 sinon).

## 8. Hors périmètre (rappel)

- Validation admin avant envoi de chaque message : rejetée au profit de la modération a posteriori.
- Messagerie en temps réel (WebSocket) : remplacée par un sondage périodique côté front.
- Blocage automatique des coordonnées (e-mail/téléphone) dans le corps du message : non traité ici, pourrait s'ajouter plus tard sans changer la structure.
- Suivi des litiges : chantier séparé, à concevoir ensuite.
