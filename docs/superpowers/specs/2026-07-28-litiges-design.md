# Suivi des litiges — Conception

**Date :** 28 juillet 2026
**Statut :** validé, en attente de plan d'implémentation
**Références :** `Jappandale_Cahier_des_Charges.docx` §5.6 (Module Paiements — « Gestion des commissions de plateforme, remboursements et cas de litige »)

## 1. Contexte et objectif

Le cahier des charges (§5.6) exige un suivi des litiges de paiement, aux côtés du séquestre/commission (déjà livré) et de la messagerie (déjà livrée). Le cas explicitement laissé de côté dans la conception de la messagerie était : un financeur conteste une contribution déjà confirmée, y compris après que les fonds ont été reversés au porteur. Ce document couvre ce cas.

**Hors périmètre** : tout vrai virement bancaire/mobile money (dépend de PayDunya) — la « résolution » d'un litige accepté est un changement de statut administratif, en préparation du vrai remboursement futur. Les litiges ouverts par un porteur (contre un financeur ou une décision admin) ne sont pas couverts ici.

## 2. Modèle de données (nouvelle app `disputes`)

### `Dispute`

| Champ | Type | Description |
|---|---|---|
| `contribution` | FK `Contribution` (`PROTECT`) | Contribution contestée. |
| `reporter` | FK `User` (`CASCADE`) | Le financeur qui ouvre le litige (toujours `contribution.contributor`). |
| `reason` | Choix : `PROJET_NON_CONFORME`, `PORTEUR_INJOIGNABLE`, `ERREUR_CONTRIBUTION`, `AUTRE` | Motif à l'ouverture. |
| `details` | Texte (max 1500) | Description libre. |
| `status` | Choix : `OUVERT` (défaut), `EN_EXAMEN`, `ACCEPTE`, `REJETE` | Statut de traitement. |
| `admin_note` | Texte, optionnel | Note interne. |
| `assigned_to` | FK `User`, nul | Administrateur en charge. |
| `resolved_at` | DateTime, nul | Renseigné au passage à `ACCEPTE` ou `REJETE`. |
| `created_at` / `updated_at` | DateTime | Horodatage. |

Contrainte : un seul litige actif (`OUVERT` ou `EN_EXAMEN`) par contribution — appliquée en code (pas de contrainte DB stricte, car un litige `REJETE` puis un nouveau litige sur la même contribution reste possible).

## 3. Ouverture d'un litige

- Endpoint `POST /api/litiges/` `{contribution_reference, reason, details}`.
- Autorisé uniquement au `contributor` de la contribution, et uniquement si `contribution.status == CONFIRMEE`.
- Refusé (400) si un litige `OUVERT`/`EN_EXAMEN` existe déjà pour cette contribution.
- Notifie les administrateurs (réutilise `apps.notifications.services.notify_admins`).
- Point d'entrée frontend : bouton « Ouvrir un litige » sur chaque contribution confirmée dans l'onglet Contributions du compte (composant `MyContributions`).

## 4. Résolution par un administrateur

- `PATCH /api/backoffice/disputes/<id>/` `{status, admin_note, assigned_to}`, réservé aux admins (même pattern que `ReportReviewView`/`MessageReportReviewView`).
- Passage à `EN_EXAMEN` : changement de statut simple.
- Passage à `ACCEPTE` : appelle une nouvelle fonction `resolve_dispute_accepted(dispute, actor)` dans `apps/disputes/services.py` qui :
  - Force `Contribution.status = REMBOURSEE` et `refunded_at = now`, **même si `payout_status == REVERSEE`** (remboursement administratif — documente la décision, ne déclenche aucun virement réel).
  - Appelle `recalculate_campaign_total` (comme le fait `refund_contribution` existante) pour que le montant public affiché reflète le retrait.
  - Notifie le financeur et le porteur.
  - Cette fonction est **distincte** de `refund_contribution` (`apps/contributions/services.py`), qui reste inchangée et continue de n'autoriser un remboursement que si `payout_status == EN_SEQUESTRE` — `refund_contribution` sert le cas normal (remboursement volontaire avant reversement), `resolve_dispute_accepted` sert le cas de litige tranché par un admin, y compris après reversement.
- Passage à `REJETE` : aucun changement sur la contribution.
- Les deux résolutions renseignent `resolved_at`.

## 5. Blocage du reversement de campagne

`release_campaign_payout` (`apps/contributions/services.py`) est étendue : elle refuse (lève `ValueError`, comme les refus existants) si une contribution `CONFIRMEE` de la campagne a un `Dispute` au statut `OUVERT` ou `EN_EXAMEN`. Ce contrôle s'ajoute à la vérification existante (campagne `CLOTUREE`, contributions en séquestre) — il précède la vérification d'existence de contributions en séquestre, car un litige doit bloquer même si d'autres contributions de la campagne sont déjà éligibles.

## 6. Back-office

- Nouvel onglet « Litiges » dans le tableau de bord admin, sur le modèle exact de l'onglet Signalements (liste, attribution via `WorkAssignmentView` avec un nouveau kind `"dispute"`, note interne, boutons d'action).
- `DashboardView` expose une clé `disputes` (litiges `OUVERT`/`EN_EXAMEN`) et une métrique `open_disputes`.

## 7. Tests prévus

- Un financeur peut ouvrir un litige sur sa contribution confirmée.
- Impossible d'ouvrir un litige sur une contribution qui n'est pas `CONFIRMEE`, ou qui n'appartient pas à l'utilisateur.
- Impossible d'ouvrir un second litige actif sur la même contribution.
- Un litige accepté force `REMBOURSEE` sur la contribution, même si elle était déjà `REVERSEE`.
- Un litige rejeté ne change rien à la contribution.
- `recalculate_campaign_total` reflète le retrait après acceptation.
- `release_campaign_payout` refuse si une contribution de la campagne a un litige ouvert ou en examen.
- Seul un administrateur peut faire évoluer le statut d'un litige (403 sinon).
- Le tableau de bord admin expose les litiges ouverts et la métrique associée.

## 8. Hors périmètre (rappel)

- Aucun virement réel — uniquement un changement de statut, en préparation de PayDunya.
- Litiges ouverts par un porteur : hors périmètre.
- Blocage automatique de contournement de plateforme dans les messages : déjà noté hors périmètre dans la conception de la messagerie, toujours hors périmètre ici.
