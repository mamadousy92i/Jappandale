# Séquestre des fonds et commission de plateforme — Conception

**Date :** 27 juillet 2026
**Statut :** validé, en attente de plan d'implémentation
**Références :** `Jappandale_Cahier_des_Charges.docx` §5.6 (Module Paiements), `docs/superpowers/specs/2026-07-20-jappandale-mvp-design.md`

## 1. Contexte et objectif

Le cahier des charges (§5.6) exige : « Séquestre des fonds jusqu'à validation de l'étape de campagne concernée, avant reversement au porteur de projet » et « Gestion des commissions de plateforme ». Ces deux exigences sont indépendantes de l'intégration d'un prestataire de paiement réel (PayDunya) : ce sont des règles métier et de la traçabilité, pas un transfert d'argent effectif. Ce document conçoit ce workflow **en amont** de PayDunya, pour que la logique de reversement soit prête le jour où un vrai virement sera possible.

**Hors périmètre de ce document** : le déclenchement d'un vrai virement bancaire/mobile money (dépend de PayDunya), la messagerie porteur↔financeurs et le suivi des litiges (chantiers séparés, à concevoir ensuite).

## 2. Modèle de données

### `PlatformSettings` (nouveau, app `contributions`)

Singleton (un seul enregistrement en base, créé automatiquement si absent) :

| Champ | Type | Description |
|---|---|---|
| `commission_rate` | Decimal (2 décimales, 0 à 1) | Taux de commission plateforme, ex. `0.05` pour 5 %. Modifiable par un administrateur depuis l'admin Django, sans redéploiement. |

### `Contribution` (existant, app `contributions`) — nouveaux champs

| Champ | Type | Description |
|---|---|---|
| `payout_status` | Choix : `EN_SEQUESTRE` (défaut), `REVERSEE` | Statut du reversement au porteur. |
| `commission_rate_applied` | Decimal, nul | Taux de commission appliqué, **figé** au moment de la confirmation du paiement. |
| `commission_amount` | Entier (FCFA), nul | Montant de la commission, figé à la confirmation. |
| `net_amount` | Entier (FCFA), nul | `amount - commission_amount` : ce qui revient au porteur. Figé à la confirmation. |
| `payout_released_at` | DateTime, nul | Date du reversement. |
| `payout_released_by` | FK `User`, nul | Administrateur ayant déclenché le reversement. |

Ces champs restent `null` tant que la contribution n'est pas confirmée (statut `INITIEE` ou `ECHOUEE`).

**Pourquoi figer les valeurs à la confirmation plutôt que les recalculer à la demande ?** Si `commission_rate` change plus tard dans `PlatformSettings`, les contributions déjà confirmées ne doivent pas être recalculées rétroactivement — c'est une exigence d'auditabilité (§6 du cahier des charges : « journalisation complète et immuable des opérations financières »).

**Le montant public affiché (`Campaign.collected_amount`, barre de progression) reste le montant brut.** Il n'est pas recalculé à partir de `net_amount` — la commission est une donnée interne à la plateforme, invisible du grand public.

## 3. Calcul de la commission

Dans `apps/contributions/services.py`, la fonction `process_simulated_payment` (déjà existante) est étendue : au moment où une contribution passe à `CONFIRMEE`, on lit `PlatformSettings.commission_rate` courant et on calcule :

```
commission_amount = round(amount * commission_rate)
net_amount = amount - commission_amount
```

Ces trois valeurs (`commission_rate_applied`, `commission_amount`, `net_amount`) sont enregistrées sur la contribution à cet instant, en plus du `payout_status` qui reste `EN_SEQUESTRE`.

## 4. Workflow de reversement

- Une contribution confirmée reste `EN_SEQUESTRE` tant que la campagne associée n'a pas le statut `CLOTUREE` (statut déjà existant : atteint automatiquement à l'échéance ou à l'objectif atteint).
- Une fois la campagne `CLOTUREE`, un administrateur déclenche depuis le back-office une action **« Reverser les fonds de cette campagne »** (nouvel endpoint `POST /api/backoffice/campaigns/<id>/reverser/`, réservé aux admins). Cette action :
  - Refuse si la campagne n'est pas `CLOTUREE` (erreur explicite).
  - Marque **en une seule opération** toutes les contributions `CONFIRMEE` et encore `EN_SEQUESTRE` de cette campagne en `REVERSEE`, avec `payout_released_at` et `payout_released_by` renseignés.
  - Journalise l'opération (réutilise le pattern d'audit déjà en place pour KYC/campagnes — un enregistrement par campagne reversée, avec l'admin auteur, la date, et le nombre de contributions concernées).
  - Notifie le porteur (réutilise `apps.notifications.services.notify_user`) : « Les fonds de votre campagne ont été reversés. »

## 5. Remboursement

La fonction `refund_contribution` existante est restreinte : un remboursement n'est autorisé que si `payout_status == EN_SEQUESTRE`. Si la contribution a déjà été reversée, le remboursement est refusé avec un message explicite — ce cas (remboursement après reversement) relève du futur chantier « suivi des litiges » et n'est pas traité ici.

## 6. Visibilité

- **Back-office** (app `backoffice`) : sur la fiche d'une campagne, affichage du total en séquestre et du total déjà reversé (agrégats sur les contributions), et le bouton d'action de reversement (actif seulement si `CLOTUREE`).
- **Espace porteur** (composant `ReceivedContributions`, onglet Contributions) : pour chaque contribution reçue, badge de statut (« En séquestre » / « Reversée ») et `net_amount` affiché (ce qui revient effectivement au porteur, commission déduite).
- **Espace contributeur** (composant `MyContributions`) : inchangé — le contributeur voit toujours `amount` (montant brut de son don), pas la commission ni le statut de reversement, qui ne le concernent pas.

## 7. Tests prévus

- `PlatformSettings` : création automatique du singleton avec une valeur par défaut si absent ; un seul enregistrement possible.
- Calcul correct de `commission_amount` / `net_amount` à la confirmation d'un paiement, pour différents taux.
- Une contribution confirmée reste `EN_SEQUESTRE` par défaut.
- L'action de reversement est refusée (400) si la campagne n'est pas `CLOTUREE`.
- L'action de reversement marque bien **toutes** les contributions confirmées et non reversées d'une campagne, avec `payout_released_at`/`payout_released_by` renseignés — et ne touche pas les contributions d'une autre campagne.
- Une contribution déjà `REVERSEE` n'est pas re-marquée si l'action est déclenchée une seconde fois (idempotence).
- `refund_contribution` refuse une contribution `REVERSEE`.
- `Campaign.collected_amount` (montant public) n'est pas affecté par le calcul de la commission — reste égal à la somme des `amount` bruts des contributions confirmées.
- Seul un administrateur peut déclencher le reversement (403 sinon).

## 8. Hors périmètre (rappel)

- Aucun virement bancaire ou mobile money réel n'est déclenché — uniquement un changement de statut et un enregistrement d'audit, en préparation de l'intégration PayDunya.
- Messagerie porteur↔financeurs : chantier séparé, à concevoir ensuite.
- Suivi des litiges (y compris remboursement après reversement) : chantier séparé, à concevoir ensuite.
- Taux de commission par campagne : hors périmètre pour l'instant (taux unique global décidé) — pourra être ajouté plus tard sans changer la structure (le champ `commission_rate_applied` sur la contribution resterait valide).
