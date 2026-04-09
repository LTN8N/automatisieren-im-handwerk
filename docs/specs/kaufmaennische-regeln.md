# Kaufmännische Regeln — Spezifikation

**Erstellt:** 2026-04-09  
**Autor:** CFO-Agent (AUT-16)  
**Status:** Finalisiert — verbindlich für AUT-11, AUT-13  
**Rechtsgrundlagen:** UStG §14, §14a; GoBD (BMF-Schreiben 2019); AO §146

---

## 1. USt-Berechnung

### 1.1 Steuersätze nach Land

| Land | Normalsatz | Ermäßigt | Steuerfrei | Bemerkung |
|------|-----------|----------|------------|-----------|
| DE   | 19 %      | 7 %      | 0 %        | Standard, §12 UStG |
| AT   | 20 %      | 10 %     | 0 %        | §10 öUStG |
| CH   | 8,1 %     | 2,6 %    | 0 %        | MWSTG ab 2024 |

**Wichtig:** Steuersätze werden NICHT im Code hartkodiert. Sie werden in einer konfigurierbaren Tabelle `UstSatz` gespeichert und per `tenantId` + `land` zugeordnet.

### 1.2 USt-Satz pro Position (Pflicht)

Jede Position (Angebot und Rechnung) MUSS einen eigenen `ustSatz` besitzen. Grund: Ein Handwerker kann in einer Rechnung sowohl Arbeitsleistung (19 %) als auch z.B. bestimmte Waren (7 %) abrechnen.

```
Position
+-- ustSatz: Float  // z.B. 19.0, 7.0, 0.0 — nie null
```

Der Gesamt-`ust` auf dem Dokument ist die Summe der positions-individuellen USt-Beträge, gruppiert nach Steuersatz (für den Ausweis im PDF).

### 1.3 Berechnungsregel (kaufmännisch gerundet)

```
gesamtpreis_netto = menge * einzelpreis                  // 2 Dezimalstellen, kaufmännisch runden
ust_betrag        = gesamtpreis_netto * (ustSatz / 100)  // 2 Dezimalstellen
gesamtpreis_brutto = gesamtpreis_netto + ust_betrag

Dokument:
netto  = SUM(position.gesamtpreis_netto)
ust    = SUM(position.ust_betrag)          // NIE: netto * ustSatz — wegen Rundungsdifferenzen
brutto = netto + ust
```

**Runden:** kaufmännisch auf 2 Dezimalstellen (half-up: 0,5 wird aufgerundet).  
**Verboten:** `brutto = netto * 1.19` — führt zu Centdifferenzen die GoBD-Prüfungen auslösen.

### 1.4 Ausweis getrennter Steuersätze

Wenn Positionen mit unterschiedlichen Steuersätzen vorliegen, MÜSSEN diese im PDF getrennt ausgewiesen werden:

```
Nettobetrag 19 % USt:   1.000,00 EUR
USt 19 %:                 190,00 EUR

Nettobetrag 7 % USt:      200,00 EUR  
USt 7 %:                   14,00 EUR

Gesamtnetto:            1.200,00 EUR
Gesamtust:                204,00 EUR
Brutto:                 1.404,00 EUR
```

---

## 2. Nummernkreise

### 2.1 Format

| Dokumenttyp | Format         | Beispiel        |
|-------------|----------------|-----------------|
| Angebot     | AG-YYYY-NNNN   | AG-2026-0001    |
| Rechnung    | RE-YYYY-NNNN   | RE-2026-0001    |

- `YYYY` = Kalenderjahr (4-stellig)
- `NNNN` = laufende Nummer, 4-stellig, führende Nullen, pro Jahr neu beginnend
- Nummernkreis ist **pro Tenant und pro Jahr** unabhängig
- Jährlicher Reset: Am 1.1. beginnt NNNN wieder bei 0001

### 2.2 Datenbankstruktur (neue Tabelle erforderlich)

```prisma
model Nummernkreis {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  typ         String   // "ANGEBOT" | "RECHNUNG"
  jahr        Int
  letzteNummer Int     @default(0) @map("letzte_nummer")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, typ, jahr])
  @@map("nummernkreise")
}
```

### 2.3 Vergabe-Algorithmus (Transaktionssicher)

```typescript
async function naechsteNummer(
  tenantId: string, 
  typ: "ANGEBOT" | "RECHNUNG"
): Promise<string> {
  const jahr = new Date().getFullYear()
  const prefix = typ === "ANGEBOT" ? "AG" : "RE"
  
  // Atomares Increment in einer Transaktion
  const result = await prisma.$transaction(async (tx) => {
    const kreis = await tx.nummernkreis.upsert({
      where: { tenantId_typ_jahr: { tenantId, typ, jahr } },
      create: { tenantId, typ, jahr, letzteNummer: 1 },
      update: { letzteNummer: { increment: 1 } },
    })
    return kreis.letzteNummer
  })
  
  return `${prefix}-${jahr}-${String(result).padStart(4, "0")}`
}
```

**Kritisch:** Nummernvergabe MUSS in einer Datenbanktransaktion erfolgen. Kein Application-Level-Locking. Keine Lücken erlaubt (GoBD §146 AO: lückenlose, zeitgerechte Buchführung).

### 2.4 Unveränderlichkeit der Nummer

Einmal vergebene Nummern dürfen **nicht geändert** werden. Bei Stornierung: Stornodokument mit eigener Nummer erstellen (z.B. `ST-2026-0001`), nicht die ursprüngliche Nummer löschen.

---

## 3. Pflichtangaben auf Rechnungen (UStG §14)

### 3.1 Vollständige Pflichtfelder-Liste

| # | Pflichtfeld | Quelle | Status im Schema |
|---|------------|--------|-----------------|
| 1 | Vollständiger Name des Rechnungsstellers | `Tenant.name` | ✅ vorhanden |
| 2 | Vollständige Anschrift des Rechnungsstellers | `Tenant.adresse` | ✅ vorhanden |
| 3 | Vollständiger Name des Leistungsempfängers | `Kunde.name` | ✅ vorhanden |
| 4 | Vollständige Anschrift des Leistungsempfängers | `Kunde.adresse` | ⚠️ optional, muss Pflicht werden |
| 5 | Steuernummer ODER USt-IdNr des Rechnungsstellers | `Tenant.steuernummer` / `Tenant.ustId` | ✅ vorhanden (mind. 1 Pflicht) |
| 6 | Ausstellungsdatum | `Rechnung.createdAt` | ✅ vorhanden |
| 7 | Fortlaufende Rechnungsnummer | `Rechnung.nummer` | ✅ vorhanden |
| 8 | Menge und Art der Leistung | `RechnungPosition.beschreibung`, `.menge`, `.einheit` | ✅ vorhanden |
| 9 | **Zeitpunkt/Zeitraum der Leistung** | fehlt | ❌ FEHLT — Schema-Änderung nötig |
| 10 | Nettobetrag nach Steuersätzen | `Rechnung.netto` + Gruppierung | ⚠️ Gruppierung fehlt |
| 11 | Steuersatz und USt-Betrag pro Steuersatz | `RechnungPosition.ustSatz` | ❌ FEHLT — Schema-Änderung nötig |
| 12 | Bruttobetrag | `Rechnung.brutto` | ✅ vorhanden |
| 13 | Im Voraus vereinbarte Entgeltsminderungen (Skonto) | fehlt | ❌ FEHLT |
| 14 | Zahlungsbedingungen (Fälligkeit) | `Rechnung.zahlungsziel` | ✅ vorhanden |

### 3.2 Erforderliche Schema-Änderungen

#### 3.2.1 RechnungPosition: USt-Satz pro Position

```prisma
model RechnungPosition {
  // ... bestehende Felder ...
  ustSatz    Float   @default(19.0) @map("ust_satz")  // NEU — Pflicht
  ustBetrag  Float   @default(0)    @map("ust_betrag") // NEU — berechnet
}
```

#### 3.2.2 AngebotPosition: USt-Satz pro Position

```prisma
model AngebotPosition {
  // ... bestehende Felder ...
  ustSatz    Float   @default(19.0) @map("ust_satz")  // NEU
  ustBetrag  Float   @default(0)    @map("ust_betrag") // NEU — berechnet
}
```

#### 3.2.3 Rechnung: Leistungszeitraum (UStG §14 Abs. 4 Nr. 6)

```prisma
model Rechnung {
  // ... bestehende Felder ...
  leistungVon  DateTime? @map("leistung_von")  // NEU — Start Leistungszeitraum
  leistungBis  DateTime? @map("leistung_bis")  // NEU — Ende Leistungszeitraum
  // Wenn einmaliger Termin: nur leistungVon setzen, leistungBis = null
}
```

**Hinweis:** Der Leistungszeitraum darf dem Rechnungsdatum entsprechen (z.B. "Leistungsdatum: 08.04.2026"), muss aber explizit angegeben sein. "Datum der Rechnung = Leistungsdatum" ist **nicht** automatisch gültig ohne Ausweis.

#### 3.2.4 Rechnung: GoBD-Unveränderlichkeitsflag

```prisma
model Rechnung {
  // ... bestehende Felder ...
  gesperrt    Boolean  @default(false)  // NEU — true sobald Status != ENTWURF
  // Gesperrte Rechnungen dürfen NUR storniert, nicht editiert werden
}
```

#### 3.2.5 Tenant: Standard-Zahlungsziel

```prisma
model Tenant {
  // ... bestehende Felder ...
  zahlungszielTage  Int  @default(14) @map("zahlungsziel_tage")  // NEU
  // Beim Erstellen einer Rechnung: zahlungsziel = createdAt + zahlungszielTage
}
```

#### 3.2.6 Kunde: USt-IdNr für B2B-Rechnungen

```prisma
model Kunde {
  // ... bestehende Felder ...
  ustId        String?  @map("ust_id")        // NEU — für reverse-charge etc.
  steuernummer String?  // NEU — optional für Gewerbebetriebe
}
```

---

## 4. Pflichtangaben auf Angeboten

| Pflichtfeld | Quelle | Status |
|-------------|--------|--------|
| Firmenname + Adresse Anbieter | `Tenant` | ✅ |
| Kundenname + Adresse | `Kunde` | ⚠️ Adresse optional → Pflicht |
| Angebotsnummer | `Angebot.nummer` | ✅ |
| Angebotsdatum | `Angebot.createdAt` | ✅ |
| **Gültigkeitsdatum** | `Angebot.gueltigBis` | ⚠️ optional → Standard 30 Tage |
| Leistungsbeschreibung | `AngebotPosition` | ✅ |
| Preise (netto, USt, brutto) | `Angebot` | ✅ |
| Steuersatz | fehlt | ❌ → pro Position |
| Zahlungsbedingungen | fehlt | ❌ → optional, aber empfohlen |

### 4.1 Standard-Gültigkeitsdauer

```typescript
// Beim Erstellen eines Angebots ohne explizites gueltigBis:
gueltigBis = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
```

---

## 5. Zahlungsbedingungen

### 5.1 Standardkonfiguration

| Parameter | Standard | Konfigurierbar |
|-----------|----------|---------------|
| Zahlungsziel | 14 Tage | Ja, pro Tenant (`Tenant.zahlungszielTage`) |
| Skonto | keiner | Nein (Phase 1 — kann in Phase 2 ergänzt werden) |
| Mahngebühren | keine | Nein (Phase 1) |

### 5.2 Zahlungsziel-Text im PDF

```
Bitte überweisen Sie den Betrag von {brutto} EUR bis zum {zahlungsziel} auf untenstehendes Konto.
```

### 5.3 Mahnlogik (Statusübergänge)

```
Rechnung erstellt → Status: ENTWURF
Rechnung gesendet → Status: GESENDET, zahlungsziel gesetzt
zahlungsziel + 1 Tag → Status: UEBERFAELLIG (automatisch per Cron-Job)
UEBERFAELLIG → Manuelle Mahnung → Status: MAHNUNG
Zahlung eingeht → Status: BEZAHLT, bezahltAm = now()
```

**Mahnfristen** (Phase 2, hier nur spezifiziert):
- 1. Mahnung: 14 Tage nach Fälligkeit
- 2. Mahnung: 28 Tage nach Fälligkeit  
- 3. Mahnung / Inkasso: 42 Tage nach Fälligkeit

---

## 6. GoBD-Compliance

### 6.1 Unveränderlichkeit gesendeter Dokumente

Ab dem Moment, in dem eine Rechnung den Status `GESENDET` erreicht:
- **Keine Bearbeitung** der Felder mehr möglich (HTTP 400 wenn versucht)
- **Nur Stornierung** erlaubt (eigene Stornorechnung mit negativen Beträgen)
- `gesperrt = true` in der Datenbank

Für Angebote gilt: Bearbeitung erlaubt bis Status `ANGENOMMEN`. Danach nur noch als neues Angebot oder Nachtrag.

### 6.2 Vollständiges Audit-Trail

Die bestehenden `*Historie` Tabellen sind korrekt strukturiert. Ergänzung:
- Jeder Speichervorgang erzeugt einen Historie-Eintrag
- KI-generierte Änderungen: `quelle = "ki"`, menschliche: `quelle = "manuell"` / `"voice"` / `"chat"`

### 6.3 Archivierungspflicht

Rechnungen und Angebote dürfen **nicht gelöscht** werden. Stattdessen:
- Soft-Delete via `archiviertAm DateTime?` Feld (nicht physisches DELETE)
- Aufbewahrungspflicht: 10 Jahre (UStG §14b)

```prisma
model Rechnung {
  // ...
  archiviertAm DateTime? @map("archiviert_am")  // NEU
}

model Angebot {
  // ...
  archiviertAm DateTime? @map("archiviert_am")  // NEU
}
```

---

## 7. Validierungsregeln (API-Ebene)

### 7.1 Beim Erstellen/Speichern einer Rechnung

```typescript
// Pflichtfelder-Prüfung vor dem Senden (nicht im ENTWURF)
function validateRechnungFuerVersand(rechnung: Rechnung): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!rechnung.tenant.steuernummer && !rechnung.tenant.ustId)
    errors.push({ field: "tenant.steuernummer", message: "Steuernummer oder USt-IdNr erforderlich" })
  
  if (!rechnung.tenant.adresse)
    errors.push({ field: "tenant.adresse", message: "Firmenadresse erforderlich" })
  
  if (!rechnung.kunde.adresse)
    errors.push({ field: "kunde.adresse", message: "Kundenadresse für Rechnungen erforderlich" })
  
  if (rechnung.positionen.length === 0)
    errors.push({ field: "positionen", message: "Mindestens eine Position erforderlich" })
  
  if (!rechnung.leistungVon)
    errors.push({ field: "leistungVon", message: "Leistungsdatum/-zeitraum erforderlich (UStG §14)" })
  
  if (rechnung.positionen.some(p => p.ustSatz === undefined || p.ustSatz === null))
    errors.push({ field: "positionen.ustSatz", message: "USt-Satz auf jeder Position erforderlich" })
  
  return errors
}
```

### 7.2 Berechnungsprüfung (immer beim Speichern)

```typescript
function validateBerechnung(doc: Angebot | Rechnung): boolean {
  const berechneteNetto = doc.positionen.reduce(
    (sum, p) => sum + p.gesamtpreis, 0
  )
  const berechneteUst = doc.positionen.reduce(
    (sum, p) => sum + p.ustBetrag, 0
  )
  
  // Toleranz: ±1 Cent wegen Float-Rundung
  return (
    Math.abs(doc.netto - berechneteNetto) < 0.01 &&
    Math.abs(doc.ust - berechneteUst) < 0.01 &&
    Math.abs(doc.brutto - (doc.netto + doc.ust)) < 0.01
  )
}
```

---

## 8. Zusammenfassung der Schema-Änderungen (für AUT-11/AUT-13)

| Änderung | Priorität | Begründung |
|----------|-----------|------------|
| `AngebotPosition.ustSatz` + `ustBetrag` | **Pflicht** | Mehrere Steuersätze pro Dokument |
| `RechnungPosition.ustSatz` + `ustBetrag` | **Pflicht** | UStG §14 Nr. 10 |
| `Rechnung.leistungVon` + `leistungBis` | **Pflicht** | UStG §14 Abs. 4 Nr. 6 |
| `Rechnung.gesperrt` | **Pflicht** | GoBD Unveränderlichkeit |
| `Rechnung.archiviertAm` | **Pflicht** | GoBD Archivierungspflicht |
| `Angebot.archiviertAm` | **Pflicht** | GoBD Archivierungspflicht |
| `Tenant.zahlungszielTage` | **Pflicht** | Konfigurierbare Zahlungsbedingungen |
| `Nummernkreis` Tabelle | **Pflicht** | Lückenlose Nummernvergabe (GoBD) |
| `Kunde.ustId` + `Kunde.steuernummer` | Empfohlen | B2B-Rechnungen, Reverse-Charge |

---

## 9. Nicht im Scope (Phase 1)

- Skonto (prozentuale Abzüge bei früher Zahlung)
- Reverse-Charge-Verfahren (§13b UStG) — nur für Subunternehmer relevant
- Innergemeinschaftliche Lieferungen (§4 Nr. 1b UStG)
- Kleinunternehmerregelung (§19 UStG) — gesondertes Feature, spätere Phase
- AT/CH spezifische Besonderheiten (nur DE Phase 1)
