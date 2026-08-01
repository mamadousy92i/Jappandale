# Déployer Jappandale sur un VPS

Ce guide part de zéro : vous n'avez pas encore de serveur. Il suppose que
vous êtes à l'aise pour copier-coller des commandes dans un terminal, mais
n'explique aucune notion supposée acquise.

Toute la plateforme (backend Django, frontend React, base de données
PostgreSQL, HTTPS) tourne dans des conteneurs Docker orchestrés par
`docker-compose.yml`, à la racine du dépôt. Ce fichier a déjà été testé en
local (build + démarrage complet vérifiés) — il reste à le faire tourner sur
un vrai serveur avec un vrai nom de domaine.

## 1. Louer un VPS

N'importe quel fournisseur convient (Hetzner, OVH, DigitalOcean, Contabo...).
Choix recommandé pour démarrer :

- **Système** : Ubuntu 24.04 LTS (ou Debian 12)
- **Taille** : 2 vCPU / 4 Go de RAM minimum — Django + PostgreSQL + Caddy
  tiennent confortablement dans cette taille pour un lancement
- **Stockage** : 40 Go suffisent largement au démarrage

À la création, le fournisseur vous donne une **adresse IP publique** et un
mot de passe (ou une clé SSH) pour vous connecter. Notez l'IP, elle sert
partout ci-dessous.

## 2. Pointer le nom de domaine

Chez votre registrar (là où le nom de domaine `jappandale.sn` a été acheté),
ajoutez un enregistrement DNS :

| Type | Nom | Valeur              |
|------|-----|----------------------|
| A    | @   | l'IP du VPS          |
| A    | www | l'IP du VPS (facultatif) |

La propagation DNS peut prendre de quelques minutes à quelques heures.
Vérifiez avec :

```bash
dig +short jappandale.sn
```

Le résultat doit afficher l'IP du VPS. **Attendez que ce soit le cas avant
l'étape HTTPS** (Caddy a besoin que le domaine pointe déjà vers le serveur
pour obtenir son certificat automatiquement).

## 3. Se connecter et préparer le serveur

```bash
ssh root@IP_DU_VPS
```

Mettre à jour le système et installer Docker :

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```

Vérifier que ça fonctionne :

```bash
docker --version
docker compose version
```

Ouvrir les ports nécessaires (si un pare-feu est actif) :

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 4. Récupérer le code

```bash
apt install -y git
git clone https://github.com/mamadousy92i/Jappandale.git /opt/jappandale
cd /opt/jappandale
```

## 5. Configurer les variables d'environnement

```bash
cp .env.production.example .env
nano .env
```

Remplir **au minimum** :

- `POSTGRES_PASSWORD` — mot de passe de base de données, long et aléatoire
- `SECRET_KEY` — générez-en un avec la commande ci-dessous
- `DOMAIN` — votre nom de domaine réel (ex. `jappandale.sn`)
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`,
  `FRONTEND_URL` — à faire correspondre au domaine, en `https://`
- `CADDY_ACME_EMAIL` — une adresse e-mail valide (Let's Encrypt l'utilise
  pour vous prévenir en cas de problème de certificat)
- `EMAIL_HOST_PASSWORD` — mot de passe du compte e-mail d'envoi
- `INTERNAL_API_KEY` — une autre valeur longue et aléatoire

Pour générer une clé aléatoire solide :

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Utilisez une valeur différente pour `SECRET_KEY` et pour `INTERNAL_API_KEY`.

**Ne touchez pas** à `SIMULATED_PAYMENTS_ENABLED` : il doit rester `False`
en production (voir l'audit de sécurité — c'est le garde-fou qui empêche
quiconque de valider un faux paiement).

## 6. Démarrer la plateforme

```bash
docker compose up -d --build
```

Cette commande construit les images (backend, frontend+Caddy) et démarre
tout : base de données, migrations Django automatiques, collecte des
fichiers statiques, serveur d'application, tâche planifiée de clôture des
campagnes, et Caddy qui obtient le certificat HTTPS.

Suivre le démarrage :

```bash
docker compose logs -f
```

(`Ctrl+C` pour arrêter de suivre les logs — ça n'arrête pas les conteneurs.)

Vérifier que tout tourne :

```bash
docker compose ps
```

Les 4 services (`db`, `backend`, `cron`, `caddy`) doivent être `Up` (et `db`
`healthy`).

## 7. Vérifier

Ouvrez `https://jappandale.sn` (remplacez par votre domaine) dans un
navigateur. Le certificat doit être valide (cadenas vert), sans
avertissement.

Checklist minimale avant d'annoncer l'ouverture :

- [ ] La page d'accueil s'affiche
- [ ] Créer un compte, recevoir l'e-mail de vérification
- [ ] Se connecter, se déconnecter
- [ ] Se connecter côté back-office avec un compte `ADMIN` et recevoir le
      code de sécurité par e-mail
- [ ] Uploader une pièce KYC et vérifier qu'elle n'est PAS accessible via
      une URL directe (`https://jappandale.sn/media/kyc/...` doit afficher
      l'application, jamais le fichier)
- [ ] Consulter `docs/staging-readiness.md` — la checklist de bascule
      HTTPS/cookies stricts y est détaillée

## 8. Créer le premier compte administrateur

```bash
docker compose exec backend python manage.py createsuperuser
```

Répondez aux questions (e-mail, mot de passe). Ce compte a le rôle `ADMIN`
et l'accès à `/administration` avec code de sécurité par e-mail à chaque
connexion.

## Opérations courantes

**Mettre à jour le code après un nouveau commit sur `main` :**

```bash
cd /opt/jappandale
git pull
docker compose up -d --build
```

Les migrations et la collecte des fichiers statiques se relancent
automatiquement à chaque démarrage du conteneur `backend` — rien d'autre à
faire.

**Consulter les logs d'un service en particulier :**

```bash
docker compose logs -f backend
docker compose logs -f caddy
```

**Sauvegarder la base de données :**

```bash
docker compose exec db pg_dump -U jappandale jappandale > sauvegarde-$(date +%F).sql
```

Automatisez cette commande via une tâche planifiée du système (`crontab -e`
sur le VPS, en dehors de Docker), et copiez les sauvegardes hors du serveur
(un autre serveur, un stockage objet...). Une sauvegarde qui reste sur la
même machine que la base ne protège de rien en cas de panne du disque.

**Sauvegarder les fichiers médias** (avatars, images de campagne, pièces
KYC) :

```bash
docker run --rm -v jappandale_media_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/media-$(date +%F).tar.gz -C /data .
```

**Redémarrer un service après une modification de configuration :**

```bash
docker compose restart backend
```

**Arrêter complètement (sans perdre les données) :**

```bash
docker compose down
```

Les données restent dans les volumes Docker nommés (`jappandale_pgdata`,
`jappandale_media_data`, etc.) même après `docker compose down`. Elles ne
disparaissent que si vous ajoutez `-v` à cette commande — à ne faire que
volontairement, en connaissance de cause.

## Ce que ce guide ne couvre pas

- **Le certificat HTTPS** n'a pu être testé qu'en local avec un certificat
  auto-signé (Caddy le fait automatiquement pour `localhost`) : l'obtention
  d'un vrai certificat Let's Encrypt ne peut être vérifiée que sur le vrai
  serveur, avec le vrai domaine déjà pointé.
- **Le paiement réel** (Wave, Orange Money...) : voir l'audit de sécurité —
  c'est un chantier à part entière, à traiter avant l'ouverture au grand
  public. Le simulateur de paiement reste désactivé en production
  (`SIMULATED_PAYMENTS_ENABLED=False`).
- **La supervision/alerting** (être prévenu si le serveur tombe) et
  l'intégration continue (déploiement automatique à chaque commit) n'ont pas
  été mis en place — hors du périmètre de cette préparation.
