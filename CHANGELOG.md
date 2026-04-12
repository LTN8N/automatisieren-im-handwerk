# Changelog

## [v0.5.0] — 2026-04-12

### Neu
- **Mahnwesen** — Automatische Zahlungserinnerungen (AUT-54)
  - 4 Mahnstufen: Zahlungserinnerung (0), 1. Mahnung (0 €), 2. Mahnung (5 €), Inkasso-Übergabe (40 € + Verzugszinsen)
  - Fristen gemäß BGB §187 (+3 / +14 / +28 / +42 Tage nach Fälligkeit)
  - Verzugszinsen gemäß BGB §288 Abs. 2 (12,62 % p.a. für B2B)
  - GoBD-konformes Protokoll (unveränderlich, kein DELETE-Pfad)
  - API: `POST/GET /api/rechnungen/[id]/mahnungen`, `GET /api/rechnungen/faellig`, `POST /api/admin/mahnlaeufer/run`
  - UI: MahnungsDashboard mit Stufenbadge, Mahnhistorie-Tabelle, Versand-Button
  - KI-Intent: „Schick eine Mahnung an Mueller" → automatische Stufenermittlung + Versand
  - 29 Unit-Tests (BGB §187, §288 abgedeckt)

### Behoben (QA)
- `mahnlaeufer/route.ts`: `neue_frist_datum` verwendet nun `MAHNSTUFE_TAGE[stufe]` statt hardcoded 14 Tage (BGB §287)
- `tool-executor.ts`: gleiches Fix für den KI-Intent `zahlungserinnerung_senden`
- `GET /api/rechnungen/[id]/mahnungen`: expliziter `tenantId`-Filter für defense-in-depth

---

## [v0.3.0] — (Kunden-CRUD + Rechnung-aus-Angebot)

- Vollständiges Kunden-CRUD (Erstellen, Bearbeiten, Löschen)
- „Rechnung aus Angebot" Button in der Angebotsdetailansicht
- Inline-Editiermodus für Angebote

## [v0.2.0] — (Lokalisierung & Routing)

- `useLocaleRouter` Hook: automatisches Locale-Prefix für alle `router.push`-Aufrufe
- Multi-Sprach-Support (de/en)

## [v0.1.0] — (Basis-MVP)

- Angebote, Rechnungen, Kunden (Basis-CRUD)
- Auth (NextAuth), Tenant-Isolation, KI-Chat
