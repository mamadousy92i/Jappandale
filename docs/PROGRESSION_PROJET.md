# Jappandale — État d’avancement du projet

**Dernière mise à jour :** 22 juillet 2026  
**Périmètre :** MVP web, hors déploiement et hors branchement d’un prestataire de paiement réel  
**Référence fonctionnelle :** `Jappandale_Cahier_des_Charges.docx` et conception MVP du 20 juillet 2026

## 1. Résumé exécutif

Le MVP Jappandale est fonctionnel sur l’ensemble de son parcours principal : création de compte, vérification de l’adresse e-mail, profil et avatar, dépôt et revue KYC, création et modération des campagnes, contribution, notifications et pilotage depuis un tableau de bord administrateur adapté à un utilisateur non technique.

Le site dispose maintenant d’une identité visuelle cohérente, d’un parcours responsive, d’une page À propos, d’une présentation illustrée du fonctionnement, de pages légales et de confiance, ainsi que des principaux états vides, chargements et messages d’erreur attendus sur un produit professionnel.

Le principal bloc fonctionnel restant avant une mise en production réelle est l’intégration du paiement. **PayDunya est l’option recommandée**, car il permet de centraliser plusieurs moyens de paiement derrière une seule intégration. Tant que le client ne fournit pas un compte marchand validé et les accès API, la plateforme ne peut pas encaisser de fonds réels.

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
| Déploiement et exploitation | Hors lot actuel | Volontairement reporté |

Les fonctions Score Jappandale®, Passeport Financier®, Guichet Unique du Financement, wallet/séquestre, messagerie interne, application mobile, notifications SMS/push, KYC biométrique et contenus wolof restent dans la phase 2, conformément au périmètre retenu.

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

## 5. Validations techniques au 22 juillet 2026

- backend : **75 tests réussis** ;
- Django : `manage.py check` sans erreur ;
- migrations : aucune migration manquante ;
- frontend : **6 tests réussis** avec Vitest et Testing Library ;
- TypeScript et build Vite de production : réussis ;
- lint frontend : réussi sans avertissement ;
- vérification Git des espaces et conflits de patch : réussie.

Les tests frontend ajoutés couvrent le client API avec cookies/CSRF, le cycle de session, la confirmation MFA administrateur et l’affichage essentiel des cartes de campagne.

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

### Priorité 3 — Préparation à la mise en ligne

- créer un environnement de staging proche de la production ;
- utiliser PostgreSQL et un stockage média sauvegardé ;
- ajouter une politique CSP stricte ;
- exécuter `manage.py check --deploy` avec les paramètres HTTPS réels ;
- configurer sauvegardes, restauration, supervision, journaux et alertes ;
- réaliser un test d’intrusion ciblé, particulièrement sur l’authentification, le KYC, l’administration et les webhooks de paiement ;
- effectuer les tests responsive et multi-navigateurs sur appareils réels.

Le déploiement ne doit commencer qu’après la recette PayDunya et la validation des informations légales.

## 7. Décisions actées

- les OTP sont envoyés uniquement par e-mail pour le MVP ;
- PayDunya est mis en avant comme agrégateur de paiement recommandé ;
- Wave et Orange Money directs restent une alternative si le client obtient leurs accès ;
- le client utilise le tableau de bord web, pas Django Admin ;
- aucun wording public ne présente le produit comme une démonstration ;
- le déploiement est volontairement exclu de la phase de travail actuelle ;
- les accès, mots de passe SMTP et clés de paiement ne doivent jamais être versionnés.

## 8. Documents de référence

- `Jappandale_Cahier_des_Charges.docx` : périmètre fonctionnel contractuel ;
- `charte-graphique.md` : identité visuelle ;
- `docs/superpowers/specs/2026-07-20-jappandale-mvp-design.md` : conception du MVP ;
- `docs/staging-readiness.md` : prérequis avant mise en ligne ;
- `README.md` : commandes de lancement local.
