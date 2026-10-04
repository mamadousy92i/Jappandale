#!/bin/bash
# Copie le mot de passe e-mail et les clés PayTech de backend/.env (sur cette machine)
# vers le .env d'un serveur, SANS jamais les afficher, puis redémarre le backend.
#
# Utilisation :
#   bash scripts/copier-secrets-vers-serveur.sh root@191.215.43.63
#
# Nécessite la clé SSH ~/.ssh/jappandale_vps autorisée sur le serveur.

set -euo pipefail

SERVEUR="${1:?Usage : bash scripts/copier-secrets-vers-serveur.sh utilisateur@ip}"
CLE="${JAPPANDALE_SSH_KEY:-$HOME/.ssh/jappandale_vps}"
SOURCE="$(dirname "$0")/../backend/.env"
[ -f "$SOURCE" ] || { echo "Fichier introuvable : $SOURCE"; exit 1; }

SSH=(ssh -i "$CLE" -o ConnectTimeout=15 "$SERVEUR")
SECRETS='^(EMAIL_HOST_PASSWORD|API_KEY_PAYTECH|SECRET_KEY_PAYTECH)=.+'

grep -cE "$SECRETS" "$SOURCE" | sed 's/^/Valeurs trouvées dans backend\/.env : /'

# 1. Envoi des lignes dans un fichier temporaire protégé (lisible par root seulement).
grep -E "$SECRETS" "$SOURCE" | "${SSH[@]}" 'umask 077; cat > /root/.jappandale-secrets.tmp'

# 2. Mise à jour du .env du serveur (les valeurs ne transitent pas par la ligne de commande).
"${SSH[@]}" 'cd /opt/jappandale && python3 - <<'"'"'PY'"'"'
import os, re
path = "/root/.jappandale-secrets.tmp"
env = open(".env", encoding="utf-8").read()
done = []
for line in open(path, encoding="utf-8").read().splitlines():
    key = line.split("=", 1)[0]
    env, count = re.subn(rf"^{key}=.*$", lambda _m, l=line: l, env, flags=re.M)
    if not count:
        env += "\n" + line + "\n"
    done.append(key)
open(".env", "w", encoding="utf-8").write(env)
os.remove(path)
print("Mis à jour sur le serveur :", ", ".join(done))
PY
chmod 600 .env && docker compose up -d backend cron 2>&1 | tail -2'

echo "Terminé. Le backend a redémarré avec les nouvelles valeurs."
