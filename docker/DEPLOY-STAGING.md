# Staging Deployment auf Hostinger VPS

Erreichbar ueber: `https://handwerk.srv1033052.hstgr.cloud`
(Bis die Domain automatisieren-im-handwerk.de gekauft ist)

## 1. Repo auf den VPS klonen

```bash
ssh root@srv1033052.hstgr.cloud
mkdir -p /opt/handwerk && cd /opt/handwerk
git clone https://github.com/LTN8N/automatisieren-im-handwerk.git .
```

## 2. .env.production anlegen

```bash
cat > .env.production << 'EOF'
# Datenbank
POSTGRES_USER=handwerk
POSTGRES_PASSWORD=HIER_SICHERES_PASSWORT_GENERIEREN
POSTGRES_DB=handwerk_prod
DATABASE_URL=postgresql://handwerk:GLEICHES_PASSWORT@postgres:5432/handwerk_prod?schema=public

# Auth
AUTH_SECRET=HIER_openssl_rand_-base64_32
AUTH_URL=https://handwerk.srv1033052.hstgr.cloud
NEXTAUTH_URL=https://handwerk.srv1033052.hstgr.cloud

# KI (optional fuer Staging)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# E-Mail (optional fuer Staging)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=user@example.com
# SMTP_PASS=passwort
# SMTP_FROM=noreply@automatisieren-im-handwerk.de

# SEO
NEXT_PUBLIC_BASE_URL=https://handwerk.srv1033052.hstgr.cloud
EOF
```

Passwort generieren: `openssl rand -base64 32`

## 3. Traefik-Netzwerk pruefen

```bash
# Pruefen ob traefik-public existiert (n8n nutzt es schon)
docker network ls | grep traefik-public

# Falls nicht vorhanden:
docker network create traefik-public
```

## 4. App starten

```bash
cd /opt/handwerk
docker compose -f docker/docker-compose.vps-staging.yml up -d --build
```

## 5. Datenbank migrieren

```bash
docker exec handwerk-app npx prisma migrate deploy
```

## 6. Testen

```bash
curl https://handwerk.srv1033052.hstgr.cloud/api/health
```

Expected: `{"status":"ok","db":"connected",...}`

Im Browser oeffnen: `https://handwerk.srv1033052.hstgr.cloud`

## 7. Spaeter: Eigene Domain

Wenn automatisieren-im-handwerk.de gekauft ist:
1. DNS A-Record auf VPS-IP setzen
2. In `.env.production` die URLs aendern
3. `docker-compose.prod.yml` statt `vps-staging.yml` nutzen
4. `docker compose up -d` — Traefik holt automatisch SSL-Zertifikat
