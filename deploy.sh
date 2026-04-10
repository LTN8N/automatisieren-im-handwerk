#!/usr/bin/env bash
# deploy.sh — Produktions-Deployment-Skript für Hostinger VPS (srv1033052)
# Verwendung: ./deploy.sh [image-tag]
# Beispiel:   ./deploy.sh v1.2.3
#             ./deploy.sh latest
set -euo pipefail

IMAGE_TAG="${1:-latest}"
COMPOSE_FILE="docker/docker-compose.prod.yml"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Deployment gestartet: $(date '+%Y-%m-%d %H:%M:%S') ==="
echo "Image-Tag: ${IMAGE_TAG}"

# --- 1. Neuesten Code holen ---
echo ""
echo ">>> Git: neuesten Stand holen..."
git pull --ff-only origin main

# --- 2. Environment prüfen ---
if [ ! -f "${APP_DIR}/.env.production" ]; then
  echo "FEHLER: .env.production nicht gefunden!"
  echo "  Bitte: cp .env.production.example .env.production && nano .env.production"
  exit 1
fi

# --- 3. Docker-Image pullen ---
echo ""
echo ">>> Docker: Image pullen (${IMAGE_TAG})..."
IMAGE_TAG="${IMAGE_TAG}" docker compose -f "${COMPOSE_FILE}" pull app

# --- 4. Container stoppen + neu starten ---
echo ""
echo ">>> Docker Compose: Container aktualisieren..."
IMAGE_TAG="${IMAGE_TAG}" docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

# --- 5. Auf App warten ---
echo ""
echo ">>> Warte auf Datenbank-Bereitschaft..."
timeout 60 bash -c 'until docker exec handwerk-db pg_isready -U handwerk -q; do sleep 2; done'

# --- 6. Prisma-Migrationen ausführen ---
echo ""
echo ">>> Prisma: Migrationen deployen..."
docker exec handwerk-app \
  node_modules/.bin/prisma migrate deploy \
  --schema=/app/prisma/schema.prisma

# --- 7. Health-Check ---
echo ""
echo ">>> Health-Check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
if [ "${HTTP_STATUS}" == "200" ]; then
  echo "Health-Check OK (HTTP 200)"
else
  echo "WARNUNG: Health-Check lieferte HTTP ${HTTP_STATUS}"
  echo "Logs prüfen: docker logs handwerk-app --tail=50"
fi

# --- 8. Alte Images aufräumen ---
echo ""
echo ">>> Docker: Alte Images aufräumen..."
docker image prune -f

# ============================================================
# WICHTIG: GoBD-Compliance (§147 AO — 10 Jahre Aufbewahrung)
# ============================================================
# Das PostgreSQL-Volume 'postgres_data' enthält alle Rechnungsdaten.
# Sicherstellen dass Hostinger-VPS-Backups aktiviert sind!
# Manuelles Backup: docker exec handwerk-db pg_dump -U handwerk handwerk | gzip > backup_$(date +%Y%m%d).sql.gz
# ============================================================

echo ""
echo "=== Deployment abgeschlossen: $(date '+%Y-%m-%d %H:%M:%S') ==="
