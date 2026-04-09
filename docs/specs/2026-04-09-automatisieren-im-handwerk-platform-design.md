# Automatisieren im Handwerk — Platform Design Spec

**Datum:** 2026-04-09
**Autor:** Lars + Claude Code (Brainstorming)
**Domain:** automatisieren-im-handwerk.de (noch zu kaufen)
**Status:** Draft — wartet auf Review

---

## 1. Produktvision

### Elevator Pitch

Ein KI-gesteuertes Angebots- und Rechnungsmanagement fuer Handwerker. Einrichten wie ein E-Mail-Postfach — Account erstellen, Firmendaten eingeben, loslegen. Der Nutzer spricht mit einer KI wie mit einem Buerokollegen, die Angebote schreibt, Rechnungen erstellt und den Papierkram erledigt.

### Onboarding-Prinzip: "E-Mail-Postfach"

1. Account erstellen (Name, E-Mail, Passwort)
2. Firmenprofil ausfuellen (Name, Adresse, Logo, Steuernummer, Bankdaten)
3. Fertig — sofort arbeitsfaehig

Kein kompliziertes Setup, keine Schulung, kein IT-Wissen noetig.

### Skalierungsstrategie

| Phase | Markt | Sprache | Waehrung | Recht |
|---|---|---|---|---|
| Step 1 | DACH | Deutsch | EUR/CHF | UStG, MwStG |
| Step 2 | Weltweit | Multi-Language | Multi-Currency | Lokale Steuerregeln |

Von Anfang an so gebaut, dass Sprache, Waehrung und Steuerlogik als Module austauschbar sind.

---

## 2. Kern-Features

### 2.1 Conversational Angebots- & Rechnungsmanagement

**So soll es sich anfuehlen:**

> **Nutzer:** "Ich war heute bei Herrn Mueller, Badezimmer-Sanierung. Dusche raus, neue Dusche rein, Fliesen 12qm, zwei Waschtische."
>
> **KI:** "Alles klar. Ich hab ein Angebot fuer Herrn Mueller erstellt:
> - Demontage Dusche: 340 EUR
> - Neue Duschwanne inkl. Einbau: 890 EUR
> - Fliesen 12m2 inkl. Verlegung: 1.440 EUR
> - 2x Waschtisch inkl. Montage: 1.200 EUR
> - Gesamt: 3.870 EUR netto
>
> Soll ich es als PDF generieren und an mueller@email.de schicken?"

### 2.2 Drei Bearbeitungswege

| Methode | Wann | Beispiel |
|---|---|---|
| **Sprache** | Unterwegs, Baustelle, Auto | "Fueg beim Angebot Mueller noch 3 Steckdosen a 85 Euro hinzu" |
| **Chat (Text)** | Am Rechner/Handy | "Angebot Mueller: Position hinzufuegen — Steckdosen 3x 85 EUR" |
| **Manuell (UI)** | Feinschliff, Preise anpassen | Direkt in der Tabelle klicken und editieren |

Alle drei Wege aendern dieselben Daten.

### 2.3 Voice-Befehle

| Kategorie | Beispiele |
|---|---|
| **Neues Angebot** | "Erstell ein Angebot fuer Frau Schmidt, Heizungswartung" |
| **Position hinzufuegen** | "Fueg noch einen Warmwasserspeicher hinzu, 1.200 Euro" |
| **Position aendern** | "Die Arbeitszeit waren 6 Stunden, nicht 4" |
| **Position loeschen** | "Streich die Anfahrtspauschale" |
| **Status abfragen** | "Was ist mit dem Angebot fuer Baeckerei Schulz?" |
| **Angebot zu Rechnung** | "Der Mueller hat angenommen, mach ne Rechnung draus" |
| **Nachtrag** | "Beim Mueller-Auftrag kamen noch 2 Stunden Mehrarbeit dazu" |
| **Versand** | "Schick die Rechnung an Mueller" |
| **Uebersicht** | "Welche Angebote sind noch offen?" |

### 2.4 Kern-Funktionen

| Feature | Beschreibung |
|---|---|
| Chat-Interface | Natuerliche Sprache -> strukturierte Dokumente |
| Angebotserstellung | Aus Gespraech -> Positionen, Preise, PDF |
| Angebotsbearbeitung | Nachtraege via Voice, Chat oder UI — mit Aenderungshistorie |
| Rechnungserstellung | Aus Angebot oder frei -> Rechnung mit USt, PDF |
| E-Mail-Versand | Direkt aus der App an Kunden senden |
| Dokumenten-Dashboard | Alle Angebote/Rechnungen auf einen Blick — Status, Summen, Timeline |
| Kundenverwaltung | Automatisch aus Gespraechen aufgebaut |

### 2.5 Add-In: Wartungsvertraege

| Feature | Beschreibung |
|---|---|
| Upload | Wartungsvertrag als PDF hochladen |
| Parsing | KI liest Vertrag aus — Objekt, Intervall, Leistungen, Laufzeit |
| Monitoring | Dashboard zeigt: faellige Wartungen, ueberfaellige, kommende |
| Disposition | Wartungstermine planen, Techniker zuweisen |
| Erinnerungen | Automatische Benachrichtigung wenn Wartung ansteht |

---

## 3. Technische Architektur

### 3.1 Tech-Stack

Der CTO-Agent entscheidet den finalen Stack. Rahmenbedingungen:
- Muss Multi-Tenant-faehig sein (jeder Handwerker = eigener Tenant)
- Muss i18n/l10n von Tag 1 unterstuetzen
- Muss auf Hostinger VPS deploybar sein (Docker)
- Muss mit n8n auf demselben Server koexistieren
- Voice-Pipeline noetig (Speech-to-Text + Intent-Erkennung)

### 3.2 Datenmodell

```
Tenant (Firma)
+-- id, name, adresse, logo, steuernummer, bankdaten
+-- ust_satz (19% DE default, konfigurierbar pro Land)
+-- email_config (SMTP oder zentraler Service)
+-- sprache, waehrung, land
|
+-- Kunden
|   +-- id, name, adresse, email, telefon
|   +-- notizen (aus Gespraechen automatisch befuellt)
|
+-- Angebote
|   +-- id, nummer (fortlaufend pro Tenant)
|   +-- kunde_id, status (entwurf/gesendet/angenommen/abgelehnt)
|   +-- positionen[]
|   |   +-- beschreibung, menge, einheit, einzelpreis
|   |   +-- gesamtpreis (berechnet)
|   +-- netto, ust, brutto
|   +-- gueltig_bis
|   +-- aenderungshistorie[]
|       +-- zeitpunkt, quelle (voice/chat/manuell)
|       +-- was_geaendert, alter_wert, neuer_wert
|
+-- Rechnungen
|   +-- id, nummer, angebot_id (optional)
|   +-- kunde_id, status (entwurf/gesendet/bezahlt/ueberfaellig/mahnung)
|   +-- positionen[] (wie Angebot)
|   +-- zahlungsziel, bezahlt_am
|   +-- aenderungshistorie[]
|
+-- Wartungsvertraege (Add-In)
|   +-- id, kunde_id, objekt, beschreibung
|   +-- intervall (monatlich/quartalsweise/jaehrlich)
|   +-- naechste_wartung, letzte_wartung
|   +-- leistungen[], vertragslaufzeit
|   +-- original_pdf (Upload)
|
+-- Chat-History
    +-- id, zeitpunkt, quelle (voice/text)
    +-- nachricht, intent, kontext
    +-- verknuepfte_aktion (angebot_id, rechnung_id etc.)
```

### 3.3 API-Design

```
/api/auth/
  POST /register          -> Neuen Tenant anlegen
  POST /login             -> JWT Token
  POST /refresh           -> Token erneuern

/api/tenant/
  GET  /profile           -> Firmenprofil
  PUT  /profile           -> Firmenprofil aktualisieren

/api/kunden/
  GET    /                -> Alle Kunden
  POST   /                -> Neuer Kunde
  PUT    /:id             -> Kunde bearbeiten
  DELETE /:id             -> Kunde loeschen

/api/angebote/
  GET    /                -> Alle Angebote (Filter: status, kunde, datum)
  POST   /                -> Neues Angebot
  PUT    /:id             -> Angebot bearbeiten
  POST   /:id/positionen  -> Position hinzufuegen
  PUT    /:id/positionen/:pos_id  -> Position aendern
  DELETE /:id/positionen/:pos_id  -> Position loeschen
  POST   /:id/pdf         -> PDF generieren
  POST   /:id/senden      -> Via E-Mail versenden
  POST   /:id/zu-rechnung -> Angebot -> Rechnung konvertieren

/api/rechnungen/
  (analog zu Angebote)
  POST   /:id/mahnung     -> Mahnung erstellen/senden

/api/wartung/
  GET    /                -> Alle Vertraege
  POST   /                -> Neuer Vertrag (inkl. PDF-Upload)
  GET    /faellig          -> Faellige Wartungen
  POST   /:id/disponieren -> Termin planen

/api/chat/
  POST   /message         -> Text-Nachricht -> KI verarbeitet -> Aktion
  POST   /voice           -> Audio-Upload -> STT -> KI -> Aktion
  GET    /history          -> Chat-Verlauf
```

### 3.4 Auth & Multi-Tenant

- JWT mit `tenant_id` + `user_id` + `role` (Admin/Mitarbeiter)
- Row-Level Security — jede DB-Query wird automatisch auf den Tenant gefiltert
- Kein Tenant sieht Daten eines anderen — by design

### 3.5 Voice-Pipeline

```
Mikrofon (Browser) -> Whisper API (STT) -> KI-Agent (Intent + Kontext) -> API Call (DB)
                                                                            |
                                                                            v
                                                                    Bestaetigung an User
```

- STT: Whisper (OpenAI API) oder Deepgram
- Kritische Aktionen (Senden, Loeschen) immer bestaetigen lassen
- Kontext-Erkennung: KI muss wissen welches Angebot gemeint ist ("beim Mueller")

### 3.6 Internationalisierung (i18n)

| Ebene | Umsetzung |
|---|---|
| UI-Texte | i18n-Framework, Sprachdateien pro Locale |
| Waehrung | Pro Tenant konfigurierbar, Formatierung via Intl.NumberFormat |
| Steuern | Steuermodul pro Land (DE: 19%/7%, AT: 20%/10%, CH: 8.1%) |
| PDF-Templates | Pro Sprache/Land (Pflichtangaben variieren) |
| Datumsformat | Locale-basiert |
| Nummernkreise | Pro Tenant konfigurierbar (RE-2026-001 etc.) |

### 3.7 Hosting-Architektur

```
        automatisieren-im-handwerk.de (Domain noch zu kaufen)
                    |
           +--------v--------+
           |  Hostinger VPS  |
           |  srv1033052     |
           +--------+--------+
           | n8n (besteht)   | <-- bestehende Workflows bleiben
           | App (neu)       | <-- Frontend + Backend (Docker)
           | PostgreSQL (neu)| <-- Multi-Tenant DB
           | Traefik (besteht)| <- Reverse Proxy fuer beides
           +-----------------+
                    |
     +--------------+--------------+
     v              v              v
+----------+  +----------+  +----------+
| Whisper  |  | Claude/  |  | SMTP     |
| API      |  | GPT API  |  | (E-Mail) |
| (Voice)  |  | (Chat)   |  |          |
+----------+  +----------+  +----------+
```

### 3.8 Dashboard-Konzept

```
+--------------------------------------------------+
|  Automatisieren im Handwerk — Dashboard          |
+----------+----------+----------+-----------------+
| Angebote |Rechnungen| Wartung  |   Chat (KI)     |
|          |          |          |                  |
| Offen: 5 | Offen: 3 | Faellig:2| "Neues Angebot  |
| Ges: 12k | Ges: 8k  | Naechste:| fuer Frau       |
|          |          | 15.04.   | Schmidt..."     |
| [Liste]  | [Liste]  | [Liste]  |                  |
|          |          |          | [Mikrofon]       |
|          |          |          | [Senden]         |
+----------+----------+----------+-----------------+
```

---

## 4. Entwicklung via PaperClip

### 4.1 Company-Setup

- **Company Name:** Automatisieren im Handwerk
- **Company Goal:** "Baue eine professionelle SaaS-Plattform fuer Handwerks- und Dienstleistungsunternehmen. Kern: KI-gestuetztes Angebots- und Rechnungsmanagement mit Voice-First-Ansatz. Onboarding wie ein E-Mail-Postfach. Multi-Tenant, DACH-ready, spaeter weltweit."

### 4.2 Phased Rollout

#### Phase 1 — Foundation (Woche 1-2)

| Agent | Adapter | Modell | Aufgabe |
|---|---|---|---|
| CTO | Claude Local | Claude (Max Plan) | Stack-Entscheidung, Architektur, Roadmap, Code Review |
| CFO | Claude Local | Claude (Max Plan) | Kaufmaennische Korrektheit, Business-Finanzen, Kostencontrolling |
| KI/Voice Architect | Claude Local | Claude (Max Plan) | Prompt Engineering, Conversation Design, Intent-Erkennung, Voice-UX |
| UI/UX Designer | Claude Local | Claude (Max Plan) | Interface-Design, User Flows, Mobile-First, Design System |
| Builder | Claude Local | Claude (Max Plan) | Implementierung aller Features |
| QA/Release | Codex Local / HTTP | GPT-4o-mini | Tests, Git-Workflow, Commits, PRs, Deployment-Pipeline |

**CTO liest als erstes:**
- Obsidian Vault: `00 Kontext/` (Ueber uns, ICP, Angebot, Branding)
- Obsidian Vault: `02 Projekte/KI Handwerk/` (Vision, Business Plan)
- Bestehende Tools: `KI-Handwerk/website/` (HTML-Dashboards)
- Diese Spec

**CTO entscheidet:**
- Finaler Tech-Stack
- Projekt-Ordnerstruktur
- Datenbank-Setup (PostgreSQL Schema)
- Priorisierte Task-Liste fuer Builder

**CFO verantwortet:**
- Produkt-intern: USt-Berechnung korrekt (DE 19%/7%, AT 20%/10%, CH 8.1%), Nummernkreise, Zahlungsziele, Mahnlogik, GoBD-Konformitaet, Pflichtangaben auf Rechnungen/Angeboten pro Land
- Business-seitig: API-Kostenmonitoring (Claude/OpenAI Verbrauch), Hosting-Kosten, Agent-Budget-Tracking, Finanzplan fuer Automatisieren im Handwerk
- Reviewed jedes Feature das kaufmaennische Auswirkungen hat (Rechnungslogik, Steuerberechnung, PDF-Pflichtfelder)

**KI/Voice Architect verantwortet:**
- System-Prompts fuer die Angebots-/Rechnungs-KI
- Intent-Mapping: Was meint der Nutzer? (Neues Angebot, Position aendern, Senden, etc.)
- Kontext-Erkennung: Welcher Kunde? Welches Angebot? ("beim Mueller" -> richtiges Dokument)
- Bestaetigungsdialoge: "Ich hab verstanden: 3 Steckdosen a 85 EUR — stimmt das?"
- Fehlerbehandlung: "Das hab ich nicht verstanden, meinst du...?"
- Conversation Flows fuer alle Kern-Szenarien (Erstellung, Bearbeitung, Nachtrag, Versand)
- Voice-spezifische Optimierung (kurze Saetze, klare Rueckfragen, Zahlen wiederholen)

**UI/UX Designer verantwortet:**
- Mobile-First Design (Handwerker nutzen Handy auf der Baustelle)
- Grosse Buttons, klare Aktionen, barrierearm
- Dashboard-Layout (Angebote, Rechnungen, Wartung, Chat auf einen Blick)
- Chat/Voice-Interface prominent und einfach bedienbar
- Design System (Farben, Typografie, Komponenten) passend zum Branding
- Responsive: Handy, Tablet, Desktop
- Onboarding-Flow UX (3 Schritte bis fertig)

**Builder liefert:**
- Projekt-Skeleton
- Landingpage (Marketing: Features, Preise, CTA)
- Auth-System (Registrierung, Login, JWT, Multi-Tenant)
- Onboarding-Flow (Firmenprofil)

**QA/Release verantwortet:**
- Schreibt und fuehrt Tests aus (Unit, Integration, E2E)
- Git-Workflow: Feature-Branches, Commits, Pull Requests
- Merged erst nach bestandenen Tests
- Deployment auf Staging/Production
- Versionierung und Release Notes

#### Phase 2 — Feature Build (Woche 3-4)

| Agent | Adapter | Modell | Aufgabe |
|---|---|---|---|
| n8n Engineer | Codex Local / HTTP | GPT-4o-mini | n8n Workflows anpassen, API-Endpoints, Webhook-Integration |
| Security/DSGVO | Codex Local / HTTP | GPT-4o-mini | Datenschutz, Verschluesselung, DSGVO-Konformitaet |

(CTO, CFO, KI/Voice Architect, UI/UX Designer, Builder, QA/Release laufen weiter)

**Security/DSGVO verantwortet:**
- Datenschutzerklaerung und Impressum
- Auftragsverarbeitungsvertrag (AVV) fuer Kundendaten
- Verschluesselung at rest (DB) und in transit (TLS)
- Loeschkonzept (Recht auf Vergessenwerden, Art. 17 DSGVO)
- Tenant-Isolation pruefen (kein Datenleck zwischen Kunden)
- Cookie-Consent
- Security Audit vor Go-Live

**Neue Features:**
- Chat-Interface mit Angebotserstellung (KI/Voice Architect designed, Builder baut)
- Voice-Pipeline (Whisper -> KI -> Aktion)
- Angebotsbearbeitung (Voice + Chat + UI)
- Rechnungserstellung + Konvertierung Angebot -> Rechnung
- PDF-Generierung (CFO reviewed Pflichtangaben)
- E-Mail-Versand
- Dokumenten-Dashboard (UI/UX Designer designed Layout)

#### Phase 3 — Polish & Launch (Woche 5+)

| Agent | Adapter | Modell | Aufgabe |
|---|---|---|---|
| Content Writer | Codex Local / HTTP | GPT-4o-mini | Landingpage-Texte, Feature-Beschreibungen, Onboarding-Texte |

(Alle bisherigen Agenten laufen weiter)

**Zusaetzlich:**
- Wartungsvertrags-Modul (Add-In)
- Kundenverwaltung verfeinern
- i18n fuer AT/CH (CFO prueft Steuer-/Rechnungsregeln, KI/Voice Architect passt Prompts an)
- Performance-Optimierung
- Final Security Audit durch Security/DSGVO Agent

### 4.3 Agenten-Zusammenspiel

```
Lars (Produktvision) + Natscho (Tech-Aufsicht)
                |
    +-----------+-----------+-----------+
    v           v           v           v
  CTO    KI/Voice Arch   UI/UX      CFO
    |           |        Designer      |
    +-----+-----+-----+----+     kaufm.
          v           v           Review
       Builder    QA/Release        |
          |           |             v
          +-----+     +---> Git  Rechnungs-
                |           Deploy logik OK?
                v
         Security/DSGVO
         (Datenschutz-Review)
```

**Workflow:**
1. CTO analysiert und erstellt priorisierte Tasks
2. KI/Voice Architect designed Conversation Flows und Prompts
3. UI/UX Designer designed Interface und User Flows
4. Builder implementiert auf Basis der Designs
5. QA/Release testet, committed und erstellt PR
6. CTO reviewed Code-Qualitaet und Architektur
7. CFO reviewed kaufmaennische Korrektheit (bei relevanten Features)
8. Security/DSGVO reviewed Datenschutz (bei relevanten Features)
9. QA/Release merged und deployed nach Approval
10. Fortschritt sichtbar im PaperClip Dashboard (http://localhost:3100)

### 4.4 Budget

| Agent | Modell | Kosten |
|---|---|---|
| CTO | Claude Max Plan | Im Max-Abo enthalten |
| CFO | Claude Max Plan | Im Max-Abo enthalten |
| KI/Voice Architect | Claude Max Plan | Im Max-Abo enthalten |
| UI/UX Designer | Claude Max Plan | Im Max-Abo enthalten |
| Builder | Claude Max Plan | Im Max-Abo enthalten |
| QA/Release | GPT-4o-mini API | ~5-10 EUR/Monat |
| n8n Engineer | GPT-4o-mini API | ~5-15 EUR/Monat |
| Security/DSGVO | GPT-4o-mini API | ~3-5 EUR/Monat |
| Content Writer | GPT-4o-mini API | ~3-5 EUR/Monat |
| **Gesamt (Phase 3)** | | **Max-Abo + ~15-35 EUR/Monat API** |

### 4.5 Input-Daten fuer Agenten

| Quelle | Pfad | Inhalt |
|---|---|---|
| Vault Kontext | `C:\AI Projekt\Github-Repos\Obsidian-Vault\00 Kontext\` | Ueber uns, ICP, Angebot, Schreibstil, Branding |
| Vault Projekte | `C:\AI Projekt\Github-Repos\Obsidian-Vault\02 Projekte\KI Handwerk\` | Vision, Todos, Business Plan |
| Bestehende Tools | `C:\AI Projekt\Github-Repos\KI-Handwerk\website\` | HTML-Dashboards (Angebotsmanager, CEO Dashboard etc.) |
| AI-Repo | `C:\AI Projekt\Github-Repos\AI-Repo\` | Dashboards, Index |
| n8n Instanz | `https://n8n.srv1033052.hstgr.cloud/` | Bestehende Workflows |
| Diese Spec | `docs/superpowers/specs/2026-04-09-automatisieren-im-handwerk-platform-design.md` | Dieses Dokument |

---

## 5. Offene Punkte

- [ ] Domain `automatisieren-im-handwerk.de` kaufen
- [ ] PaperClip installieren und Company anlegen
- [ ] CTO-Agent konfigurieren und mit Vault-Daten fuettern
- [ ] Tech-Stack-Entscheidung durch CTO-Agent
- [ ] PostgreSQL auf Hostinger VPS aufsetzen (Docker)
- [ ] SMTP/E-Mail-Service fuer Tenant-E-Mails klaeren
- [ ] Whisper API Key oder Alternative fuer Voice-Pipeline
- [ ] Bestehende Angebotsmanager-Logik (angebotsmanager-v3.html) als Referenz fuer KI-Angebotserstellung nutzen
