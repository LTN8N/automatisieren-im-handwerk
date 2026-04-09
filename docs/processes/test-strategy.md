# Test-Strategie — Automatisieren im Handwerk

**Version:** 1.0
**Datum:** 2026-04-09
**Verantwortlich:** QA/Release Agent

---

## 1. Ueberblick

Qualitaet ist fuer eine SaaS-Plattform im Handwerk geschaeftskritisch. Fehlerhafte Rechnungen, falsche Steuerberechnungen oder Datenlecks zwischen Mandanten zerstoeren Kundenvertrauen sofort. Diese Test-Strategie definiert, welche Tests wir schreiben, wie wir sie ausfuehren und welche Abdeckung wir anstreben.

## 2. Test-Pyramide

```
        /  E2E  \          <- Wenige, kritische User Flows
       / Integra- \        <- API-Endpoints mit echter DB
      /   tion     \
     /  Unit Tests  \      <- Viele, schnelle Logik-Tests
    /________________\
```

| Ebene | Framework | Zweck | Ausfuehrung |
|---|---|---|---|
| **Unit** | Vitest | Business-Logik isoliert testen | Bei jedem Commit (pre-push) |
| **Integration** | Vitest + Testcontainers | API-Endpoints mit echtem PostgreSQL | In CI bei jedem PR |
| **E2E** | Playwright | Kritische User Flows im Browser | In CI vor Merge auf main |

## 3. Unit Tests

### Was wird getestet?
- **Steuerberechnung** (`src/lib/utils/tax.ts`) — korrekte MwSt fuer DE (19%, 7%), AT, CH
- **Nummernkreise** (`src/lib/utils/number-series.ts`) — fortlaufende Nummern, Jahreswechsel, Format
- **Waehrungsformatierung** (`src/lib/utils/currency.ts`) — EUR, CHF, korrekte Dezimalstellen
- **Validierungen** — Pflichtfelder, E-Mail-Format, USt-ID-Format, IBAN-Pruefung
- **Netto/Brutto-Berechnung** — Positionen, Rabatte, Gesamtbetraege
- **Intent-Erkennung** (`src/lib/ai/intent.ts`) — Zuordnung von Spracheingaben zu Aktionen

### Regeln
- Jede Business-Logik-Funktion hat mindestens 3 Testfaelle (happy path, edge case, error)
- Keine Mocks fuer reine Berechnungsfunktionen
- Tests liegen neben dem Code: `src/lib/utils/tax.test.ts`
- **Coverage-Ziel: 80% fuer `src/lib/`**

### Beispielstruktur
```typescript
// src/lib/utils/tax.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTax } from './tax';

describe('calculateTax', () => {
  it('berechnet 19% MwSt fuer DE-Standard', () => {
    expect(calculateTax(100, 'DE', 'standard')).toBe(19);
  });

  it('berechnet 7% MwSt fuer DE-ermaessigt', () => {
    expect(calculateTax(100, 'DE', 'reduced')).toBe(7);
  });

  it('wirft Fehler bei unbekanntem Land', () => {
    expect(() => calculateTax(100, 'XX', 'standard')).toThrow();
  });
});
```

## 4. Integration Tests

### Was wird getestet?
- **API-Endpoints** — CRUD fuer Kunden, Angebote, Rechnungen
- **Multi-Tenant-Isolation** — Tenant A sieht keine Daten von Tenant B
- **Auth-Middleware** — Unautorisierte Requests werden abgelehnt
- **Datenbank-Constraints** — Unique-Felder, Fremdschluessel, Cascade-Deletes

### Testdatenbank-Setup
```yaml
# Docker Compose fuer Tests (docker-compose.test.yml)
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: test_handwerk
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # RAM-Disk fuer Geschwindigkeit
```

Alternative: **Testcontainers** (empfohlen fuer CI)
- Startet PostgreSQL automatisch pro Test-Suite
- Isolierte DB pro Testlauf
- Kein manuelles Aufsetzen noetig

### Regeln
- Echte Datenbank, keine Mocks fuer DB-Queries
- Jeder Test raeumt seine Daten auf (Transaction Rollback oder Truncate)
- Multi-Tenant-Tests sind Pflicht fuer jeden Endpoint
- Tests liegen in `tests/integration/`

### Beispielstruktur
```typescript
// tests/integration/api/kunden.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('GET /api/kunden', () => {
  it('gibt nur Kunden des eigenen Tenants zurueck', async () => {
    // Setup: Kunden fuer Tenant A und Tenant B anlegen
    // Request: Als Tenant A einloggen
    // Assert: Nur Tenant-A-Kunden in der Antwort
  });

  it('lehnt unautorisierte Requests ab (401)', async () => {
    // Request ohne Auth-Header -> 401
  });
});
```

## 5. E2E Tests

### Kritische User Flows
| Flow | Prioritaet | Beschreibung |
|---|---|---|
| Registrierung + Onboarding | Kritisch | Registrieren -> Firmenprofil -> Dashboard |
| Angebot erstellen | Kritisch | Kunde waehlen -> Positionen -> Speichern -> PDF |
| Angebot zu Rechnung | Kritisch | Angebot oeffnen -> "Rechnung erstellen" -> Pruefen |
| Login/Logout | Hoch | Login -> Session pruefen -> Logout |
| Kundenverwaltung | Hoch | Kunde anlegen -> Bearbeiten -> Loeschen |

### Regeln
- E2E Tests laufen in CI gegen eine Staging-aehnliche Umgebung
- Headless Chrome via Playwright
- Stabile Selektoren: `data-testid` Attribute statt CSS-Klassen
- Keine Flaky Tests — instabile Tests werden sofort gefixt oder deaktiviert
- Tests liegen in `tests/e2e/`

### Beispielstruktur
```typescript
// tests/e2e/angebot-erstellen.spec.ts
import { test, expect } from '@playwright/test';

test('Angebot erstellen und als PDF anzeigen', async ({ page }) => {
  await page.goto('/de/login');
  // Login
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'testpassword');
  await page.click('[data-testid="login-button"]');

  // Zum Angebot navigieren
  await page.click('[data-testid="nav-angebote"]');
  await page.click('[data-testid="neues-angebot"]');

  // Positionen hinzufuegen
  // ...

  // Speichern und pruefen
  await page.click('[data-testid="speichern"]');
  await expect(page.locator('[data-testid="angebot-status"]')).toHaveText('Entwurf');
});
```

## 6. Coverage-Ziele

| Bereich | Ziel | Messung |
|---|---|---|
| `src/lib/utils/` (Business-Logik) | **80%** | Vitest Coverage (v8) |
| `src/lib/ai/` (KI-Pipeline) | **60%** | Vitest Coverage |
| API-Endpoints | **70%** | Integration Test Coverage |
| Gesamt-Projekt | **50%** | Informativ, kein Gate |

Coverage wird in CI gemessen und bei PRs als Kommentar angezeigt.

## 7. CI-Integration

```
PR erstellt
  -> Lint (ESLint + Prettier)
  -> Type-Check (tsc --noEmit)
  -> Unit Tests (Vitest)
  -> Integration Tests (Vitest + Testcontainers)
  -> E2E Tests (Playwright)
  -> Coverage Report
  -> Alle gruen? -> Review moeglich
```

Kein Merge auf main ohne gruene CI-Pipeline.

## 8. Lokal Tests ausfuehren

```bash
# Unit Tests
npm run test              # Alle Unit Tests
npm run test:watch        # Watch-Modus fuer Entwicklung
npm run test:coverage     # Mit Coverage-Report

# Integration Tests
npm run test:integration  # Startet Test-DB automatisch

# E2E Tests
npm run test:e2e          # Headless
npm run test:e2e:ui       # Mit Playwright UI (Debugging)

# Alles zusammen
npm run test:all          # Unit + Integration + E2E
```

## 9. Test-Daten

- **Fixtures:** Wiederverwendbare Testdaten in `tests/fixtures/`
- **Factories:** Funktionen zum Erstellen von Testdaten (`createTestKunde()`, `createTestAngebot()`)
- **Seed:** `prisma/seed.ts` fuer lokale Entwicklung und Staging
- Keine Produktionsdaten in Tests verwenden
