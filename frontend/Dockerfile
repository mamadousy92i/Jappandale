# Étape 1 : compilation du frontend React/Vite en fichiers statiques.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Étape 2 : Caddy sert les fichiers compilés et fait office de proxy HTTPS
# devant l'API Django (voir Caddyfile).
FROM caddy:2-alpine
COPY --from=build /app/dist /srv/app
COPY Caddyfile /etc/caddy/Caddyfile
