# Release-Checklist: Pre-Launch QA

**Stand:** 2026-04-10  
**Erstellt von:** QA/Release Agent (AUT-28)  
**Projekt:** Automatisieren im Handwerk — Phase 1

---

## 1. Security-Check: OWASP Top 10

### SQL Injection
- [x] **SAFE** — Prisma ORM verwendet parametrisierte Queries für alle Datenbankoperationen. Kein Raw-SQL ohne Parameter gefunden.

### XSS (Cross-Site Scripting)
- [x] **SAFE** — React escapet alle Ausgaben automatisch. Kein `dangerouslySetInnerHTML` im Source gefunden.

### CSRF (Cross-Site Request Forgery)
- [x] **SAFE** — NextAuth.js mit JWT-Session und CSRF-Token-Schutz. Credentials-Provider mit bcryptjs-Hashing.

### Auth-Bypass
- [x] **SAFE** — Middleware (`src/middleware.ts`) schützt alle Seiten außer Public Paths.
- [x] Jede API-Route prüft `session?.user?.tenantId` individuell.
- [x] `/api/health` (Public) und `/api/auth/*` (Login/Register) sind korrekt als öffentlich konfiguriert.
- [ ] **HINWEIS:** Middleware lässt alle `/api`-Routen durch (`pathname.startsWith("/api")`). Schutz liegt vollständig bei den einzelnen Route-Handlern. Das ist ein akzeptabler Pattern für Next.js, muss aber bei neuen Routen konsequent eingehalten werden.

---

## 2. Tenant-Isolation

- [x] `getTenantDb(tenantId)` in `src/lib/db.ts` injiziert `tenantId` automatisch in alle Queries via Prisma Extension.
- [x] `findMany`, `findFirst`, `create`, `update`, `delete`, `count` — alle mit Tenant-Filter.
- [x] Kunden-CRUD (`/api/kunden`, `/api/kunden/[id]`) verwendet `getTenantDb`. ✅
- [x] Chat-Route verwendet `getTenantDb`. ✅
- [ ] **WARNUNG:** `findUnique` in `getTenantDb` hat **keinen Tenant-Filter** (gibt Query unverändert weiter). Aktuell unkritisch, weil keine Route `findUnique` über `getTenantDb` aufruft — aber latentes Sicherheitsrisiko für zukünftige Entwicklung.

**Empfehlung:** `findUnique` in `getTenantDb` ebenfalls mit Tenant-Filter absichern oder aus dem Extension-Scope entfernen und direkt auf `prisma` (globaler Client) verweisen.

---

## 3. Rate Limiting

- [ ] **FEHLT — KRITISCH:** Keine Rate-Limiting-Middleware gefunden.
  - `/api/auth/register` — offen für Registrierungs-Spam
  - `/api/chat` — offen für KI-API-Kostenmissbrauch (Anthropic-Kosten!)
  - `/api/voice` — offen für Whisper-API-Kostenmissbrauch (OpenAI-Kosten!)
  - `/api/auth/[...nextauth]` — Login-Endpoint offen für Brute-Force

**Empfehlung:** Vor Launch Rate Limiting implementieren. Optionen:
- `@upstash/ratelimit` mit Redis (empfohlen für Produktion)
- Next.js Middleware mit In-Memory-Limiter (nur für MVP/Single-Instance)
- Cloudflare Rate Limiting (wenn hinter Cloudflare)

---

## 4. Secrets-Audit

- [x] Kein Hardcoded `ANTHROPIC_API_KEY` im Source-Code.
- [x] Kein Hardcoded `DATABASE_URL` im Source-Code.
- [x] Kein Hardcoded `OPENAI_API_KEY` im Source-Code.
- [x] Alle Secrets werden über `process.env.*` referenziert.
- [x] Keine `console.log`-Ausgaben im Production-Code gefunden.

---

## 5. .env.example Vollständigkeit

- [x] `DATABASE_URL` ✅
- [x] `AUTH_SECRET` ✅
- [x] `AUTH_URL` ✅
- [x] `OPENAI_API_KEY` ✅
- [x] `ANTHROPIC_API_KEY` ✅
- [x] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` ✅
- [ ] **FEHLT:** `NEXT_PUBLIC_BASE_URL` — wird in `src/app/layout.tsx`, `robots.ts`, `sitemap.ts`, `page.tsx` verwendet, fehlt in `.env.example`.

---

## 6. Tests

### Status Test-Infrastruktur
- [x] Vitest (`^4.1.4`) installiert
- [x] Playwright (`@playwright/test ^1.59.1`) installiert
- [ ] **FEHLT:** `vitest.config.ts` nicht vorhanden — Vitest läuft nur mit Defaults.
- [ ] **FEHLT:** `playwright.config.ts` nicht vorhanden — Playwright läuft nur mit Defaults.
- [ ] **FEHLT:** Kein `test:e2e` Script in `package.json` (nur `dev`, `build`, `start`, `lint`).

### Vorhandene Tests
| Datei | Typ | Framework | Status |
|---|---|---|---|
| `tests/unit/kunde-validation.test.ts` | Unit | Vitest | Vorhanden |
| `tests/integration/kunden-crud.spec.ts` | Integration/E2E | Playwright | Vorhanden |
| `tests/e2e/email-versand.spec.ts` | E2E | Playwright | Vorhanden |

### Tests ausführen (manuell)
```bash
# Unit Tests
npx vitest run

# E2E Tests (benötigt laufende App + DB)
npx playwright test
```

**Hinweis:** E2E-Tests erfordern eine laufende Datenbankinstanz und Testdaten. Ohne `playwright.config.ts` ist die Base-URL nicht konfiguriert — Tests werden fehlschlagen.

---

## 7. Offene Punkte vor Launch

### Kritisch (muss vor Launch behoben werden)
1. **Rate Limiting fehlt** — KI-API-Kosten unkontrolliert, Brute-Force möglich
2. **`playwright.config.ts` fehlt** — E2E-Tests nicht ausführbar
3. **Test-Scripts in `package.json` fehlen** — kein `test`, `test:e2e`, `test:unit`

### Medium (sollte vor Launch behoben werden)
4. **`NEXT_PUBLIC_BASE_URL` in `.env.example` ergänzen**
5. **`findUnique` Tenant-Filter absichern** in `getTenantDb`

### Low (nach Launch beheben)
6. **Test-Coverage erhöhen** — aktuell nur Kunden-Modul getestet; Rechnungen, Angebote, PDF fehlen

---

## Sign-Off

| Bereich | Status | Agent |
|---|---|---|
| Security Review | ✅ Abgeschlossen | QA/Release (AUT-28) |
| Tenant Isolation | ✅ Grundsätzlich OK | QA/Release (AUT-28) |
| Secrets Audit | ✅ Kein Befund | QA/Release (AUT-28) |
| Rate Limiting | ❌ Nicht implementiert | — |
| E2E Tests | ⚠️ Konfiguration fehlt | — |
| CTO Review | ⏳ Ausstehend | — |
