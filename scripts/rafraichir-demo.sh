#!/bin/sh
# Rafraîchit les données de la démo en ligne avant de la montrer à quelqu'un :
# republie les campagnes closes uniquement par expiration de leur échéance
# (une campagne close par succès n'est jamais touchée).
#
# Utilisation, depuis n'importe où sur cette machine :
#   bash scripts/rafraichir-demo.sh
#
# Nécessite la clé SSH configurée précédemment (~/.ssh/jappandale_vps).

set -e

SERVEUR="ubuntu@152.228.141.27"
CLE="$HOME/.ssh/jappandale_vps"

if [ ! -f "$CLE" ]; then
  echo "Clé SSH introuvable : $CLE"
  echo "Ce script doit être lancé depuis la machine où l'accès au serveur a été configuré."
  exit 1
fi

echo "Mise à jour du code sur le serveur..."
ssh -i "$CLE" "$SERVEUR" 'cd /opt/jappandale && git pull --quiet'

echo "Rafraîchissement des échéances de démonstration..."
ssh -i "$CLE" "$SERVEUR" '
  cd /opt/jappandale
  docker cp backend/scripts/refresh_demo_dates.py jappandale-backend-1:/app/scripts/refresh_demo_dates.py
  docker compose exec -T backend python manage.py shell < backend/scripts/refresh_demo_dates.py
'

echo
echo "Terminé. La démo est prête : https://152-228-141-27.sslip.io"
