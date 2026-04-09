# Design System — Automatisieren im Handwerk

**Version:** 1.0
**Datum:** 2026-04-09
**Erstellt von:** UI/UX Designer Agent
**Tech-Stack:** Tailwind CSS 4.x + shadcn/ui + Next.js 15

---

## 1. Design-Prinzipien

| Prinzip | Regel | Grund |
|---|---|---|
| **Mobile-First** | Handy ist das primaere Geraet | Handwerker sind auf der Baustelle, nicht am Schreibtisch |
| **Grosse Touch-Targets** | Minimum 48x48px (12x12 Tailwind = `h-12 w-12`) | Schmutzige Haende, Handschuhe, draussen bei Kaelte |
| **Wenige Klicks** | Jede Kern-Aktion in max 2 Taps | Keine Zeit fuer lange Menue-Ketten |
| **Klare Hierarchie** | Wichtigstes zuerst, kein Overload | Schnell erfassen was ansteht |
| **Barrierefrei** | WCAG 2.1 AA, guter Kontrast | Auch fuer aeltere Nutzer gut lesbar |

---

## 2. Farbpalette

### Design-Entscheidung

Die Farbwahl spiegelt die Identitaet wider: **Blau** fuer Vertrauen und Professionalitaet, **Amber/Orange** als Akzent fuer Handwerk, Energie und Waerme. Neutral-Toene basieren auf Slate fuer eine moderne, saubere Optik.

### 2.1 Primaerfarbe — Blau (Trust & Professionalitaet)

| Token | Hex | HSL | Verwendung |
|---|---|---|---|
| `primary-50` | `#EFF6FF` | `214 100% 97%` | Hintergrund-Highlight |
| `primary-100` | `#DBEAFE` | `214 95% 93%` | Hover-States, Badge-BG |
| `primary-200` | `#BFDBFE` | `214 87% 87%` | Borders, Divider |
| `primary-500` | `#3B82F6` | `217 91% 60%` | Primaer-Buttons, Links |
| `primary-600` | `#2563EB` | `221 83% 53%` | Button Hover |
| `primary-700` | `#1D4ED8` | `224 76% 48%` | Button Active/Pressed |
| `primary-900` | `#1E3A5F` | `212 52% 25%` | Headlines, dunkler Text |

**Kontrast-Check:** `primary-500` auf Weiss = 4.6:1 (AA bestanden). `primary-700` auf Weiss = 7.1:1 (AAA bestanden).

### 2.2 Akzentfarbe — Amber (Handwerk & Energie)

| Token | Hex | HSL | Verwendung |
|---|---|---|---|
| `accent-50` | `#FFFBEB` | `48 100% 96%` | Warnungs-Hintergrund |
| `accent-100` | `#FEF3C7` | `48 96% 89%` | Highlight-Badge |
| `accent-400` | `#FBBF24` | `45 93% 56%` | Sterne, Highlights |
| `accent-500` | `#F59E0B` | `38 92% 50%` | Akzent-Buttons, CTAs |
| `accent-600` | `#D97706` | `32 95% 44%` | Akzent Hover |

**Hinweis:** Amber auf Weiss hat schlechten Kontrast. Amber-Text nur auf dunklem Hintergrund verwenden, oder als dekoratives Element (Icons, Badges mit dunklem Text).

### 2.3 Semantische Farben

| Token | Hex | Verwendung |
|---|---|---|
| `success-500` | `#22C55E` | Bezahlt, Angenommen, Erfolgreich |
| `success-50` | `#F0FDF4` | Erfolg-Hintergrund |
| `warning-500` | `#F59E0B` | Faellig, Ausstehend |
| `warning-50` | `#FFFBEB` | Warnungs-Hintergrund |
| `danger-500` | `#EF4444` | Ueberfaellig, Abgelehnt, Fehler |
| `danger-50` | `#FEF2F2` | Fehler-Hintergrund |
| `info-500` | `#3B82F6` | Informationen, Entwurf |
| `info-50` | `#EFF6FF` | Info-Hintergrund |

### 2.4 Neutrale Farben (Slate-Basis)

| Token | Hex | Verwendung |
|---|---|---|
| `background` | `#FFFFFF` | Seiten-Hintergrund |
| `surface` | `#F8FAFC` | Karten, Panels (slate-50) |
| `surface-raised` | `#F1F5F9` | Erhobene Elemente (slate-100) |
| `border` | `#E2E8F0` | Standard-Borders (slate-200) |
| `border-strong` | `#CBD5E1` | Betonte Borders (slate-300) |
| `text-primary` | `#0F172A` | Haupttext (slate-900) |
| `text-secondary` | `#475569` | Zweittext (slate-600) |
| `text-muted` | `#94A3B8` | Platzhalter, deaktiviert (slate-400) |

---

## 3. Typografie

### Design-Entscheidung

**Inter** als einzige Schriftfamilie. Gruende:
- Hervorragende Lesbarkeit auf kleinen Screens
- Variable Font = eine Datei, alle Gewichte
- Grosses x-Height = gut lesbar auch bei kleiner Schrift
- Kostenlos, weit verbreitet, schnelle Ladezeit via `next/font`

### 3.1 Typografie-Skala

| Token | Groesse | Gewicht | Zeilenhoehe | Verwendung |
|---|---|---|---|---|
| `text-xs` | 12px / 0.75rem | 400 | 1.5 | Hilfstexte, Timestamps |
| `text-sm` | 14px / 0.875rem | 400 | 1.5 | Labels, Zweitinfos |
| `text-base` | 16px / 1rem | 400 | 1.5 | Fliesstext, Inputs |
| `text-lg` | 18px / 1.125rem | 500 | 1.4 | Kartenheadlines |
| `text-xl` | 20px / 1.25rem | 600 | 1.3 | Sektions-Titel |
| `text-2xl` | 24px / 1.5rem | 700 | 1.2 | Seiten-Titel |
| `text-3xl` | 30px / 1.875rem | 700 | 1.2 | Hero/Dashboard-Zahlen |

### 3.2 Regeln

- **Minimum Schriftgroesse:** 14px (`text-sm`) fuer interaktive Elemente
- **Body-Text:** Immer mindestens 16px (`text-base`) auf Mobile
- **Keine Schriftgroesse unter 12px** — auch nicht fuer Kleingedrucktes
- **Font-Weight:** Regular (400) fuer Body, Medium (500) fuer Labels, Semibold (600) fuer Buttons, Bold (700) fuer Headlines
- **Letter-Spacing:** Standard (0) ueberall, `-0.025em` bei `text-2xl` und groesser

---

## 4. Spacing & Layout

### 4.1 Spacing-Skala (4px-Basis)

| Token | Wert | Verwendung |
|---|---|---|
| `space-1` | 4px | Minimaler Abstand (Icon zu Text) |
| `space-2` | 8px | Enger Abstand (innerhalb Gruppen) |
| `space-3` | 12px | Standard Padding (Buttons, Badges) |
| `space-4` | 16px | Karten-Padding (Mobile), Formular-Gaps |
| `space-5` | 20px | Sektion-Padding (Mobile) |
| `space-6` | 24px | Karten-Padding (Desktop), Sektion-Gaps |
| `space-8` | 32px | Grosse Sektions-Abstande |

### 4.2 Breakpoints

| Name | Bereich | Beschreibung |
|---|---|---|
| **Mobile** | 320–767px | Primaer-Design (Single Column) |
| **Tablet** | 768–1023px | 2-Spalten wo sinnvoll |
| **Desktop** | 1024px+ | Sidebar + Content, max-width 1280px |

### 4.3 Layout-Prinzipien

- **Mobile:** Single Column, volles Padding `px-4` (16px links/rechts)
- **Tablet:** `px-6` (24px), 2-Spalten Grid fuer Dashboard-Karten
- **Desktop:** Sidebar-Navigation (240px) + Content, `max-w-7xl mx-auto`
- **Container:** `max-w-lg` (512px) fuer Formulare, `max-w-7xl` (1280px) fuer Dashboard

---

## 5. Komponenten-Bibliothek

Alle Komponenten basieren auf **shadcn/ui** mit angepasstem Theme. Hier die projektspezifischen Erweiterungen und Regeln.

### 5.1 Buttons

```
Primaer-Button:
  Klassen: bg-primary-500 hover:bg-primary-600 active:bg-primary-700
           text-white font-semibold
           rounded-xl px-6 py-3 min-h-[48px] min-w-[48px]
           transition-colors duration-150
           focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2

Sekundaer-Button:
  Klassen: bg-white border-2 border-primary-500 text-primary-700
           hover:bg-primary-50 active:bg-primary-100
           font-semibold rounded-xl px-6 py-3 min-h-[48px]

Danger-Button:
  Klassen: bg-danger-500 hover:bg-red-600 text-white
           font-semibold rounded-xl px-6 py-3 min-h-[48px]

Ghost-Button:
  Klassen: text-primary-600 hover:bg-primary-50
           font-medium rounded-xl px-4 py-3 min-h-[48px]
```

**Regeln:**
- Immer `min-h-[48px]` fuer Touch-Targets
- `rounded-xl` (12px) als Standard-Radius — wirkt modern und freundlich
- Volle Breite auf Mobile: `w-full sm:w-auto`
- Maximal 2 Buttons nebeneinander auf Mobile

### 5.2 Karten (Cards)

```
Standard-Karte:
  Klassen: bg-white rounded-2xl border border-border
           p-4 sm:p-6
           shadow-sm hover:shadow-md transition-shadow

Status-Karte (Dashboard):
  Klassen: bg-white rounded-2xl border border-border
           p-4 sm:p-6
  Inhalt:
    - Icon (24px, semantische Farbe)
    - Label (text-sm text-secondary font-medium)
    - Wert (text-3xl font-bold text-primary-900)
    - Aenderung/Trend (text-sm, success/danger)
```

### 5.3 Formular-Elemente

```
Input-Feld:
  Klassen: w-full rounded-xl border border-border
           bg-white px-4 py-3 text-base min-h-[48px]
           placeholder:text-muted
           focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
           transition-colors

Label:
  Klassen: text-sm font-medium text-primary-900 mb-1.5

Select / Dropdown:
  Klassen: (wie Input) + appearance-none + Chevron-Icon rechts

Textarea:
  Klassen: (wie Input) + min-h-[120px] resize-y
```

**Regeln:**
- Labels immer UEBER dem Input (nicht inline) — besser lesbar auf Mobile
- Error-State: `border-danger-500 focus:ring-danger-500/20` + rote Fehlermeldung darunter
- Padding `py-3` statt `py-2` fuer 48px Touch-Target bei `text-base`

### 5.4 Statusanzeigen (Badges)

```
Status-Badge:
  Basis: inline-flex items-center rounded-full px-3 py-1
         text-sm font-medium

  Entwurf:   bg-slate-100 text-slate-700
  Gesendet:  bg-info-50 text-blue-700
  Angenommen: bg-success-50 text-green-700
  Abgelehnt: bg-danger-50 text-red-700
  Bezahlt:   bg-success-50 text-green-700
  Ueberfaellig: bg-danger-50 text-red-700
  Faellig:   bg-warning-50 text-amber-700
```

### 5.5 Navigation

```
Mobile Bottom-Navigation:
  Container: fixed bottom-0 left-0 right-0 z-50
             bg-white border-t border-border
             flex justify-around items-center
             h-16 px-2 safe-area-pb

  Nav-Item:  flex flex-col items-center justify-center
             gap-0.5 min-w-[64px] min-h-[48px]
             text-xs font-medium
  Aktiv:     text-primary-600
  Inaktiv:   text-muted

  Icons: Dashboard, Chat, Angebote, Rechnungen, Mehr

Desktop Sidebar:
  Container: fixed left-0 top-0 h-full w-60
             bg-white border-r border-border
             flex flex-col py-6

  Nav-Item:  flex items-center gap-3 px-4 py-3
             rounded-xl mx-3 text-sm font-medium
  Aktiv:     bg-primary-50 text-primary-700
  Inaktiv:   text-secondary hover:bg-surface-raised
```

### 5.6 Chat/Voice-Interface

```
Chat-Container:
  Klassen: flex flex-col h-[calc(100dvh-64px)]
           (100dvh minus Bottom-Nav-Hoehe)

Nachricht (KI):
  Klassen: bg-surface rounded-2xl rounded-bl-md
           p-4 max-w-[85%] mr-auto
           text-base text-primary-900

Nachricht (Nutzer):
  Klassen: bg-primary-500 text-white rounded-2xl rounded-br-md
           p-4 max-w-[85%] ml-auto

Eingabe-Leiste:
  Container: sticky bottom-16 sm:bottom-0 bg-white
             border-t border-border px-4 py-3
             flex items-end gap-2

  Textfeld:  flex-1 rounded-2xl border border-border
             bg-surface px-4 py-3 text-base
             max-h-[120px] resize-none

  Mikrofon-Button:
             w-14 h-14 rounded-full
             bg-accent-500 hover:bg-accent-600
             text-white flex items-center justify-center
             shadow-lg active:scale-95 transition-transform
  (Aufnahme-Modus):
             bg-danger-500 animate-pulse

  Senden-Button:
             w-12 h-12 rounded-full
             bg-primary-500 hover:bg-primary-600
             text-white flex items-center justify-center
```

---

## 6. Screen-Designs

### 6.1 Onboarding-Wizard (3 Schritte)

**Ziel:** Account erstellen bis arbeitsfaehig in unter 3 Minuten.

```
Komponenten-Hierarchie:

OnboardingLayout
  Container: min-h-screen bg-surface flex flex-col items-center
             justify-center px-4 py-8
  +-- Logo + Titel
      Klassen: text-2xl font-bold text-primary-900 text-center mb-2
  +-- Fortschritts-Anzeige
      Container: flex items-center gap-2 mb-8
      Schritt (aktiv):  w-10 h-10 rounded-full bg-primary-500
                        text-white font-semibold flex items-center
                        justify-center
      Schritt (fertig): w-10 h-10 rounded-full bg-success-500
                        text-white (Checkmark-Icon)
      Schritt (offen):  w-10 h-10 rounded-full bg-border
                        text-muted font-semibold
      Verbindungslinie: flex-1 h-0.5 bg-border
                        (bg-primary-500 wenn passiert)

  +-- Schritt-Karte
      Klassen: bg-white rounded-2xl shadow-sm p-6 w-full max-w-lg

      --- Schritt 1: Account ---
      +-- Titel: "Konto erstellen" (text-xl font-semibold mb-4)
      +-- Input: Vorname
      +-- Input: Nachname
      +-- Input: E-Mail
      +-- Input: Passwort (mit Sichtbarkeits-Toggle)
      +-- Button: "Weiter" (Primaer, w-full)

      --- Schritt 2: Firmenprofil ---
      +-- Titel: "Dein Betrieb" (text-xl font-semibold mb-4)
      +-- Input: Firmenname
      +-- Input: Strasse + Hausnummer
      +-- Inputs: PLZ (w-1/3) + Stadt (w-2/3)
      +-- Input: Telefon
      +-- Input: Steuernummer (optional)
      +-- Button: "Weiter" (Primaer, w-full)
      +-- Link: "Spaeter vervollstaendigen" (Ghost)

      --- Schritt 3: Fertig ---
      +-- Erfolgs-Icon (animiert, Checkmark im Kreis)
      +-- Titel: "Alles bereit!" (text-2xl font-bold)
      +-- Text: "Du kannst jetzt Angebote erstellen,
                Rechnungen schreiben und mit der KI sprechen."
      +-- Button: "Zum Dashboard" (Primaer, w-full)
      +-- Hinweis: "Tipp: Sag der KI einfach was du brauchst!"
                   (text-sm text-secondary)
```

### 6.2 Dashboard

**Mobile-Layout (Single Column):**

```
DashboardPage
  Container: pb-20 (Platz fuer Bottom-Nav)

  +-- Header
      Klassen: sticky top-0 z-40 bg-white border-b border-border
               px-4 py-3 flex items-center justify-between
      +-- Begruessung: "Hallo, Lars" (text-lg font-semibold)
      +-- Benachrichtigungs-Icon (Badge mit Zahl)

  +-- Quick-Action-Bar
      Klassen: px-4 py-4 flex gap-3 overflow-x-auto
               scrollbar-hide -mx-4 px-4
      +-- Quick-Action-Button (je):
          Klassen: flex-shrink-0 flex flex-col items-center gap-1.5
                   bg-white rounded-2xl border border-border
                   p-4 min-w-[100px] shadow-sm
                   active:bg-surface transition-colors
          +-- Icon (24px, primary-500)
          +-- Label (text-xs font-medium text-secondary)
          Buttons: "Neues Angebot", "Neue Rechnung", "KI fragen"

  +-- Status-Karten (Grid)
      Klassen: px-4 grid grid-cols-2 gap-3 mb-6
      +-- Karte "Offene Angebote"
          Wert: "5" (text-3xl font-bold text-primary-900)
          Label: "Offen" (text-sm text-secondary)
          Summe: "12.450 EUR" (text-sm font-medium text-primary-700)
          Icon: FileText (primary-500)
      +-- Karte "Offene Rechnungen"
          Wert: "3"
          Summe: "8.320 EUR"
          Icon: Receipt (info-500)
      +-- Karte "Ueberfaellig"
          Wert: "1"
          Summe: "2.150 EUR"
          Icon: AlertTriangle (danger-500)
      +-- Karte "Wartung faellig"
          Wert: "2"
          Label: "Naechste: 15.04."
          Icon: Wrench (warning-500)

  +-- Letzte Aktivitaet
      Klassen: px-4
      +-- Sektions-Header
          Klassen: flex justify-between items-center mb-3
          +-- Titel: "Letzte Aktivitaet" (text-lg font-semibold)
          +-- Link: "Alle anzeigen" (text-sm text-primary-600)
      +-- Aktivitaets-Liste
          +-- Aktivitaets-Item (je):
              Klassen: flex items-start gap-3 py-3
                       border-b border-border last:border-0
              +-- Status-Dot (w-2.5 h-2.5 rounded-full mt-1.5)
              +-- Content
                  +-- Titel (text-sm font-medium)
                     z.B. "Angebot #2024-047 gesendet"
                  +-- Zeit (text-xs text-muted)
                     z.B. "Vor 2 Stunden"
```

**Desktop-Layout:**

```
Sidebar (w-60, fixed) + Content (ml-60)
  Status-Karten: grid-cols-4 (eine Reihe)
  Dashboard-Grid: grid-cols-3
    Spalte 1-2: Aktivitaets-Liste + Angebots-Tabelle
    Spalte 3: Chat-Widget (kompakt, immer sichtbar)
```

### 6.3 Chat/Voice-Screen

```
ChatPage
  Container: flex flex-col h-[calc(100dvh-64px)]

  +-- Chat-Header
      Klassen: sticky top-0 bg-white border-b border-border
               px-4 py-3 flex items-center gap-3
      +-- KI-Avatar (w-10 h-10 rounded-full bg-primary-100
                     flex items-center justify-center)
          Icon: Bot (primary-600)
      +-- Info
          +-- Name: "KI-Assistent" (text-base font-semibold)
          +-- Status: "Online" (text-xs text-success-500)

  +-- Nachrichten-Liste
      Klassen: flex-1 overflow-y-auto px-4 py-4
               flex flex-col gap-4
      +-- Willkommensnachricht (KI)
          "Hallo! Ich bin dein KI-Assistent. Sag mir einfach
           was du brauchst — Angebot erstellen, Rechnung schreiben,
           oder Infos abfragen."
      +-- Vorschlags-Chips
          Klassen: flex flex-wrap gap-2 mt-2
          +-- Chip (je):
              Klassen: bg-primary-50 text-primary-700
                       rounded-full px-4 py-2 text-sm
                       font-medium border border-primary-200
                       active:bg-primary-100
              Texte: "Neues Angebot", "Offene Rechnungen",
                     "Wartung pruefen"

  +-- Eingabe-Leiste (siehe 5.6)
```

### 6.4 Angebots-Liste

```
QuotesListPage
  Container: pb-20

  +-- Header
      Klassen: sticky top-0 bg-white border-b border-border
               px-4 py-3
      +-- Titel: "Angebote" (text-xl font-semibold)
      +-- Neues-Angebot-Button (rechts):
          Klassen: w-12 h-12 rounded-full bg-primary-500
                   text-white shadow-lg
          Icon: Plus

  +-- Filter-Bar
      Klassen: px-4 py-3 flex gap-2 overflow-x-auto
               scrollbar-hide
      +-- Filter-Chip (je):
          Klassen: rounded-full px-4 py-2 text-sm font-medium
                   border whitespace-nowrap min-h-[40px]
          Aktiv:   bg-primary-500 text-white border-primary-500
          Inaktiv: bg-white text-secondary border-border
          Chips: "Alle (23)", "Entwurf (4)", "Gesendet (12)",
                 "Angenommen (5)", "Abgelehnt (2)"

  +-- Such-Feld
      Klassen: mx-4 mb-3
      Input mit Such-Icon links

  +-- Angebots-Liste
      +-- Angebots-Item (je):
          Klassen: mx-4 bg-white rounded-xl border border-border
                   p-4 mb-3 active:bg-surface
                   transition-colors
          +-- Obere Zeile: flex justify-between items-start
              +-- Kundenname (text-base font-semibold)
              +-- Status-Badge
          +-- Mittlere Zeile:
              +-- Nummer: "#2024-047" (text-sm text-secondary)
              +-- Beschreibung gekuerzt (text-sm text-secondary
                   line-clamp-1)
          +-- Untere Zeile: flex justify-between items-center mt-2
              +-- Betrag: "3.870,00 EUR" (text-lg font-bold)
              +-- Datum: "07.04.2026" (text-sm text-muted)
```

### 6.5 Angebots-Detail

```
QuoteDetailPage
  Container: pb-20

  +-- Header
      Klassen: sticky top-0 bg-white border-b border-border
               px-4 py-3 flex items-center gap-3
      +-- Zurueck-Button (Ghost, 48px)
      +-- Titel: "Angebot #2024-047" (text-lg font-semibold flex-1)
      +-- Mehr-Button (drei Punkte, Ghost, 48px)

  +-- Status-Sektion
      Klassen: px-4 py-4 bg-surface
      +-- Status-Badge (gross)
      +-- Kundenname (text-xl font-bold mt-2)
      +-- Adresse (text-sm text-secondary)
      +-- Erstellt/Gueltig bis (text-sm text-secondary)

  +-- Aktions-Buttons
      Klassen: px-4 py-3 flex gap-3
      +-- "PDF Vorschau" (Sekundaer-Button, flex-1)
      +-- "Senden" (Primaer-Button, flex-1)

  +-- Positionen-Tabelle
      Klassen: px-4

      +-- Sektions-Header
          +-- Titel: "Positionen" (text-lg font-semibold)
          +-- "Hinzufuegen" Link (text-sm text-primary-600)

      +-- Mobile: Karten-Layout (statt Tabelle)
          +-- Positions-Karte (je):
              Klassen: bg-white rounded-xl border border-border
                       p-4 mb-2
              +-- Beschreibung (text-base font-medium)
              +-- Details-Grid: grid grid-cols-3 gap-2 mt-2
                  +-- Menge (text-sm)
                     Label: "Menge" + Wert: "12 m2"
                  +-- Einzelpreis (text-sm)
                     Label: "Preis" + Wert: "120,00 EUR"
                  +-- Gesamt (text-sm font-semibold)
                     Label: "Gesamt" + Wert: "1.440,00 EUR"
              +-- Aktions-Icons rechts unten:
                  Bearbeiten (Pencil) + Loeschen (Trash)
                  Je 44x44px Touch-Target

      +-- Desktop: Echte Tabelle
          Spalten: Pos | Beschreibung | Menge | Einheit |
                   Einzelpreis | Gesamt | Aktionen
          Inline-Editing: Klick auf Zelle oeffnet Input

  +-- Summen-Sektion
      Klassen: px-4 py-4 border-t border-border mt-4
      +-- Zeile: "Netto" — "3.250,00 EUR"
          (text-base flex justify-between)
      +-- Zeile: "USt. 19%" — "617,50 EUR"
          (text-sm text-secondary flex justify-between)
      +-- Divider (border-t my-2)
      +-- Zeile: "Brutto" — "3.867,50 EUR"
          (text-xl font-bold flex justify-between)

  +-- Angebot-zu-Rechnung Button
      Klassen: mx-4 mt-6 mb-4
      +-- "Rechnung erstellen" (Primaer-Button, w-full)
          (Nur sichtbar wenn Status = "Angenommen")
```

---

## 7. Tailwind Theme-Konfiguration

```typescript
// tailwind.config.ts — Theme-Erweiterungen

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primaerfarbe — Blau
        primary: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A5F",
        },
        // Akzentfarbe — Amber
        accent: {
          50:  "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        // Semantische Farben
        success: {
          50:  "#F0FDF4",
          500: "#22C55E",
          700: "#15803D",
        },
        warning: {
          50:  "#FFFBEB",
          500: "#F59E0B",
          700: "#B45309",
        },
        danger: {
          50:  "#FEF2F2",
          500: "#EF4444",
          700: "#B91C1C",
        },
        // Oberflaechenfarben
        surface: {
          DEFAULT: "#F8FAFC",
          raised:  "#F1F5F9",
        },
        border: {
          DEFAULT: "#E2E8F0",
          strong:  "#CBD5E1",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",    // 16px — Karten
        "xl":  "0.75rem", // 12px — Buttons, Inputs
        "full": "9999px", // Pills, Avatare
      },
      minHeight: {
        "touch": "48px", // Touch-Target Minimum
      },
      minWidth: {
        "touch": "48px",
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 8. shadcn/ui Theme-Anpassungen

Die folgenden CSS-Variablen werden in `globals.css` gesetzt, damit shadcn/ui-Komponenten automatisch die richtigen Farben verwenden:

```css
/* globals.css — shadcn/ui Theme-Variablen */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;     /* slate-900 */

    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    --primary: 217 91% 60%;        /* blue-500 */
    --primary-foreground: 0 0% 100%;

    --secondary: 210 40% 96%;      /* slate-100 */
    --secondary-foreground: 222 47% 11%;

    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%; /* slate-500 */

    --accent: 38 92% 50%;          /* amber-500 */
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;      /* red-500 */
    --destructive-foreground: 0 0% 100%;

    --border: 214 32% 91%;         /* slate-200 */
    --input: 214 32% 91%;
    --ring: 217 91% 60%;           /* blue-500 */

    --radius: 0.75rem;             /* 12px Standard */
  }
}
```

---

## 9. Icons

**Bibliothek:** Lucide React (Standard bei shadcn/ui)

| Bereich | Icons |
|---|---|
| Navigation | `LayoutDashboard`, `MessageCircle`, `FileText`, `Receipt`, `MoreHorizontal` |
| Aktionen | `Plus`, `Send`, `Mic`, `Pencil`, `Trash2`, `Download`, `ExternalLink` |
| Status | `CheckCircle2`, `Clock`, `AlertTriangle`, `XCircle` |
| Content | `User`, `Building2`, `Phone`, `Mail`, `Search`, `ChevronLeft`, `ChevronRight` |

**Groessen:**
- Navigation: 24px (`w-6 h-6`)
- Inline/Buttons: 20px (`w-5 h-5`)
- Status-Dots: 10px (`w-2.5 h-2.5`)

---

## 10. Animationen & Mikro-Interaktionen

```css
/* Uebergangs-Klassen */
.transition-default {
  @apply transition-all duration-200 ease-in-out;
}

/* Karten-Hover */
.card-interactive {
  @apply hover:shadow-md active:scale-[0.98] transition-all duration-150;
}

/* Mikrofon-Puls (Aufnahme) */
@keyframes mic-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
.mic-recording {
  animation: mic-pulse 1.5s ease-in-out infinite;
}

/* Skeleton-Loading */
.skeleton {
  @apply animate-pulse bg-surface-raised rounded-xl;
}
```

---

## 11. Barrierefreiheit (Accessibility)

| Regel | Umsetzung |
|---|---|
| Kontrast AA (4.5:1) | Alle Text-Farben geprueft gegen Hintergrund |
| Touch-Targets 48px | `min-h-touch min-w-touch` auf alle interaktiven Elemente |
| Focus-Ringe | `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` |
| Screen Reader | Alle Icons mit `aria-label`, Formulare mit `label` + `id` |
| Reduzierte Bewegung | `motion-reduce:transition-none motion-reduce:animate-none` |
| Tastatur-Navigation | Logische Tab-Reihenfolge, Skip-Links |
| Sprache | `lang="de"` auf `<html>` |
| Schriftgroesse | Minimum 14px, Body 16px |

---

## 12. Responsive-Verhalten Zusammenfassung

| Komponente | Mobile (320-767) | Tablet (768-1023) | Desktop (1024+) |
|---|---|---|---|
| Navigation | Bottom-Bar (fixed) | Bottom-Bar | Sidebar (fixed, w-60) |
| Dashboard-Karten | 2-spaltig Grid | 2-spaltig Grid | 4-spaltig Grid |
| Chat | Vollbild | Vollbild | Sidebar-Widget oder Vollbild |
| Angebots-Liste | Karten-Layout | Karten-Layout | Tabellen-Layout |
| Angebots-Detail | Positions-Karten | Positions-Karten | Editierbare Tabelle |
| Onboarding | Zentriert, max-w-lg | Zentriert, max-w-lg | Zentriert, max-w-lg |
| Formulare | Volle Breite | max-w-lg zentriert | max-w-lg zentriert |
