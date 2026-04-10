# Automatisieren im Handwerk

SaaS-Plattform fuer Handwerks- und Dienstleistungsunternehmen in der DACH-Region (spaeter weltweit).

## Was ist das?

Ein KI-gestuetztes Angebots- und Rechnungsmanagement. Einrichten wie ein E-Mail-Postfach — Account erstellen, Firmendaten eingeben, loslegen. Voice-First: Der Nutzer spricht mit einer KI wie mit einem Buerokollegen.

## Kern-Features

- **Conversational Angebote & Rechnungen** — per Sprache, Chat oder manuell
- **Voice-First** — "Fueg beim Angebot Mueller noch 3 Steckdosen hinzu"
- **PDF-Generierung + E-Mail-Versand** — direkt aus der App
- **Multi-Tenant** — jeder Handwerker hat seinen eigenen Bereich
- **Wartungsvertraege** — Upload, Monitoring, Disposition
- **DACH-ready** — USt, GoBD, laenderspezifische Regeln

## Entwicklung

Dieses Projekt wird mit [PaperClip](https://github.com/paperclipai/paperclip) entwickelt — einem Multi-Agent-Orchestrierungs-Framework. 9 KI-Agenten arbeiten autonom an der Plattform.

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20+
- pnpm
- Docker + Docker Compose

### Setup

```bash
# Repository klonen
git clone https://github.com/natscho-hh/automatisieren-im-handwerk.git
cd automatisieren-im-handwerk

# Abhaengigkeiten installieren
pnpm install

# Umgebungsvariablen anlegen
cp .env.example .env.local
# .env.local bearbeiten: DATABASE_URL, AUTH_SECRET, ANTHROPIC_API_KEY

# Datenbank starten (PostgreSQL via Docker)
docker compose -f docker/docker-compose.yml up -d

# Erste Migration ausfuehren
pnpm prisma migrate dev

# Entwicklungsserver starten
pnpm dev
```

Die App laeuft auf http://localhost:3000.

## Deployment (VPS / Hostinger)

### Voraussetzungen auf dem Server

- Docker + Docker Compose
- Traefik (laeuft bereits fuer n8n auf dem VPS)
- GitHub Actions Secrets konfiguriert (siehe unten)

### Secrets konfigurieren

Kopiere `.env.production.example` nach `.env.production` auf dem Server und befuelle alle Felder:

```bash
# Pflichtfelder:
DATABASE_URL=postgresql://...
POSTGRES_USER=...
POSTGRES_PASSWORD=...        # starkes Passwort, mind. 32 Zeichen
POSTGRES_DB=handwerk_prod
AUTH_SECRET=...              # openssl rand -base64 32
NEXTAUTH_URL=https://deine-domain.de
ANTHROPIC_API_KEY=sk-ant-...
DOMAIN=deine-domain.de

# Optional:
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### GitHub Actions Secrets

Im GitHub Repository unter Settings > Secrets and variables > Actions:

| Secret | Beschreibung |
|--------|-------------|
| `SSH_HOST` | IP-Adresse des VPS |
| `SSH_USER` | SSH-Benutzername (z.B. root) |
| `SSH_PRIVATE_KEY` | Privater SSH-Schluessel |
| `SSH_PORT` | SSH-Port (Standard: 22) |

### Erstmalige Einrichtung auf dem Server

```bash
# App-Verzeichnis anlegen
mkdir -p /opt/handwerk && cd /opt/handwerk

# .env.production anlegen (Secrets von oben eintragen)
nano .env.production

# Erster Start (zieht Image von ghcr.io)
docker compose -f docker/docker-compose.prod.yml up -d

# Erste Datenbank-Migration ausfuehren
docker exec handwerk-app npx prisma migrate deploy

# Health-Check
curl http://localhost:3000/api/health
```

### Folge-Deployments (automatisch via GitHub Actions)

Jeder Push auf `main` loest automatisch ein Deployment aus:

1. Docker-Image wird gebaut und auf `ghcr.io` gepusht
2. SSH auf VPS: `git pull` + `docker compose up -d` + `prisma migrate deploy`
3. Health-Check bestaetigt erfolgreichen Start

Manuell ausfuehren:

```bash
cd /opt/handwerk && bash deploy.sh
```

### Health-Check API

`GET /api/health` liefert:

```json
{
  "status": "ok",
  "db": "connected",
  "dbLatencyMs": 2,
  "version": "0.1.0",
  "uptimeSeconds": 3600,
  "timestamp": "2026-04-10T12:00:00.000Z"
}
```

HTTP 200 = gesund, HTTP 503 = Datenbankfehler.

### Bundle-Analyse

```bash
pnpm build:analyze
```

Oeffnet einen interaktiven Bericht der JavaScript-Bundles im Browser.

## Docs

- [Platform Design Spec](docs/specs/2026-04-09-automatisieren-im-handwerk-platform-design.md)
- [Kaufmaennische Regeln](docs/specs/kaufmaennische-regeln.md)
- [Release Checklist](docs/RELEASE-CHECKLIST.md)

## Status

Aktive Entwicklung — Phase 1 (MVP).

## Abgrenzung

Dieses Projekt laeuft separat vom bestehenden KI-Handwerk-Projekt (natscho-hh/KI-Handwerk). Die bestehende Infrastruktur (n8n-Workflows, Assistenten, Dashboards) bleibt unangetastet.
