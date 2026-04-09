# Git-Workflow — Automatisieren im Handwerk

**Version:** 1.0
**Datum:** 2026-04-09
**Verantwortlich:** QA/Release Agent

---

## 1. Branch-Strategie

### Haupt-Branches

| Branch | Zweck | Schutz |
|---|---|---|
| `main` | Produktions-Code, immer deploybar | Protected: kein direkter Push, nur ueber PR |
| `staging` | Staging-Umgebung (optional, spaeter) | Semi-protected |

### Feature-Branches

Feature-Branches werden von `main` erstellt und per Squash-Merge zurueckgefuehrt.

**Naming-Konvention:**
```
feature/<kurze-beschreibung>    # Neue Features
fix/<kurze-beschreibung>        # Bugfixes
chore/<kurze-beschreibung>      # Tooling, Config, Aufraeuumarbeiten
docs/<kurze-beschreibung>       # Dokumentation
```

**Beispiele:**
```
feature/kunden-crud
feature/angebot-pdf-generierung
fix/steuerberechnung-rundung
chore/eslint-konfiguration
docs/api-dokumentation
```

**Regeln:**
- Immer von aktuellem `main` branchen
- Kurze Lebensdauer: max. 3-5 Tage
- Ein Feature pro Branch
- Branch nach Merge loeschen

## 2. Commit-Messages

### Format (Conventional Commits)

```
<type>(<scope>): <beschreibung>

[optionaler Body]

[optionaler Footer]
```

### Typen

| Typ | Verwendung | Beispiel |
|---|---|---|
| `feat` | Neues Feature | `feat(kunden): Kundenliste mit Suche hinzufuegen` |
| `fix` | Bugfix | `fix(steuer): Rundungsfehler bei 7% MwSt beheben` |
| `docs` | Dokumentation | `docs: Test-Strategie erstellen` |
| `test` | Tests hinzufuegen/aendern | `test(kunden): Integration Tests fuer CRUD` |
| `chore` | Tooling, Build, Config | `chore: ESLint strict mode aktivieren` |
| `refactor` | Code umstrukturieren | `refactor(db): Tenant-Filter zentralisieren` |
| `style` | Formatierung (kein Logik-Change) | `style: Prettier auf alle Dateien anwenden` |

### Regeln
- Beschreibung auf Deutsch, Imperativ ("hinzufuegen" nicht "hinzugefuegt")
- Erste Zeile max. 72 Zeichen
- Scope = betroffener Bereich (kunden, angebote, auth, steuer, etc.)
- Body fuer komplexere Aenderungen: Was und Warum

## 3. Pull Request Workflow

### PR erstellen

1. Feature-Branch pushen
2. PR gegen `main` erstellen
3. PR-Template ausfuellen (siehe `.github/pull_request_template.md`)
4. Mindestens 1 Review anfordern (CTO fuer Architektur, CFO fuer Finanzen)

### PR-Titel
Gleiche Konvention wie Commit-Messages:
```
feat(angebote): Angebots-CRUD mit Positionen
fix(auth): Session-Timeout korrekt behandeln
```

### Merge-Strategie: Squash Merge

- **Immer Squash-Merge** auf main
- Alle Commits des Feature-Branches werden zu einem zusammengefasst
- Saubere, lineare Git-History auf main
- Der Squash-Commit uebernimmt den PR-Titel als Message

```bash
# GitHub: "Squash and merge" Button verwenden
# CLI:
git checkout main
git merge --squash feature/kunden-crud
git commit -m "feat(kunden): Kunden-CRUD mit Suche und Validierung"
```

### Nach dem Merge
- Feature-Branch loeschen (automatisch via GitHub-Setting)
- Staging-Deployment wird automatisch getriggert

## 4. Code-Qualitaet

### Linting und Formatierung

| Tool | Konfiguration | Zweck |
|---|---|---|
| **ESLint** | `eslint.config.js` | Code-Qualitaet, Best Practices |
| **Prettier** | `.prettierrc` | Konsistente Formatierung |
| **TypeScript** | `tsconfig.json` (strict: true) | Type Safety |

### Pre-Commit Hooks (Husky + lint-staged)

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

Bei jedem Commit:
1. `lint-staged` prueft geaenderte Dateien
2. ESLint fixt auto-fixbare Probleme
3. Prettier formatiert den Code
4. Commit schlaegt fehl bei Lint-Fehlern

### Pre-Push Hook

```bash
# .husky/pre-push
npm run type-check
npm run test
```

Bei jedem Push:
1. TypeScript-Pruefung (`tsc --noEmit`)
2. Unit Tests muessen bestehen

## 5. CI/CD Pipeline

### Bei jedem PR (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:coverage
      - run: npm run test:integration
      - run: npm run test:e2e
```

### Bei Merge auf main

1. **Automatisch:** Docker Image bauen und auf Staging deployen
2. **Manuell:** Nach Staging-Verifikation auf Production deployen

## 6. Release-Workflow

### Semantic Versioning

```
v<MAJOR>.<MINOR>.<PATCH>
```

| Teil | Wann hochzaehlen | Beispiel |
|---|---|---|
| MAJOR | Breaking Changes (API, DB-Schema) | v1.0.0 -> v2.0.0 |
| MINOR | Neue Features | v0.1.0 -> v0.2.0 |
| PATCH | Bugfixes | v0.1.0 -> v0.1.1 |

### Release erstellen

```bash
# 1. Auf main sein, alles aktuell
git checkout main
git pull

# 2. Version-Tag setzen
git tag -a v0.1.0 -m "Release v0.1.0: Projekt-Skeleton + Auth + Multi-Tenant"

# 3. Tag pushen
git push origin v0.1.0
```

### Release Notes
- Werden in `CHANGELOG.md` gepflegt
- Format: siehe Abschnitt 7

## 7. Changelog-Format

```markdown
# Changelog

## [v0.2.0] — 2026-04-XX

### Neu
- Kunden-CRUD mit Suchfunktion
- Angebots-Erstellung mit Positionen

### Gefixt
- Rundungsfehler bei 7% MwSt

### Geaendert
- Dashboard-Layout optimiert fuer Mobile

## [v0.1.0] — 2026-04-XX

### Neu
- Projekt-Skeleton (Next.js 15 + TypeScript + Tailwind)
- PostgreSQL + Prisma Setup
- Auth-System mit Multi-Tenant
- Onboarding-Flow
```

## 8. Deployment

### Staging (automatisch)
- Trigger: Merge auf `main`
- Docker Image wird gebaut und auf dem VPS deployed
- URL: staging.crashcage.de (oder Subdomain)

### Production (manuell)
- Nur nach erfolgreicher Staging-Verifikation
- QA/Release gibt Freigabe
- Docker Image wird mit Release-Tag deployed
- Rollback: Vorheriges Docker Image ist immer verfuegbar

```bash
# Production Deployment
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Rollback (bei Problemen)
docker compose -f docker-compose.prod.yml down
docker tag app:previous app:latest
docker compose -f docker-compose.prod.yml up -d
```

## 9. Notfall-Prozeduren

### Hotfix
1. Branch `fix/<beschreibung>` direkt von `main`
2. Minimaler Fix, Tests schreiben
3. PR erstellen, Review beschleunigen
4. Squash-Merge auf main
5. Sofort deployen

### Rollback
1. Vorheriges Docker Image starten
2. Issue dokumentieren
3. Root Cause Analysis
4. Fix als normalen PR einreichen
