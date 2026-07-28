# Score Jappandale® — Conception

**Date :** 28 juillet 2026
**Statut :** validé (délégation explicite de l'utilisateur, décisions prises en autonomie)
**Références :** `Jappandale_Cahier_des_Charges.docx` §5.2 (Moteur Score Jappandale®), §5.7 (tableau de bord porteur), §5.8 (back-office — gestion des paramètres du Score)

## 1. Contexte et cadrage du périmètre

Le cahier des charges place le Score Jappandale® en Phase 2, mais l'utilisateur a demandé de l'implémenter maintenant. Le texte du §5.2 exige : un algorithme propriétaire alimenté par les données déclaratives du projet, l'historique d'exécution de campagnes précédentes, des signaux externes « lorsque disponibles », et une revue qualitative humaine — avec l'exigence architecturale que le moteur soit **découplé du reste de l'application**.

**Décisions de cadrage (le texte laisse une latitude d'implémentation, choix faits en autonomie) :**
- **Signaux externes** (centrale des risques, données mobile money) : non disponibles à ce stade (aucun partenaire intégré) — le cahier les rend explicitement conditionnels (« lorsque disponibles »), ils sont donc omis sans que cela constitue un écart.
- **Découplage** : implémenté comme une **app Django dédiée** (`apps.scoring`) avec son propre modèle, son propre service de calcul pur (aucune dépendance vers les vues d'autres apps) et sa propre API REST — un découplage réel à l'intérieur du monolithe existant, cohérent avec l'architecture du reste du projet (aucune autre fonctionnalité de Jappandale n'est un microservice séparé). Un vrai microservice indépendant serait disproportionné à ce stade et incohérent avec le reste de la stack.
- **« Score mixte automatique + validation humaine »** : le score est calculé automatiquement à partir de signaux réels et mesurables déjà présents dans la plateforme ; un administrateur peut le surclasser manuellement (validation humaine) avec une note justificative.
- **Paramétrable** : les poids de chaque facteur sont stockés dans un singleton `ScoringSettings` modifiable depuis l'admin Django (`/admin/`) — pas de nouvelle interface React dédiée aux paramètres à ce stade (l'admin Django suffit pour un réglage ponctuel des poids, qui n'est pas une opération quotidienne). C'est un choix de sobriété assumé, documenté ici plutôt qu'implicite.

## 2. Signaux utilisés (uniquement des données déjà présentes dans la plateforme)

| Facteur | Source | Effet |
|---|---|---|
| KYC validé | `User.kyc_status` | Bonus fixe si `VALIDE`. |
| Ancienneté du compte | `User.date_joined` | Bonus croissant plafonné (12 mois = plafond). |
| Activité (campagnes publiées) | `Campaign` du porteur, statut `PUBLIEE`/`CLOTUREE` | Bonus croissant plafonné à 5 campagnes. |
| Taux de réussite | Campagnes `CLOTUREE` du porteur : proportion avec `collected_amount >= goal_amount` | Bonus proportionnel (neutre si aucune campagne clôturée). |
| Montant total collecté avec succès | Somme des contributions `CONFIRMEE` sur les campagnes du porteur | Bonus croissant (échelle logarithmique, plafonné). |
| Litiges acceptés contre lui | `Dispute.status == ACCEPTE` sur les contributions reçues, rapporté au nombre de contributions confirmées reçues | Pénalité proportionnelle (neutre si aucune contribution reçue). |
| Signalements de campagne résolus | `CampaignReport.status == RESOLU` sur ses campagnes | Pénalité par signalement, plafonnée. |
| Campagnes rejetées/suspendues | `Campaign.status in (REJETEE, SUSPENDUE)` du porteur | Pénalité par campagne, plafonnée. |

Score de base : 50/100 (neutre), ajusté par les facteurs ci-dessus, borné à [0, 100].

## 3. Modèle de données (nouvelle app `scoring`)

### `ScoringSettings` (singleton, même pattern que `PlatformSettings`)

Un champ `DecimalField` par poids/plafond du tableau ci-dessus (valeurs par défaut correspondant à la pondération décrite en §2), modifiable uniquement depuis l'admin Django.

### `Score`

| Champ | Type | Description |
|---|---|---|
| `porteur` | FK `User` (`CASCADE`) | Le porteur noté. |
| `value` | Entier (0-100) | Score calculé automatiquement. |
| `breakdown` | JSON | Détail des contributions de chaque facteur (transparence). |
| `is_manual_override` | Booléen | Si un admin a surclassé le score. |
| `override_value` | Entier (0-100), nul | Valeur imposée par l'admin. |
| `override_note` | Texte, optionnel | Justification de la validation humaine. |
| `override_by` | FK `User`, nul | Administrateur auteur du surclassement. |
| `computed_at` | DateTime | Horodatage du calcul (append-only : chaque calcul crée une nouvelle ligne, historique conservé). |

Valeur affichée (`effective_value`) = `override_value` si `is_manual_override`, sinon `value`.

## 4. API

- `GET /api/scoring/mine/` — réservé au porteur authentifié. Recalcule le score à la volée (à partir de ses données actuelles), l'enregistre comme nouvelle ligne `Score`, et renvoie `{value, effective_value, breakdown, is_manual_override, computed_at}`.
- `POST /api/backoffice/scores/<user_id>/override/` `{override_value, note}` — réservé aux admins. Calcule le score automatique courant du porteur, crée une ligne `Score` avec `is_manual_override=True`, `override_value`, `override_note`, `override_by`.
- `GET /api/backoffice/dashboard/` — étendu avec une clé `porteurs_scores` : liste des porteurs KYC validés avec leur dernier score (`effective_value`, `is_manual_override`, `computed_at`).

## 5. Frontend

- **Espace porteur** (`AccountPage.tsx`, onglet Informations personnelles, visible uniquement pour `role === "PORTEUR"`) : petite carte affichant le score courant (note sur 100) et le détail des facteurs (`breakdown`), rafraîchie à l'affichage de l'onglet.
- **Back-office** : nouvel onglet « Scores » dans `AdminDashboardPage.tsx` — liste des porteurs avec leur score courant et un bouton « Ajuster manuellement » ouvrant un petit formulaire (valeur 0-100 + note), sur le modèle des formulaires d'action déjà en place.

## 6. Hors périmètre

- Signaux externes (centrale des risques, données mobile money) : non disponibles, explicitement conditionnels dans le cahier des charges.
- Interface React dédiée à l'édition des poids : gérée via l'admin Django uniquement (choix de sobriété assumé).
- Recalcul automatique en tâche de fond (cron) : le score est recalculé à la demande (à chaque consultation), pas de planification périodique à ce stade.
- Historique visuel (graphique d'évolution du score) : seul le score courant est affiché ; l'historique est conservé en base (append-only) mais pas encore exposé dans l'UI.

## 7. Tests prévus

- Le calcul du score respecte les bornes [0, 100] même dans les cas extrêmes (porteur sans aucune activité, porteur avec un historique très négatif).
- Un porteur KYC validé sans aucune campagne a un score neutre proche de la base (bonus KYC seul).
- Un porteur avec des campagnes clôturées toutes réussies a un score supérieur à un porteur sans historique.
- Un porteur avec un litige accepté contre lui voit son score pénalisé proportionnellement.
- `GET /api/scoring/mine/` est refusé à un non-porteur (ou renvoie un score neutre sans historique — à trancher en implémentation selon simplicité).
- Un administrateur peut imposer une valeur manuelle avec note ; `effective_value` reflète alors l'override.
- Un non-administrateur ne peut pas appeler l'endpoint d'override (403).
- Le tableau de bord admin expose la liste des porteurs avec leur score courant.
