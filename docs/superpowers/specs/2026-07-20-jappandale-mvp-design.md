# Jappandale — Conception du MVP

**Date :** 20 juillet 2026
**Statut :** validé sur le principe, en attente de relecture finale
**Références :** `Jappandale_Cahier_des_Charges.docx` (v1.0, juillet 2026), `charte-graphique.md`

## 1. Contexte et objectif

Jappandale est la plateforme de crowdfunding de YAMB International : elle connecte des porteurs de projets sénégalais avec des donateurs, investisseurs et la diaspora. Ce document définit le périmètre et la conception du **MVP**, aligné sur la « Phase 1 » du cahier des charges, adapté à la stack retenue.

**Stack retenue :** Django + Django REST Framework (backend API) · React + Vite + TailwindCSS + shadcn/ui (frontend) · PostgreSQL (base de données).

## 2. Périmètre du MVP

### Inclus

1. **Comptes et rôles** — inscription par e-mail + mot de passe, connexion, trois rôles : porteur de projet, contributeur, administrateur. Un utilisateur contributeur peut devenir porteur en soumettant un projet.
2. **KYC simplifié** — upload de pièce d'identité (+ justificatif d'activité pour les porteurs), validation **manuelle** par l'admin. Statuts de compte : en attente, validé, suspendu, rejeté. Toute action de vérification est journalisée (exigence d'audit BCEAO).
3. **Campagnes de don** — création par un porteur validé (titre, description, objectif financier, durée, images), modération admin avant publication, page publique avec barre de progression et liste des contributeurs (anonymisation possible), mises à jour publiées par le porteur, clôture automatique à échéance ou objectif atteint. Mode « collecte flexible » par défaut (les fonds restent acquis même si l'objectif n'est pas atteint).
4. **Contributions avec paiement simulé** — parcours de don complet (choix du montant, récapitulatif, confirmation) avec un fournisseur de paiement factice. Le code est structuré derrière une interface `PaymentProvider` afin de brancher plus tard PayDunya/Wave/Orange Money sans réécrire le parcours. Chaque transaction est enregistrée avec un statut (initiée, confirmée, échouée).
5. **Back-office** — Django admin personnalisé : validation des comptes et du KYC, modération des campagnes, vue des contributions et statistiques simples.
6. **Tableaux de bord** — porteur : progression de ses collectes, liste des contributions reçues ; contributeur : historique de ses dons et statut des campagnes soutenues.
7. **Notifications e-mail** — confirmation d'inscription, compte validé/rejeté, campagne validée/rejetée, confirmation de don, objectif atteint. (Console/e-mail de test en dev, prestataire transactionnel en production.)

### Reporté (hors MVP)

- Score Jappandale® et Passeport Financier® (phase 2 — le modèle de données du MVP les anticipe, voir §4).
- Guichet Unique du Financement, investissement participatif, wallet interne et séquestre, messagerie interne, notifications SMS/push, OTP téléphone, KYC automatisé (prestataire biométrique), application mobile, contenus wolof, intégration réelle Wave/Orange Money/carte bancaire.

## 3. Architecture

**Monolithe Django organisé en apps métier** (pas de microservices au MVP — complexité injustifiée pour une petite équipe). Le découplage exigé par le cahier des charges pour le scoring sera obtenu en phase 2 en isolant l'app `scoring` derrière une API interne.

```
jappandale/
├── backend/
│   ├── config/            # settings (base/dev/prod), urls, wsgi
│   └── apps/
│       ├── accounts/      # utilisateurs, rôles, profils
│       ├── kyc/           # documents, workflow de validation, journal d'audit
│       ├── campaigns/     # campagnes, mises à jour, modération
│       ├── contributions/ # dons, transactions, PaymentProvider (simulé)
│       └── notifications/ # envoi d'e-mails, historique
├── frontend/
│   └── src/
│       ├── components/    # shadcn/ui + composants métier
│       ├── pages/         # routes (React Router)
│       ├── lib/           # client API, utilitaires
│       └── hooks/
├── docs/
└── docker-compose.yml     # PostgreSQL (Redis plus tard)
```

- **API :** REST via Django REST Framework, authentification par JWT (djangorestframework-simplejwt), documentation auto (drf-spectacular).
- **Base locale :** `jappandale_db`, utilisateur `jappandale_user` — identifiants dans un fichier `.env` non versionné (jamais dans le code). Mot de passe de production distinct et fort.
- **Charte graphique :** palette or `#FAC502` / fond blanc, Playfair Display (titres) + Inter (corps), intégrée dans la config Tailwind et les variables CSS de shadcn (cf. `charte-graphique.md`).

## 4. Modèle de données (entités principales)

| Entité | Champs clés | Notes |
|---|---|---|
| `User` | e-mail (identifiant), mot de passe, rôle, statut du compte | Modèle utilisateur personnalisé dès le départ (indispensable en Django) |
| `KycDocument` | utilisateur, type de pièce, fichier, statut, validateur, horodatage | Journal d'audit des décisions conservé |
| `Campaign` | porteur, titre, slug, description, objectif (FCFA), montant collecté, échéance, statut (brouillon, en modération, publiée, rejetée, clôturée), image | Montants en `DecimalField` |
| `CampaignUpdate` | campagne, titre, contenu, date | Actualités du porteur |
| `Contribution` | contributeur, campagne, montant, anonyme (oui/non), statut, référence de transaction | Statuts : initiée, confirmée, échouée, remboursée |
| `Transaction` | contribution, fournisseur (« simulé »), référence externe, statut, horodatages | Prépare l'intégration réelle des paiements |
| `Notification` | destinataire, type, canal (e-mail), statut d'envoi, contenu | Historique exigé par le cahier des charges |

Anticipation phase 2 : les campagnes et contributions conservent toutes les données nécessaires au calcul futur du Score (historique d'exécution) sans champ supplémentaire à ce stade.

## 5. Parcours et gestion des erreurs

- **Inscription → KYC → action** : un utilisateur non validé peut naviguer mais ne peut ni créer de campagne ni contribuer ; messages clairs sur le statut de son dossier.
- **Paiement simulé** : le fournisseur factice peut être configuré pour échouer aléatoirement en développement afin de tester le parcours d'échec (don non comptabilisé, message d'erreur, possibilité de réessayer).
- **Modération** : rejet de campagne ou de KYC toujours accompagné d'un motif transmis par e-mail.
- **Intégrité financière** : le montant collecté d'une campagne est recalculé depuis les contributions confirmées (pas de compteur modifiable à la main) ; mises à jour en transaction base de données.

## 6. Direction design et interface

**Ambition :** un rendu très professionnel et épuré, digne des grandes plateformes du secteur (Kickstarter, GoFundMe, KissKissBankBank), tout en portant l'identité YAMB (or `#FAC502` sur fond blanc, Playfair Display pour les titres, Inter pour le corps).

- **Épure d'abord** : beaucoup d'espace blanc, hiérarchie typographique forte, l'or utilisé avec parcimonie (boutons d'action, accents, barres de progression) — jamais en aplat massif.
- **Composants** : shadcn/ui comme socle, personnalisé aux couleurs et rayons de la charte (boutons arrondis, cartes à ombre douce et bordure or au survol, labels de section en petites majuscules dorées).
- **Pages soignées en priorité** : page d'accueil (héro + campagnes en vedette), page publique de campagne (la « vitrine » du produit), parcours de don, tableaux de bord.
- **Images** : photos libres de droits (Unsplash, Pexels) sur les thèmes entrepreneuriat africain/sénégalais, artisanat, commerce, agriculture — cohérentes entre elles (lumière chaude, tons naturels). Licences vérifiées avant usage.
- **Micro-interactions** : animations d'apparition douces héritées de la charte (fadeInUp, transitions `cubic-bezier`), états de survol travaillés, squelettes de chargement.
- **Responsive mobile-first** : le cahier des charges cible un public sur mobile avec connexions à faible débit — images optimisées, pages légères.

## 7. Tests

- **Backend :** pytest + pytest-django — tests unitaires des règles métier (statuts, clôture automatique, recalcul des montants) et tests d'API (permissions par rôle, parcours de contribution).
- **Frontend :** Vitest + React Testing Library sur les composants critiques (formulaire de don, création de campagne).
- **Critère de recette MVP :** parcours complet démontrable — inscription → KYC validé → campagne publiée → don simulé confirmé → progression visible → e-mails reçus.

## 8. Étapes de construction

1. Fondations (repo, Django + DRF, React + Vite + Tailwind + shadcn, charte, PostgreSQL, `.env`).
2. Comptes et rôles (inscription, connexion JWT, profils).
3. KYC manuel (upload, workflow admin, journal d'audit).
4. Campagnes de don (CRUD, modération, page publique, clôture automatique).
5. Contributions et paiement simulé (parcours complet, transactions).
6. Tableaux de bord et notifications e-mail.
7. Finitions, tests de bout en bout, préparation du déploiement.
