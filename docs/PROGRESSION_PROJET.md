# Jappandale — État d’avancement du projet

**Dernière mise à jour :** 1er août 2026  
**Périmètre :** MVP web, hors branchement d’un prestataire de paiement réel  
**Référence fonctionnelle :** `Jappandale_Cahier_des_Charges.docx` et conception MVP du 20 juillet 2026

## 1. Résumé exécutif

Le MVP Jappandale est fonctionnel sur l’ensemble de son parcours principal : création de compte, vérification de l’adresse e-mail, profil et avatar, dépôt et revue KYC, création et modération des campagnes, contribution, notifications et pilotage depuis un tableau de bord administrateur adapté à un utilisateur non technique. L’interface publique et le parcours compte sont désormais disponibles en français et en wolof.

Le site dispose maintenant d’une identité visuelle cohérente, d’un parcours responsive, d’une page À propos, d’une présentation illustrée du fonctionnement, de pages légales et de confiance, ainsi que des principaux états vides, chargements et messages d’erreur attendus sur un produit professionnel.

Un audit de sécurité et test d’intrusion a été réalisé le 1er août 2026 (voir §5 bis) : deux failles critiques ont été trouvées, exploitées en conditions réelles pour preuve, puis corrigées et re-vérifiées. La préparation du déploiement (Docker Compose, HTTPS automatique, guide pas à pas) est terminée et testée en local (voir §5 ter) ; il ne reste que l’achat du VPS et le pointage du nom de domaine pour déployer réellement.

Le principal bloc fonctionnel restant avant une mise en production réelle est l’intégration du paiement. **PayDunya est l’option recommandée**, car il permet de centraliser plusieurs moyens de paiement derrière une seule intégration. Tant que le client ne fournit pas un compte marchand validé et les accès API, la plateforme ne peut pas encaisser de fonds réels — un garde-fou (`SIMULATED_PAYMENTS_ENABLED=False`) empêche désormais explicitement que le simulateur de paiement de développement tourne en production.

## 2. Fonctionnalités terminées

### Comptes et sécurité

- inscription avec les rôles porteur de projet et contributeur ;
- connexion par e-mail et mot de passe ;
- vérification de l’adresse par code OTP envoyé uniquement par e-mail ;
- récupération et réinitialisation sécurisées du mot de passe ;
- jetons de session stockés dans des cookies `HttpOnly`, inaccessibles au JavaScript ;
- protection CSRF des requêtes du navigateur ;
- renouvellement silencieux de la session et déconnexion complète ;
- double vérification obligatoire par code e-mail pour les administrateurs ;
- limitation du nombre de tentatives sur les actions sensibles ;
- rôles et permissions contrôlés dans l’API, indépendamment de l’interface.

### Profils et KYC

- consultation et modification du profil ;
- photo de profil avec contrôle du format, du poids et des dimensions ;
- affichage propre de l’avatar et du rôle dans la barre de navigation ;
- dépôt des pièces KYC selon le profil ;
- statuts non soumis, en attente, validé et rejeté ;
- affectation des dossiers aux administrateurs ;
- validation ou rejet motivé ;
- accès temporaire et protégé aux pièces sensibles ;
- journal d’audit append-only des dépôts et décisions.

### Campagnes

- liste publique avec recherche et filtres par catégorie ;
- page de détail avec progression, échéance, informations du projet et porteur ;
- bouton direct « Créer une campagne » et accès rapide à « Mes campagnes » ;
- création guidée d’une campagne par un porteur autorisé ;
- modification des brouillons et des campagnes rejetées ou suspendues avec formulaire prérempli ;
- affichage au porteur du motif de rejet ou de suspension puis renvoi en validation après correction ;
- brouillon, soumission, modération, publication, rejet, suspension, réactivation et clôture ;
- affectation des campagnes à un administrateur ;
- motif obligatoire pour les décisions sensibles ;
- publication d’actualités par le porteur ;
- contributions publiques anonymisables ;
- signalement d’une campagne et traitement depuis l’administration ;
- journal complet des changements de statut.

### Contributions et transactions

- sélection et saisie du montant ;
- récapitulatif avant validation ;
- création d’une contribution et d’une transaction associée ;
- statuts initiée, confirmée, échouée et remboursée ;
- recalcul du montant collecté à partir des contributions confirmées ;
- historique côté contributeur et visibilité côté porteur ;
- architecture `PaymentProvider` prête à recevoir PayDunya sans réécrire le parcours métier.

Le prestataire actuellement présent dans le code sert uniquement au développement local. Aucun encaissement réel ne doit être considéré comme actif avant l’intégration et la recette PayDunya.

### Administration métier

- tableau de bord web dédié, sans imposer Django Admin au client ;
- indicateurs globaux ;
- gestion des utilisateurs et des dossiers KYC ;
- modération et suivi des campagnes ;
- consultation des contributions et transactions ;
- traitement des signalements et demandes de support ;
- affectation des dossiers aux membres de l’équipe ;
- historique des actions sensibles ;
- Django Admin conservé uniquement comme outil technique de secours.

### Notifications et e-mails

- templates HTML aux couleurs de Jappandale avec logo ;
- e-mail de bienvenue et de vérification ;
- codes de connexion administrateur ;
- réinitialisation du mot de passe ;
- décisions KYC ;
- décisions de modération des campagnes ;
- confirmation de contribution ;
- notification d’objectif atteint ;
- messages de support ;
- historique des notifications dans l’espace utilisateur ;
- SMTP Hostinger préparé via variables d’environnement, sans mot de passe enregistré dans Git.

### Design, responsive et accessibilité

- direction visuelle cohérente avec la charte or, blanc et noir ;
- accueil éditorial, campagnes en vedette et appels à l’action clairs ;
- section « Comment ça marche » sous forme de parcours vertical illustré ;
- agrandissement animé et accessible des captures ;
- page À propos, page Confiance, contact et pages légales ;
- navigation responsive avec avatar et menu utilisateur structuré ;
- réinitialisation du défilement à chaque changement de page ;
- lien d’évitement vers le contenu principal ;
- navigation mobile fermable avec la touche Échap ;
- indication de la page active dans la navigation ;
- zones tactiles renforcées sur les filtres et boutons clés ;
- respect de `prefers-reduced-motion` sur les animations principales ;
- titre et description adaptés aux principales routes pour une meilleure présentation dans le navigateur et les moteurs de recherche.

## 3. Conformité au cahier des charges — Phase 1

| Exigence du MVP | État | Observation |
|---|---:|---|
| Comptes, connexion et rôles | Terminé | Trois rôles, permissions API et parcours web |
| KYC manuel avec audit | Terminé | Dépôt, affectation, décision motivée et historique |
| Création et modération des campagnes | Terminé | Cycle complet jusqu’à la clôture |
| Pages publiques des campagnes | Terminé | Recherche, filtres, progression, actualités et contributeurs |
| Parcours de contribution | Terminé techniquement | Encaissement réel en attente de PayDunya |
| Tableau de bord porteur/contributeur | Terminé | Intégré aux campagnes et au compte |
| Back-office métier | Terminé | Tableau de bord React destiné au client |
| Notifications e-mail | Terminé | SMTP configurable et templates de marque |
| Sécurité de base du MVP | Terminé | Cookies HttpOnly, CSRF, MFA admin, throttling, audits |
| Paiement Wave/Orange Money/carte | Bloqué par accès externe | À fournir via PayDunya ou contrats directs opérateurs |
| Audit de sécurité / test d’intrusion | Terminé | 2 failles critiques trouvées, exploitées et corrigées ; voir §5 bis |
| Déploiement et exploitation | Préparé, non exécuté | Configuration Docker + guide prêts ; VPS et domaine à acheter, voir §5 ter |

Les fonctions Score Jappandale®, Passeport Financier®, Guichet Unique du Financement, wallet/séquestre, messagerie interne, application mobile, notifications SMS/push et KYC biométrique restent dans la phase 2, conformément au périmètre retenu.

Le contenu wolof a en revanche été ajouté par anticipation sur les pages fonctionnelles principales (accueil, campagnes, compte, contributions, litiges, vérification du passeport) ; seules les pages légales restent en français uniquement, une traduction contractuelle demandant une relecture juridique professionnelle plutôt qu’une traduction automatisée.

## 4. Paiement — éléments à obtenir du client

### Option recommandée : PayDunya

Le client doit obtenir :

1. un compte marchand PayDunya au nom de la structure ;
2. la validation KYC de ce compte marchand ;
3. les clés API de test puis de production ;
4. les moyens de paiement activés sur le compte, notamment Wave et Orange Money ;
5. les règles de commission, reversement et remboursement ;
6. l’URL ou la méthode attendue pour les webhooks de confirmation ;
7. un contact technique ou commercial PayDunya en cas de blocage de recette.

Les clés devront être transmises par un canal sécurisé et placées uniquement dans les variables d’environnement. Elles ne doivent jamais apparaître dans un document, un message de commit ou le code source.

Si PayDunya n’est pas retenu, il faudra obtenir séparément auprès de Wave et d’Orange Money un contrat marchand, les identifiants API de test et de production, la documentation d’intégration, les paramètres de webhook, les règles de reversement et les coordonnées d’un support technique.

## 5. Validations techniques au 1er août 2026

- backend : **228 tests réussis** (pytest) ;
- Django : `manage.py check` sans erreur ;
- migrations : aucune migration manquante ;
- frontend : **6 tests réussis** avec Vitest et Testing Library ;
- TypeScript et build Vite de production : réussis ;
- lint frontend : réussi sans avertissement ;
- vérification Git des espaces et conflits de patch : réussie.

Les tests frontend ajoutés couvrent le client API avec cookies/CSRF, le cycle de session, la confirmation MFA administrateur et l’affichage essentiel des cartes de campagne.

## 5 bis. Audit de sécurité et test d’intrusion — 1er août 2026

Revue de code complète (authentification/back-office, paiements/KYC, campagnes/social, frontend) suivie d’une vérification par exploitation réelle sur environnement local pour chaque piste sérieuse, avant correction.

**Failles critiques trouvées, exploitées puis corrigées :**

- confirmation de paiement falsifiable côté client (aucun prestataire réel branché) — désormais bloquée hors développement via `SIMULATED_PAYMENTS_ENABLED` ;
- auto-promotion administrateur possible pour tout compte marqué `is_staff` sans le rôle métier `ADMIN` — l’accès au back-office ne dépend plus que du rôle métier, et un compte ne peut plus modifier son propre rôle.

**Corrigés également :** déconnexion qui ne révoquait pas le jeton de session côté serveur (liste de révocation activée) ; une campagne non publiée pouvait être « signalée » par devinette de son adresse (fuite d’existence, impact mineur).

**Zones vérifiées sans faille exploitable trouvée :** messagerie, litiges, notifications, guichet unique, upload et accès aux pièces KYC, passeport financier, API interne du score, frontend (aucun usage dangereux de `dangerouslySetInnerHTML` ou de rendu HTML non échappé en dehors d’une faille XSS trouvée et corrigée séparément dans les boîtes de confirmation SweetAlert2 du back-office).

**Reste ouvert, hors périmètre d’un correctif de code :** l’intégration d’un vrai prestataire de paiement (voir §4) est la condition pour réactiver la confirmation de paiement en production.

## 5 ter. Préparation du déploiement — 1er août 2026

Configuration Docker Compose complète (backend Django/gunicorn, PostgreSQL, tâche planifiée de clôture des campagnes, frontend + HTTPS automatique via Caddy), testée de bout en bout en local : build des images, démarrage, migrations automatiques, fichiers statiques, HTTPS local, et vérification que les documents KYC ne sont jamais exposés en accès direct par le serveur web.

Guide de déploiement pas à pas pour un VPS dans `docs/deploiement-vps.md`, modèle de configuration production dans `.env.production.example`.

**Reste à faire :** acheter le VPS, pointer un nom de domaine réel, et vérifier l’obtention du certificat HTTPS Let’s Encrypt (seule étape qui ne peut pas être testée sans serveur réel).

## 6. Suite recommandée

### Priorité 1 — Paiement réel

- recevoir et valider les accès PayDunya ;
- développer l’adaptateur PayDunya ;
- vérifier la signature et l’idempotence des webhooks ;
- tester les paiements réussis, échoués, abandonnés et remboursés ;
- faire une recette complète en environnement de test PayDunya.

### Priorité 2 — Recette métier

- faire tester chaque rôle par le client sur les données de développement ;
- valider les textes, motifs, catégories et règles de modération ;
- faire approuver tous les modèles d’e-mail ;
- remplacer les mentions légales provisoires par les informations officielles ;
- valider la politique de confidentialité, les conditions d’utilisation et la gestion des remboursements avec un conseil juridique compétent.

### Priorité 3 — Mise en ligne effective

- acheter le VPS et pointer le nom de domaine (voir `docs/deploiement-vps.md`) ;
- exécuter le déploiement et vérifier l’obtention du certificat HTTPS réel ;
- configurer les sauvegardes automatiques (base de données et fichiers médias) hors du serveur lui-même ;
- ajouter une politique CSP stricte ;
- mettre en place la supervision (disponibilité, journaux, alertes) — non couverte par la préparation actuelle ;
- effectuer les tests responsive et multi-navigateurs sur appareils réels.

Le test d’intrusion ciblé (authentification, KYC, administration) a été réalisé le 1er août 2026 (§5 bis) ; un nouveau passage sera nécessaire une fois les webhooks de paiement réel branchés. Le déploiement ne doit s’ouvrir au public qu’après la recette PayDunya et la validation des informations légales.

## 7. Décisions actées

- les OTP sont envoyés uniquement par e-mail pour le MVP ;
- PayDunya est mis en avant comme agrégateur de paiement recommandé ;
- Wave et Orange Money directs restent une alternative si le client obtient leurs accès ;
- le client utilise le tableau de bord web, pas Django Admin ;
- aucun wording public ne présente le produit comme une démonstration ;
- la préparation du déploiement (Docker, guide VPS) est terminée ; le déploiement effectif attend l’achat du serveur et du domaine ;
- les accès, mots de passe SMTP et clés de paiement ne doivent jamais être versionnés ;
- le simulateur de paiement de développement ne doit jamais tourner en production (`SIMULATED_PAYMENTS_ENABLED=False`).

## 8. Documents de référence

- `Jappandale_Cahier_des_Charges.docx` : périmètre fonctionnel contractuel ;
- `charte-graphique.md` : identité visuelle ;
- `docs/superpowers/specs/2026-07-20-jappandale-mvp-design.md` : conception du MVP ;
- `docs/staging-readiness.md` : prérequis avant mise en ligne ;
- `docs/deploiement-vps.md` : guide pas à pas du déploiement sur VPS (Docker) ;
- `.env.production.example` : modèle de configuration production ;
- `README.md` : commandes de lancement local.
