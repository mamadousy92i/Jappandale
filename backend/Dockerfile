# Construit depuis la racine du dépôt (voir docker-compose.yml : context: .),
# pour pouvoir embarquer le logo utilisé dans les e-mails (frontend/public/logo-mark.png)
# sans dupliquer le fichier dans backend/.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY frontend/public/logo-mark.png /app/assets/logo-mark.png

RUN mkdir -p /app/media /app/staticfiles \
    && chmod +x /app/docker/entrypoint.sh /app/docker/run_cron.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
