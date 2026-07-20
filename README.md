# Jappandale

Plateforme sénégalaise de crowdfunding et de mise en relation financière, portée par YAMB International.

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
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application sur http://localhost:5173, API sur http://localhost:8000/api/.

### Tests

```bash
cd backend && pytest
```

## Documentation

- Cahier des charges : `Jappandale_Cahier_des_Charges.docx`
- Conception du MVP : `docs/superpowers/specs/2026-07-20-jappandale-mvp-design.md`
- Plans d'implémentation : `docs/superpowers/plans/`
