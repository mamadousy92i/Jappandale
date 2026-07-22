# Préparation du staging Jappandale

## Variables obligatoires

- `DEBUG=False`
- `SECRET_KEY` long, aléatoire et différent du développement
- `ALLOWED_HOSTS` limité au domaine du staging
- `CORS_ALLOWED_ORIGINS` et `CSRF_TRUSTED_ORIGINS` limités au frontend
- `FRONTEND_URL` configuré avec l’URL HTTPS publique
- une base PostgreSQL et un stockage média sauvegardés
- un serveur SMTP réel pour la récupération de mot de passe et les notifications

Configuration e-mail retenue :

- serveur sortant : `smtp.hostinger.com`
- port : `465`
- sécurité : SSL (`EMAIL_USE_SSL=True`, `EMAIL_USE_TLS=False`)
- compte : `contact@yambinternational.com`
- le mot de passe doit être fourni uniquement via `EMAIL_HOST_PASSWORD`

Les OTP sont envoyés exclusivement par e-mail. Aucun OTP SMS ou WhatsApp n’est
activé dans cette version.

## Protections HTTPS

Après validation du certificat et du proxy :

- `SECURE_SSL_REDIRECT=True`
- `SESSION_COOKIE_SECURE=True`
- `CSRF_COOKIE_SECURE=True`
- `TRUST_PROXY_SSL_HEADER=True` uniquement derrière un proxy maîtrisé
- commencer `SECURE_HSTS_SECONDS` avec une durée courte, puis augmenter progressivement
- n’activer `SECURE_HSTS_PRELOAD` qu’après vérification de tous les sous-domaines

## Accès administrateur

- créer un compte nominatif par membre de l’équipe avec le rôle `ADMIN` ;
- ne jamais copier le compte `demo.admin@jappandale.sn` en staging ou production ;
- retirer immédiatement les droits lors du départ d’un membre ;
- conserver Django Admin comme accès technique de secours uniquement.

## Vérifications avant ouverture

1. Exécuter les migrations et `manage.py check --deploy`.
2. Tester connexion, récupération du mot de passe et expiration du lien.
3. Tester validation/refus KYC et campagne depuis `/administration`.
4. Vérifier que les pièces KYC ne sont accessibles que par un lien temporaire.
5. Vérifier sauvegarde et restauration de PostgreSQL et des médias.
6. Configurer la surveillance des erreurs et les journaux sans données sensibles.
7. Remplacer les mentions légales provisoires par les informations de la structure.

## Point de sécurité restant

Le MVP stocke encore les jetons JWT dans le navigateur. Avant une exposition
publique importante, prévoir leur migration vers des cookies `HttpOnly`, ajouter
une politique CSP stricte et faire réaliser un test d’intrusion ciblé.
