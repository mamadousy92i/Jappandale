#!/bin/sh
set -e

echo "Attente de la base de données..."
python - <<'PYEOF'
import os
import sys
import time

import psycopg

url = os.environ["DATABASE_URL"]
for attempt in range(30):
    try:
        psycopg.connect(url.replace("postgres://", "postgresql://"), connect_timeout=3).close()
        break
    except Exception as exc:  # noqa: BLE001
        print(f"  base de données pas encore prête ({exc}), nouvel essai...")
        time.sleep(2)
else:
    print("La base de données n'a jamais répondu, abandon.")
    sys.exit(1)
PYEOF

echo "Migrations..."
python manage.py migrate --noinput

echo "Fichiers statiques..."
python manage.py collectstatic --noinput

echo "Démarrage de gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --access-logfile - \
    --error-logfile -
