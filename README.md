# Jappandale

Plateforme sénégalaise de crowdfunding et de mise en relation financière.

## Stack

- **Backend :** Django 5 + Django REST Framework, PostgreSQL
- **Frontend :** React + Vite + TypeScript, Tailwind CSS v4, shadcn/ui
- **Charte graphique :** voir `charte-graphique.md`

## Démarrer en local

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # puis renseigner les identifiants PostgreSQL
python manage.py migrate
python manage.py runserver 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application sur http://localhost:5173, API sur http://localhost:8001/api/.

### Données de développement

```bash
cd backend
python manage.py shell < scripts/seed_campaigns.py
```



### Tests

```bash
cd backend && pytest
```

## Tâches planifiées (cron)

La clôture des campagnes à échéance ou à objectif atteint (collecte flexible :
les fonds déjà collectés restent acquis au porteur même si l'objectif n'est
pas atteint) est aussi vérifiée à la volée à chaque consultation de la liste
des campagnes ou confirmation d'une contribution, mais une tâche planifiée
quotidienne doit être configurée en production pour garantir une clôture
régulière même sans trafic :

```bash
cd backend
python manage.py cloturer_campagnes
```

En déploiement Docker (voir ci-dessous), cette tâche tourne déjà
automatiquement une fois par jour dans le service `cron` — rien à configurer
manuellement. Exemple d'entrée crontab pour un déploiement hors Docker (une
fois par jour à 2h du matin) :

```cron
0 2 * * * cd /chemin/vers/backend && /chemin/vers/.venv/bin/python manage.py cloturer_campagnes >> /var/log/jappandale/cloture_campagnes.log 2>&1
```

## Déploiement

La plateforme se déploie via Docker Compose (backend, PostgreSQL, tâche
planifiée, frontend + HTTPS automatique) :

```bash
cp .env.production.example .env   # puis renseigner les valeurs réelles
docker compose up -d --build
```

Guide complet, pas à pas, pour un VPS : `docs/deploiement-vps.md`.
Checklist de bascule HTTPS/cookies stricts avant ouverture : `docs/staging-readiness.md`.

## Documentation

- Le cahier des charges (`Jappandale_Cahier_des_Charges.docx`) est un document
  confidentiel YAMB International : il n'est pas versionné dans ce dépôt
  (voir `.gitignore`).
- Conception du MVP : `docs/superpowers/specs/2026-07-20-jappandale-mvp-design.md`
- Plans d'implémentation : `docs/superpowers/plans/`
