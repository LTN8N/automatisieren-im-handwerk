# Design: Onboarding-Flow (AUT-21)

**Erstellt:** 2026-04-09  
**Agent:** UI/UX Designer  
**Status:** Implementiert  

---

## Überblick

Der Onboarding-Flow führt neue Handwerksbetriebe in unter 3 Minuten zur Arbeitsfähigkeit. Er besteht aus zwei Phasen:

1. **Registrierungsseite** — Account erstellen (eigenständige Route `/[locale]/register`)
2. **Onboarding-Wizard** — Betrieb einrichten, 3 Schritte (`/[locale]/onboarding`)

---

## User Flow

```
/register
  → Formular ausfüllen (Name, Firmenname, E-Mail, Passwort, Land)
  → POST /api/auth/register (Tenant + User atomar)
  → Auto-Login via signIn()
  → redirect /onboarding

/onboarding (auth-protected)
  → Schritt 1: Firmendaten (Adresse, Steuernummer, USt-IdNr)
      PATCH /api/tenant/profile
  → Schritt 2: E-Mail-Konfiguration (SMTP optional)
      PATCH /api/tenant/profile (emailConfig)
      oder "Überspringen"
  → Schritt 3: Fertig! → redirect /dashboard (1,5s Delay)
```

---

## Registrierungsseite

### Layout

```
Hintergrund: bg-slate-50 (volle Bildschirmhöhe, zentriert)

Brand-Header:
  Container: mb-8 flex flex-col items-center gap-3
  Logo-Icon: h-14 w-14 rounded-2xl bg-blue-600 shadow-lg
             Wrench-Icon h-7 w-7 text-white
  Titel: text-2xl font-bold tracking-tight text-slate-900
  Untertitel: text-sm text-slate-500

Karte:
  w-full max-w-md rounded-2xl border border-slate-200 shadow-sm
  CardHeader: Titel (text-xl font-semibold) + Beschreibung (text-sm text-slate-500)
  CardContent: Formular
```

### Felder (in Reihenfolge)

| Feld | Typ | Placeholder | Validierung |
|---|---|---|---|
| Ihr Name | text | Max Mustermann | required, min 2 |
| Firmenname | text | Mustermann Sanitär GmbH | required, min 2 |
| E-Mail | email | name@firma.de | required, email |
| Passwort | password (toggle) | Mindestens 8 Zeichen | required, min 8 |
| Land | select | — | DE / AT / CH |

### Land-Selector

```tsx
// Optionen:
DE → "Deutschland 🇩🇪" → ustSatz: 19.0, waehrung: EUR
AT → "Österreich 🇦🇹"  → ustSatz: 20.0, waehrung: EUR
CH → "Schweiz 🇨🇭"     → ustSatz: 8.1,  waehrung: CHF

// Hinweistext unter dem Select:
DE: "MwSt. 19% · UStG Deutschland"
AT: "MwSt. 20% · UStG Österreich"
CH: "MWST 8.1% · MWSTG Schweiz"
```

### Formular-Klassen

```
Input: min-h-[48px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base
       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-full
Label: text-sm font-medium text-slate-700 mb-1.5 block
Select: (wie Input) + appearance-none
Chevron: pointer-events-none absolute right-4 top-1/2 -translate-y-1/2

Submit-Button:
  mt-2 min-h-[48px] w-full rounded-xl
  bg-blue-600 hover:bg-blue-700 active:bg-blue-800
  font-semibold text-white disabled:opacity-60

Error-Box:
  rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700
```

### Passwort-Toggle

```tsx
// Eye/EyeOff icon von lucide-react
// Positionierung: absolute right-3 top-1/2 -translate-y-1/2
// Klassen: p-1 text-slate-400 hover:text-slate-600
```

---

## Onboarding-Layout

```
Layout: flex min-h-screen flex-col bg-slate-50

Header: h-16 border-b border-slate-200 bg-white px-4 sm:px-6
  Logo: h-9 w-9 rounded-xl bg-blue-600 + Wrench-Icon h-4.5 w-4.5 text-white
  Name: text-base font-semibold text-slate-900

Main: flex flex-1 flex-col items-center justify-center px-4 py-10
```

---

## Onboarding-Wizard

### Fortschritts-Anzeige

```
Container: flex w-full max-w-sm items-center mb-8

Schritt (aktiv):
  h-10 w-10 rounded-full bg-blue-600 text-white font-semibold
  shadow-md shadow-blue-200
  + text-xs text-blue-600 (Label darunter)

Schritt (abgeschlossen):
  h-10 w-10 rounded-full bg-green-500 text-white
  Check-Icon h-5 w-5
  + text-xs text-green-600

Schritt (ausstehend):
  h-10 w-10 rounded-full border-2 border-slate-200 bg-white text-slate-400
  + text-xs text-slate-400

Verbindungslinie:
  mx-1 mb-5 h-0.5 flex-1
  Passiert: bg-green-400
  Ausstehend: bg-slate-200
  transition-all duration-500
```

### Schritt-Karte

```
Container: rounded-2xl border border-slate-200 bg-white p-6 shadow-sm w-full max-w-lg
```

---

## Schritt 1: Firmendaten

### Schritt-Header

```
Icon: h-9 w-9 rounded-xl bg-blue-100, Building2 h-5 w-5 text-blue-600
Titel: text-xl font-semibold text-slate-900 "Ihr Betrieb"
Beschreibung: text-sm text-slate-500 pl-12
```

### Felder

**Adresse (Zeile 1 — 2-spaltig):**
```
Straße (flex-1):   text placeholder "Hauptstraße" required
Nr. (w-24):        text placeholder "12" required
```

**Adresse (Zeile 2 — 2-spaltig):**
```
PLZ (w-28):        text maxLength=10 placeholder "20099" required
Stadt (flex-1):    text placeholder "Hamburg" required
```

**Steuerdaten (in Box `bg-slate-50 rounded-xl border border-slate-100 p-4`):**
```
Header: text-xs font-medium uppercase tracking-wider text-slate-400
        "STEUERDATEN (OPTIONAL)"
Steuernummer: text placeholder "21/815/08150" optional
USt-IdNr.:    text placeholder "DE 123 456 789" optional
Hinweis: text-xs text-slate-400 (§ 14 UStG Pflichtangaben)
```

### API-Call

```
PATCH /api/tenant/profile
Body: {
  adresse: "{strasse} {hausnummer}, {plz} {stadt}",
  steuernummer: string | null,
  ustId: string | null
}
```

---

## Schritt 2: E-Mail-Konfiguration

### Schritt-Header

```
Icon: h-9 w-9 rounded-xl bg-amber-100, Mail h-5 w-5 text-amber-600
Titel: text-xl font-semibold text-slate-900 "E-Mail-Versand"
```

### Info-Banner

```
rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800
Text: "Optional: Ohne SMTP können Sie Dokumente als PDF herunterladen..."
```

### Felder

| Feld | Typ | Placeholder |
|---|---|---|
| SMTP-Server | text | smtp.gmail.com |
| SMTP-Port | number | 587 |
| Absender-E-Mail | email | info@firma.de |
| SMTP-Benutzername | text | info@firma.de |
| SMTP-Passwort | password | App-Passwort |

SMTP-Port und Absender-E-Mail: 2-spaltig nebeneinander.

### Buttons

```
Primär (Speichern & weiter):
  min-h-[48px] w-full rounded-xl bg-blue-600 font-semibold text-white
  + ChevronRight icon

Sekundär (Überspringen):
  min-h-[48px] w-full rounded-xl border-2 border-slate-200 bg-white
  font-medium text-slate-600 hover:bg-slate-50
  + SkipForward icon

Zurück-Link:
  text-sm text-slate-400 hover:text-slate-600 + ArrowLeft icon
```

### API-Call (nur wenn Host + User ausgefüllt)

```
PATCH /api/tenant/profile
Body: {
  emailConfig: {
    host: string,
    port: number,
    user: string,
    password: string,
    from: string
  }
}
```

---

## Schritt 3: Fertig

```
Container: flex flex-col items-center text-center py-4

Animations-Kreis:
  h-24 w-24 rounded-full bg-green-100
  animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)

Check-Icon: h-12 w-12 text-green-600
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) delay 0.15s

Titel: text-2xl font-bold text-slate-900 "Alles bereit! 🎉"
Text: text-base text-slate-600 max-w-xs
Tipp: text-sm text-slate-400

Loading-Spinner (Redirect läuft): text-sm text-slate-500

@keyframes scaleIn:
  from: opacity: 0; transform: scale(0.5)
  to:   opacity: 1; transform: scale(1)
```

---

## Neue API-Endpunkte (Scope AUT-21)

| Route | Methode | Zweck |
|---|---|---|
| `/api/auth/register` | POST | Tenant + User atomar anlegen (mit Land) |
| `/api/tenant/profile` | GET | Firmenprofil lesen |
| `/api/tenant/profile` | PATCH | Firmenprofil aktualisieren |

---

## Neue Dateien

| Datei | Zweck |
|---|---|
| `src/app/[locale]/(auth)/register/page.tsx` | Registrierungsseite (updated) |
| `src/app/[locale]/onboarding/layout.tsx` | Onboarding-Layout (auth-guard) |
| `src/app/[locale]/onboarding/page.tsx` | Onboarding-Wizard (3 Schritte) |
| `src/app/api/auth/register/route.ts` | Register-API (updated, mit Land + zod) |
| `src/app/api/tenant/profile/route.ts` | Tenant-Profil-API (GET + PATCH) |

---

## Accessibility (WCAG 2.1 AA)

- Alle interaktiven Elemente: `min-h-[48px]` (Touch-Target ≥ 48px)
- Labels immer über dem Input, nie als Placeholder
- Fehler-Anzeige mit roter Border + rotem Text (kontraststark)
- Passwort-Toggle mit `aria-label`
- Fokus-Ring: `focus:ring-2 focus:ring-blue-500/20` auf allen Inputs
- Skip-Button explizit beschriftet ("Überspringen — später einrichten")
