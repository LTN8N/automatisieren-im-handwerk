# Tech-Stack-Entscheidung

**Datum:** 2026-04-09
**Entscheidung durch:** CTO-Agent
**Status:** Entschieden

---

## 1. Zusammenfassung

| Bereich | Technologie | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 15.x |
| **Sprache** | TypeScript | 5.x |
| **Styling** | Tailwind CSS + shadcn/ui | 4.x / latest |
| **Datenbank** | PostgreSQL | 16.x |
| **ORM** | Prisma | 6.x |
| **Auth** | Auth.js (NextAuth v5) | 5.x |
| **i18n** | next-intl | latest |
| **Voice/STT** | OpenAI Whisper API | latest |
| **KI/Chat** | Claude API (Anthropic SDK) | latest |
| **PDF** | @react-pdf/renderer | latest |
| **E-Mail** | Nodemailer + SMTP | latest |
| **Deployment** | Docker Compose auf Hostinger VPS | - |
| **Reverse Proxy** | Traefik (besteht bereits) | - |

---

## 2. Begruendungen

### 2.1 Next.js als Fullstack-Framework

**Warum Next.js statt separatem Frontend + Backend:**
- Ein Codebase = weniger Komplexitaet fuer KI-Agenten-Entwicklung
- App Router mit Server Components reduziert Client-Bundle-Groesse
- API Routes fuer Backend-Logik — kein separater Server noetig
- Eingebautes SSR fuer die Landingpage (SEO)
- Riesiges Oekosystem, hervorragend dokumentiert
- KI-Agenten kennen Next.js sehr gut = schnellere Entwicklung

**Abgewogene Alternativen:**
- Separate Backend (Express/Fastify) + Frontend (React/Vue): Mehr Flexibilitaet, aber unnoetige Komplexitaet fuer unser Projekt
- Remix: Gute Alternative, aber kleineres Oekosystem
- SvelteKit: Performant, aber KI-Agenten haben weniger Erfahrung damit

### 2.2 PostgreSQL + Prisma

**PostgreSQL:**
- Row-Level Security (RLS) fuer Multi-Tenant-Isolation
- Robust, kostenlos, bewaehrt fuer SaaS
- JSON-Spalten fuer flexible Daten (Chat-History, Aenderungshistorie)
- Laeuft als Docker-Container auf dem bestehenden VPS

**Prisma ORM:**
- Type-safe Datenbankzugriff (passt zu TypeScript)
- Automatische Migrationen
- Klare Schema-Definitionen die KI-Agenten gut lesen/schreiben koennen
- Multi-Tenant ueber Prisma Client Extensions (automatischer Tenant-Filter)

### 2.3 Auth.js (NextAuth v5)

- Native Next.js-Integration
- JWT mit custom Claims (tenant_id, role)
- Credentials Provider fuer E-Mail/Passwort-Login
- Spaeter erweiterbar (Google Login, etc.)
- Session-Management out of the box

### 2.4 next-intl fuer i18n

- Speziell fuer Next.js App Router gebaut
- Locale-basiertes Routing (`/de/dashboard`, `/en/dashboard`)
- Unterstuetzt Pluralisierung, Datumsformatierung, Zahlenformatierung
- Type-safe Message Keys

### 2.5 Tailwind CSS + shadcn/ui

- Utility-first CSS = schnelle Entwicklung, kein CSS-Dateien-Chaos
- shadcn/ui: Kopierbare Komponenten (keine Abhaengigkeit), zugaenglich, anpassbar
- Responsive/Mobile-First by Design
- KI-Agenten arbeiten hervorragend mit Tailwind

### 2.6 Voice-Pipeline

- **STT:** OpenAI Whisper API — bester deutscher Spracherkennung, ~0.006$/Minute, passt ins Budget
- **KI-Intent:** Claude API (Anthropic SDK) — im Max-Abo enthalten, exzellent fuer Deutsch
- **Audio-Aufnahme:** MediaRecorder API im Browser
- Kein eigenes Whisper-Hosting noetig (API ist guenstiger und zuverlaessiger)

### 2.7 PDF-Generierung

- @react-pdf/renderer: React-basiert, passt zum Stack
- Template-basiert: PDF-Layouts als React-Komponenten
- Unterstuetzt Tabellen, Bilder (Logo), mehrseitige Dokumente
- Server-seitig renderbar (API Route)

### 2.8 Docker Deployment

- Docker Compose mit: Next.js App + PostgreSQL
- Koexistiert mit bestehendem n8n + Traefik auf srv1033052
- Traefik routet automatisch ueber Labels
- Einfaches Deployment: `docker compose up -d`

---

## 3. Projekt-Ordnerstruktur

```
automatisieren-im-handwerk/
├── docs/
│   ├── specs/                          # Produkt-Spezifikationen
│   └── architecture/                   # Architektur-Entscheidungen
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── [locale]/                   # i18n Locale-Routing
│   │   │   ├── (marketing)/            # Landingpage (oeffentlich)
│   │   │   │   ├── page.tsx            # Startseite
│   │   │   │   └── layout.tsx
│   │   │   ├── (auth)/                 # Auth-Seiten
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   └── (dashboard)/            # Geschuetzter Bereich
│   │   │       ├── page.tsx            # Dashboard-Uebersicht
│   │   │       ├── angebote/           # Angebotsverwaltung
│   │   │       ├── rechnungen/         # Rechnungsverwaltung
│   │   │       ├── kunden/             # Kundenverwaltung
│   │   │       ├── chat/               # KI-Chat + Voice
│   │   │       ├── einstellungen/      # Firmenprofil, Einstellungen
│   │   │       └── layout.tsx          # Dashboard-Layout mit Sidebar
│   │   ├── api/                        # API Routes
│   │   │   ├── auth/                   # Auth-Endpoints
│   │   │   ├── tenant/                 # Firmenprofil
│   │   │   ├── kunden/                 # Kunden-CRUD
│   │   │   ├── angebote/              # Angebote-CRUD + Positionen
│   │   │   ├── rechnungen/            # Rechnungen-CRUD
│   │   │   ├── chat/                  # Chat/Voice-Pipeline
│   │   │   └── pdf/                   # PDF-Generierung
│   │   └── layout.tsx                 # Root Layout
│   ├── components/                     # React-Komponenten
│   │   ├── ui/                        # shadcn/ui Basis-Komponenten
│   │   ├── dashboard/                 # Dashboard-spezifische Komponenten
│   │   ├── documents/                 # Angebote/Rechnungen-Komponenten
│   │   ├── chat/                      # Chat + Voice UI
│   │   └── marketing/                 # Landingpage-Komponenten
│   ├── lib/                           # Shared Utilities
│   │   ├── db.ts                      # Prisma Client (mit Tenant-Filter)
│   │   ├── auth.ts                    # Auth.js Konfiguration
│   │   ├── ai/                        # KI-Pipeline
│   │   │   ├── intent.ts             # Intent-Erkennung
│   │   │   ├── conversation.ts       # Conversation Manager
│   │   │   └── prompts.ts            # System-Prompts
│   │   ├── voice/                     # Voice-Pipeline
│   │   │   └── whisper.ts            # Whisper API Client
│   │   ├── pdf/                       # PDF-Generierung
│   │   │   ├── templates/            # PDF-Templates pro Dokumenttyp
│   │   │   └── generator.ts
│   │   ├── email/                     # E-Mail-Service
│   │   │   └── sender.ts
│   │   └── utils/                     # Hilfsfunktionen
│   │       ├── currency.ts           # Waehrungsformatierung
│   │       ├── tax.ts                # Steuerberechnung pro Land
│   │       └── number-series.ts      # Nummernkreise
│   ├── i18n/                          # Internationalisierung
│   │   ├── messages/                  # Sprachdateien
│   │   │   ├── de.json
│   │   │   ├── en.json
│   │   │   └── fr.json
│   │   ├── config.ts                 # i18n-Konfiguration
│   │   └── request.ts               # Server-side i18n
│   └── types/                         # TypeScript-Typen
│       ├── database.ts               # DB-Typen (generiert von Prisma)
│       ├── api.ts                    # API Request/Response-Typen
│       └── voice.ts                  # Voice/Chat-Typen
├── prisma/
│   ├── schema.prisma                  # Datenbank-Schema
│   ├── seed.ts                        # Testdaten
│   └── migrations/                    # Auto-generierte Migrationen
├── public/
│   ├── locales/                       # Statische i18n-Assets
│   └── images/                        # Bilder, Icons
├── docker/
│   ├── Dockerfile                     # Multi-Stage Build
│   └── docker-compose.yml             # App + PostgreSQL
├── tests/
│   ├── unit/                          # Unit-Tests
│   ├── integration/                   # API-Tests
│   └── e2e/                           # End-to-End-Tests
├── agents/                            # Agent-Rollenbeschreibungen
├── .env.example                       # Umgebungsvariablen-Vorlage
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. Multi-Tenant-Strategie

### Shared Database mit Row-Level Security

Wir nutzen **eine Datenbank fuer alle Tenants** mit automatischer Filterung:

1. **JWT** enthaelt `tenant_id` — wird bei jedem Request validiert
2. **Prisma Client Extension** filtert automatisch alle Queries auf den aktiven Tenant
3. **Kein Tenant kann Daten eines anderen sehen** — by design, nicht by convention

```typescript
// Prisma Client mit automatischem Tenant-Filter
const db = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        args.where = { ...args.where, tenantId: currentTenantId };
        return query(args);
      },
    },
  },
});
```

### Vorteile gegenueber Database-per-Tenant:
- Einfacheres Deployment (eine DB)
- Einfachere Migrationen
- Weniger Ressourcenverbrauch auf dem VPS
- Skaliert problemlos fuer die erste Phase (hunderte Tenants)

---

## 5. Priorisierte Task-Liste fuer Builder (erste 10 Tasks)

### Phase 1a — Grundgeruest (Woche 1)

| # | Task | Prioritaet | Abhaengigkeit |
|---|---|---|---|
| 1 | **Projekt-Skeleton erstellen** — Next.js 15 + TypeScript + Tailwind + shadcn/ui initialisieren, Ordnerstruktur anlegen, ESLint + Prettier konfigurieren | Kritisch | - |
| 2 | **PostgreSQL + Prisma Setup** — Docker-Compose mit PostgreSQL, Prisma-Schema nach Spec (Tenant, Kunde, Angebot, Rechnung, Position, ChatHistory), erste Migration | Kritisch | Task 1 |
| 3 | **Auth-System** — Auth.js mit Credentials Provider, JWT mit tenant_id/role, Registrierung + Login Pages, geschuetzte Routes | Kritisch | Task 1, 2 |
| 4 | **Multi-Tenant Middleware** — Prisma Client Extension fuer automatischen Tenant-Filter, Tenant-Kontext aus JWT extrahieren | Kritisch | Task 2, 3 |
| 5 | **Onboarding-Flow** — Registrierung -> Firmenprofil ausfuellen (Name, Adresse, Logo, Steuernr, Bankdaten) -> Dashboard. 3 Schritte, fertig. | Hoch | Task 3, 4 |

### Phase 1b — Kern-Features (Woche 2)

| # | Task | Prioritaet | Abhaengigkeit |
|---|---|---|---|
| 6 | **i18n Setup** — next-intl konfigurieren, Locale-Routing, deutsche Sprachdatei, Waehrungs-/Datumsformatierung | Hoch | Task 1 |
| 7 | **Dashboard-Layout** — Sidebar-Navigation, Dashboard-Uebersicht mit Statistik-Karten (Angebote, Rechnungen, faellig), responsive/mobile-first | Hoch | Task 5, 6 |
| 8 | **Kunden-CRUD** — Kundenliste, Kunden anlegen/bearbeiten/loeschen, Suchfunktion | Hoch | Task 4, 7 |
| 9 | **Angebots-CRUD** — Angebotsliste mit Status-Filter, Angebot erstellen mit Positionen (Beschreibung, Menge, Einheit, Preis), Netto/USt/Brutto-Berechnung, Aenderungshistorie | Hoch | Task 8 |
| 10 | **Landingpage** — Marketing-Seite mit Features, Preisen, CTA (Registrierung), responsive, SEO-optimiert | Mittel | Task 1, 6 |

### Folgetasks (nach Phase 1):
- Rechnungs-CRUD + Angebot-zu-Rechnung-Konvertierung
- Chat-Interface mit KI-Anbindung (Claude API)
- Voice-Pipeline (Whisper STT + Intent-Erkennung)
- PDF-Generierung (Angebote + Rechnungen)
- E-Mail-Versand
- Docker-Deployment auf Hostinger VPS

---

## 6. Risiken und Mitigierung

| Risiko | Wahrscheinlichkeit | Mitigierung |
|---|---|---|
| VPS-Ressourcen reichen nicht | Mittel | PostgreSQL + Next.js brauchen ~1-2 GB RAM. VPS sollte mind. 4 GB haben. Monitoring einrichten. |
| Whisper-Kosten uebersteigen Budget | Niedrig | ~0.006$/Min = bei 100 Min/Tag ~18$/Monat. Passt ins Budget. |
| Next.js API Routes zu langsam fuer komplexe Logik | Niedrig | Fuer unser Volumen (einzelne Handwerker) voellig ausreichend. Bei Bedarf spaeter auf separaten Service auslagern. |
| Prisma Tenant-Filter wird vergessen | Mittel | Zentrale Middleware, nie direkt Prisma Client nutzen. Code Review durch CTO. |
