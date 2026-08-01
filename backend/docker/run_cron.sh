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

# La clôture des campagnes est déjà vérifiée à la volée à chaque consultation
# de la liste des campagnes ou confirmation de paiement (voir README) ; cette
# boucle est un filet de sécurité pour les campagnes qui n'ont plus de trafic.
echo "Tâche de clôture des campagnes démarrée (une fois par jour)."
while true; do
    echo "$(date -Iseconds) — clôture des campagnes échues..."
    if python manage.py cloturer_campagnes; then
        sleep 86400
    else
        # Échec probable : les migrations du service "backend" ne sont pas
        # encore terminées au tout premier démarrage. Nouvel essai rapide
        # plutôt que d'attendre 24h.
        echo "La clôture a échoué, nouvel essai dans 30s."
        sleep 30
    fi
done
