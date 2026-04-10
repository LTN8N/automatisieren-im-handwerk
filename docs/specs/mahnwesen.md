# Mahnwesen-Spezifikation — Automatische Zahlungserinnerungen

**Erstellt:** 2026-04-10  
**Autor:** CFO-Agent (AUT-31)  
**Status:** Finalisiert — verbindlich für Phase-2-Implementierung  
**Rechtsgrundlagen:** BGB §286 (Verzug), §288 (Verzugszinsen), §187 (Fristenberechnung); GoBD (BMF-Schreiben 2019)

---

## 1. Mahnstufen und Fristen

### 1.1 Übersicht

| Stufe | Bezeichnung | Auslöser (ab Fälligkeit) | Gebühren | Ton |
|-------|-------------|--------------------------|----------|-----|
| 0 | Zahlungserinnerung | +3 Tage | keine | Freundlich |
| 1 | 1. Mahnung | +14 Tage | keine | Sachlich |
| 2 | 2. Mahnung | +28 Tage | 5,00 EUR Mahngebühr | Bestimmt |
| 3 | Inkasso-Übergabe | +42 Tage | 40,00 EUR Schadenspauschale + Verzugszinsen | Formal/Rechtlich |

**Fristenberechnung:** Alle Fristen zählen ab dem Tag der **Fälligkeit** (= `Rechnung.zahlungsziel`), nicht ab Rechnungsdatum. BGB §187 Abs. 1: Der Fälligkeitstag selbst zählt nicht mit.

**Kalenderfreie Fristen:** Mahnfristen laufen auch an Wochenenden und Feiertagen. Es erfolgt KEINE Verschiebung auf den nächsten Werktag (kaufmännische Praxis, kein gesetzliches Erfordernis).

### 1.2 Stufe 0 — Zahlungserinnerung (Fälligkeit + 3 Tage)

**Zweck:** Freundliche Erinnerung, bevor der Schuldner formal in Verzug gerät.  
**Rechtsstatus:** Keine Mahnung im rechtlichen Sinn. Kein Verzugseintritt durch diese Erinnerung.  
**Gebühren:** Keine.  
**Ton:** Freundlich und hilfsbereit — Zahlungserinnerungen führen seltener zu Kundenverlusten.

```
Betreff: Erinnerung: Offene Rechnung {nummer} — Fälligkeit {zahlungsziel}

Guten Tag {kundenname},

wir möchten Sie freundlich daran erinnern, dass unsere Rechnung {nummer}
über {brutto} EUR am {zahlungsziel} fällig war.

Falls die Zahlung bereits veranlasst wurde, betrachten Sie diese Nachricht 
bitte als gegenstandslos.

Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen
{tenantname}
```

### 1.3 Stufe 1 — Erste Mahnung (Fälligkeit + 14 Tage)

**Zweck:** Formelle erste Mahnung. Ab Zugang dieser Mahnung tritt der Schuldner in Verzug (BGB §286 Abs. 1), sofern nicht bereits durch Fristablauf Verzug eingetreten ist.  
**Rechtsstatus:** Mahnung im Sinne des BGB §286 Abs. 1.  
**Gebühren:** Keine (erste Mahnung üblicherweise kostenlos).  
**Frist bis nächste Stufe:** 14 Tage ab dieser Mahnung (= Fälligkeit + 28 Tage).

> **Hinweis:** Bei Rechnungen mit Zahlungsziel (= §286 Abs. 2 Nr. 1) tritt Verzug automatisch mit Fristablauf ein — ohne Mahnung. Die erste Mahnung ist dennoch empfohlen, da viele Schuldner bei direkter Mahnung ohne Erinnerung verärgert reagieren.

```
Betreff: 1. Mahnung — Rechnung {nummer} vom {rechnungsdatum}

Sehr geehrte/r {kundenname},

leider mussten wir feststellen, dass unsere Rechnung {nummer} 
über {brutto} EUR vom {rechnungsdatum} trotz Fälligkeit am {zahlungsziel} 
noch nicht beglichen wurde.

Wir bitten Sie, den ausstehenden Betrag von {brutto} EUR bis zum 
{neue_frist_datum} auf unser Konto zu überweisen:

  IBAN: {iban}
  Verwendungszweck: {nummer}

Sollte die Zahlung bereits unterwegs sein, betrachten Sie diese Mahnung 
bitte als gegenstandslos.

Mit freundlichen Grüßen
{tenantname}
```

### 1.4 Stufe 2 — Zweite Mahnung mit Mahngebühr (Fälligkeit + 28 Tage)

**Zweck:** Letzte Mahnung vor Inkasso-Übergabe. Schuldner ist seit mind. 14 Tagen im Verzug.  
**Rechtsstatus:** Mahnung im Sinne BGB §286. Verzugszinsen laufen bereits.  
**Mahngebühr:** 5,00 EUR pauschal (zulässig nach BGB §280 als Verzugsschaden; nicht Teil der 40-EUR-Schadenspauschale).  
**Verzugszinsen:** werden berechnet und ausgewiesen (siehe Abschnitt 2).  
**Frist bis Inkasso:** 14 Tage ab dieser Mahnung (= Fälligkeit + 42 Tage).

> **Wichtig zur Mahngebühr:** Die 5,00 EUR Mahngebühr ist KEIN fester Gesetzesanspruch, sondern eine im B2B-Bereich übliche und gerichtlich akzeptierte Aufwandspauschale. Der Tenant kann diesen Betrag konfigurieren (Empfehlung: 2,50–10,00 EUR).

```
Betreff: 2. Mahnung — Rechnung {nummer} — Letzte Zahlungsaufforderung

Sehr geehrte/r {kundenname},

trotz unserer ersten Zahlungserinnerung ist die Zahlung unserer Rechnung 
{nummer} über {brutto} EUR bisher nicht eingegangen.

Wir fordern Sie hiermit letztmalig auf, den folgenden Gesamtbetrag bis 
zum {inkasso_datum} zu begleichen:

  Rechnungsbetrag:    {brutto} EUR
  Mahngebühr:           5,00 EUR
  Verzugszinsen:       {zinsen} EUR
  ─────────────────────────────────
  Gesamtbetrag:       {gesamt} EUR

Sollte der Betrag bis {inkasso_datum} nicht eingehen, sehen wir uns 
gezwungen, die Forderung an ein Inkassounternehmen zu übergeben. 
Die dabei entstehenden Kosten gehen zu Ihren Lasten.

Mit freundlichen Grüßen
{tenantname}
```

### 1.5 Stufe 3 — Inkasso-Übergabe (Fälligkeit + 42 Tage)

**Zweck:** Dokumentation der Inkasso-Übergabe und Benachrichtigung des Schuldners.  
**Rechtsstatus:** Schuldner schuldet nun zusätzlich die gesetzliche Schadenspauschale (BGB §288 Abs. 5).  
**Schadenspauschale:** 40,00 EUR (gesetzlich, BGB §288 Abs. 5, nur B2B — bei Verbrauchern: nicht anwendbar).  
**Verzugszinsen:** Laufen weiter bis Zahlungseingang.  
**System-Aktion:** Status wechselt zu `INKASSO`, Telegram-Notification an Tenant.

> **B2B vs. B2C:** Die 40-EUR-Schadenspauschale gilt **nur** für Rechtsgeschäfte zwischen Unternehmern (B2B). Handwerker rechnen überwiegend B2B ab. Falls der Kunde Privatperson ist (`Kunde.istPrivatkunde = true`), entfällt diese Pauschale.

---

## 2. Rechtliche Grundlagen

### 2.1 Verzugseintritt (BGB §286)

Verzug tritt ein, wenn:
1. **Automatisch** nach Ablauf des Zahlungsziels (§286 Abs. 2 Nr. 1) — wenn das Zahlungsziel nach dem Kalender bestimmt ist (z.B. "zahlbar bis 30.04.2026"). Dies ist unser Standardfall.
2. **Durch Mahnung** (§286 Abs. 1) — wenn kein Zahlungsziel gesetzt wurde.

**Für diese Plattform gilt:** Da `Rechnung.zahlungsziel` immer gesetzt ist, tritt Verzug automatisch am Tag nach dem Zahlungsziel ein (Tag +1). Eine separate Mahnung zur Verzugsbegründung ist nicht erforderlich.

### 2.2 Verzugszinsen (BGB §288)

```
Verzugszinssatz (B2B) = Basiszinssatz + 9 Prozentpunkte  (§288 Abs. 2)
Verzugszinssatz (B2C) = Basiszinssatz + 5 Prozentpunkte  (§288 Abs. 1)
```

**Basiszinssatz (EZB):** Wird halbjährlich von der Deutschen Bundesbank festgestellt (1. Jan und 1. Jul). Er ist **konfigurierbar** in der Datenbank — NIE hartkodiert.

**Berechnung Verzugszinsen:**

```
Verzugstage = Heute - (zahlungsziel + 1 Tag)  // BGB §187: Fälligkeitstag zählt nicht
Zinsbetrag  = offenerBetrag × (zinssatz / 100) / 365 × Verzugstage
              [kaufmännisch auf 2 Dezimalstellen gerundet]
```

**Beispielrechnung:**
```
Offener Betrag:     1.000,00 EUR
Basiszinssatz:         2,62 %  (01.01.2026 — hypothetisch)
Zinssatz B2B:         11,62 %
Verzugstage:             28
Zinsbetrag:    1000 × 0,1162 / 365 × 28 = 8,91 EUR
```

### 2.3 Schadenspauschale (BGB §288 Abs. 5)

- **Betrag:** 40,00 EUR (gesetzlich fest, nicht anpassbar)
- **Gilt nur für B2B** (§288 Abs. 5 gilt nicht für Verbraucher nach §13 BGB)
- **Einmalig pro Verzugsfall**, nicht pro Mahnung
- Wird auf die Haupt-Schadenersatzforderung angerechnet, wenn tatsächlicher Schaden geltend gemacht wird

### 2.4 Konfigurierbare Parameter pro Tenant

| Parameter | Standard | Konfigurierbar |
|-----------|----------|---------------|
| Mahngebühr Stufe 2 | 5,00 EUR | Ja (0–25 EUR) |
| Mahnfrist Stufe 0 | 3 Tage | Nein |
| Mahnfrist Stufe 1 | 14 Tage | Ja (7–21 Tage) |
| Mahnfrist Stufe 2 | 28 Tage | Ja (14–35 Tage) |
| Mahnfrist Stufe 3 | 42 Tage | Ja (28–60 Tage) |
| Verzugszinstyp | B2B | Ja (B2B/B2C per Tenant) |

---

## 3. Datenbankschema

### 3.1 Erweiterung RechnungStatus Enum

```prisma
enum RechnungStatus {
  ENTWURF
  GESENDET
  BEZAHLT
  UEBERFAELLIG
  ERINNERUNG      // NEU: Zahlungserinnerung gesendet (Stufe 0)
  MAHNUNG_1       // NEU: 1. Mahnung gesendet
  MAHNUNG_2       // NEU: 2. Mahnung gesendet  
  INKASSO         // NEU: An Inkasso übergeben (Stufe 3)
  STORNIERT       // NEU: Rechnung storniert
}
```

> **Ersetzt:** Der bisherige Status `MAHNUNG` wird in `MAHNUNG_1` und `MAHNUNG_2` aufgeteilt, um Mahnstufen lückenlos nachvollziehbar zu machen (GoBD).

### 3.2 Neues Modell: Mahnung

```prisma
model Mahnung {
  id              String        @id @default(cuid())
  tenantId        String        @map("tenant_id")
  rechnungId      String        @map("rechnung_id")
  mahnstufe       Int           // 0 = Erinnerung, 1 = 1. Mahnung, 2 = 2. Mahnung, 3 = Inkasso
  gesendetAm      DateTime      @map("gesendet_am")
  fristBis        DateTime?     @map("frist_bis")       // Zahlungsfrist für diese Mahnung
  offenerBetrag   Float         @map("offener_betrag")  // Rechnungsbetrag zum Sendezeitpunkt
  mahngebuehr     Float         @default(0) @map("mahngebuehr")
  verzugszinsen   Float         @default(0) @map("verzugszinsen")
  verzugstage     Int           @default(0) @map("verzugstage")
  schadenspauschale Float       @default(0) @map("schadenspauschale")  // 40 EUR bei Inkasso B2B
  gesamtbetrag    Float         @map("gesamtbetrag")    // offenerBetrag + Gebühren + Zinsen
  emailGesendetAn String?       @map("email_gesendet_an")
  emailMessageId  String?       @map("email_message_id")  // für Delivery-Tracking
  kanalEmail      Boolean       @default(true) @map("kanal_email")
  kanalTelegram   Boolean       @default(false) @map("kanal_telegram")
  notizen         String?       // interne Notiz (z.B. "Kunde angerufen")
  storniert       Boolean       @default(false) // GoBD: nie löschen, nur stornieren
  stornoGrund     String?       @map("storno_grund")
  createdAt       DateTime      @default(now()) @map("created_at")
  // KEIN updatedAt — Mahnungen sind unveränderlich nach Versand (GoBD)

  tenant          Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rechnung        Rechnung      @relation(fields: [rechnungId], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([rechnungId])
  @@index([mahnstufe])
  @@map("mahnungen")
}
```

### 3.3 Erweiterung Modell: Rechnung

```prisma
model Rechnung {
  // ... bestehende Felder (aus kaufmaennische-regeln.md) ...
  
  // NEU: Mahnwesen
  mahnstufe         Int       @default(0) @map("mahnstufe")        // aktuelle Mahnstufe (0-3)
  naechsteMahnung   DateTime? @map("naechste_mahnung")             // wann läuft Cron-Job nächstes Mal?
  mahnungGesperrt   Boolean   @default(false) @map("mahnung_gesperrt") // manuell pausiert
  inkassoDatum      DateTime? @map("inkasso_datum")                // tatsächlicher Übergabezeitpunkt

  mahnungen         Mahnung[]
}
```

### 3.4 Neues Modell: MahnKonfiguration (pro Tenant)

```prisma
model MahnKonfiguration {
  id                    String   @id @default(cuid())
  tenantId              String   @unique @map("tenant_id")
  
  // Fristen (in Tagen ab Fälligkeit)
  erinnerungNachTagen   Int      @default(3)  @map("erinnerung_nach_tagen")
  mahnung1NachTagen     Int      @default(14) @map("mahnung1_nach_tagen")
  mahnung2NachTagen     Int      @default(28) @map("mahnung2_nach_tagen")
  inkassoNachTagen      Int      @default(42) @map("inkasso_nach_tagen")
  
  // Gebühren
  mahngebuehrStufe2     Float    @default(5.00) @map("mahngebuehr_stufe2")
  
  // Verzugszinsen
  verzugszinsTyp        String   @default("B2B") @map("verzugszins_typ")  // "B2B" | "B2C"
  
  // Automatisierung
  autoErinnerung        Boolean  @default(true)  @map("auto_erinnerung")   // Stufe 0 auto?
  autoMahnung1          Boolean  @default(false) @map("auto_mahnung1")     // Stufe 1 auto?
  autoMahnung2          Boolean  @default(false) @map("auto_mahnung2")     // Stufe 2 auto?
  autoInkasso           Boolean  @default(false) @map("auto_inkasso")      // Inkasso auto?
  
  // Benachrichtigungen
  telegramBeiMahnung    Boolean  @default(true)  @map("telegram_bei_mahnung")
  
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  tenant                Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@map("mahn_konfigurationen")
}
```

### 3.5 Neues Modell: Basiszinssatz

```prisma
model Basiszinssatz {
  id          String   @id @default(cuid())
  gueltigAb   DateTime @map("gueltig_ab")   // immer 01.01. oder 01.07.
  satz        Float                          // z.B. 2.62 (in Prozent)
  quelle      String   @default("Bundesbank") // Datenquelle
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([gueltigAb])
  @@map("basiszinssaetze")
}
```

**Ermittlung des aktuellen Basiszinssatzes:**
```typescript
async function aktuellerBasiszinssatz(): Promise<number> {
  const eintrag = await prisma.basiszinssatz.findFirst({
    where: { gueltigAb: { lte: new Date() } },
    orderBy: { gueltigAb: 'desc' }
  })
  if (!eintrag) throw new Error("Kein Basiszinssatz konfiguriert")
  return eintrag.satz
}
```

---

## 4. Automatisierung

### 4.1 Cron-Job: Mahnläufer

**Ausführung:** Täglich um 08:00 Uhr (Europe/Berlin)  
**Cron-Ausdruck:** `0 8 * * *`  
**Zweck:** Prüft alle überfälligen Rechnungen und sendet fällige Mahnungen.

```typescript
async function mahnlaeufer(): Promise<void> {
  const heute = new Date()
  heute.setHours(0, 0, 0, 0) // Tagesbeginn

  // Alle Rechnungen die fällig, nicht bezahlt und nicht gesperrt sind
  const ueberfaelligeRechnungen = await prisma.rechnung.findMany({
    where: {
      status: { notIn: ['ENTWURF', 'BEZAHLT', 'STORNIERT', 'INKASSO'] },
      zahlungsziel: { lt: heute },
      mahnungGesperrt: false,
    },
    include: {
      tenant: { include: { mahnKonfiguration: true } },
      mahnungen: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  })

  for (const rechnung of ueberfaelligeRechnungen) {
    const config = rechnung.tenant.mahnKonfiguration
    const naechsteStufe = berechneMahnstufeFaelligkeit(rechnung, config, heute)
    
    if (naechsteStufe !== null) {
      await mahneRechnung(rechnung, naechsteStufe)
    }
  }
}

function berechneMahnstufeFaelligkeit(
  rechnung: Rechnung,
  config: MahnKonfiguration,
  heute: Date
): number | null {
  const faelligkeitstag = new Date(rechnung.zahlungsziel!)
  const tageSeitFaelligkeit = Math.floor(
    (heute.getTime() - faelligkeitstag.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Ermittle welche Stufe als nächste fällig wäre
  const stufe = rechnung.mahnstufe // aktuelle Stufe
  
  if (stufe === 0 && tageSeitFaelligkeit >= config.erinnerungNachTagen && config.autoErinnerung) return 0
  if (stufe <= 0 && tageSeitFaelligkeit >= config.mahnung1NachTagen && config.autoMahnung1) return 1
  if (stufe <= 1 && tageSeitFaelligkeit >= config.mahnung2NachTagen && config.autoMahnung2) return 2
  if (stufe <= 2 && tageSeitFaelligkeit >= config.inkassoNachTagen && config.autoInkasso) return 3
  
  return null // keine Mahnaction fällig
}
```

### 4.2 Mahnung erstellen und senden

```typescript
async function mahneRechnung(
  rechnung: RechnungMitRelationen,
  stufe: number
): Promise<void> {
  const config = rechnung.tenant.mahnKonfiguration!
  const basiszins = await aktuellerBasiszinssatz()
  const zinssatz = config.verzugszinsTyp === 'B2B' ? basiszins + 9 : basiszins + 5
  
  const faelligkeitstag = new Date(rechnung.zahlungsziel!)
  const heute = new Date()
  // BGB §187 Abs. 1: Fälligkeitstag zählt nicht mit
  const verzugstage = Math.max(0, Math.floor(
    (heute.getTime() - faelligkeitstag.getTime()) / (1000 * 60 * 60 * 24)
  ))
  
  const verzugszinsen = rundeKaufmaennisch(
    rechnung.brutto * (zinssatz / 100) / 365 * verzugstage
  )
  const mahngebuehr = stufe === 2 ? config.mahngebuehrStufe2 : 0
  const schadenspauschale = stufe === 3 && config.verzugszinsTyp === 'B2B' ? 40.00 : 0
  const gesamtbetrag = rundeKaufmaennisch(
    rechnung.brutto + mahngebuehr + verzugszinsen + schadenspauschale
  )
  
  // Frist für diese Mahnung berechnen
  const naechsteFristTage = [null, 14, 14, null][stufe] // Tage bis nächste Stufe
  const fristBis = naechsteFristTage 
    ? new Date(heute.getTime() + naechsteFristTage * 24 * 60 * 60 * 1000)
    : null
  
  // Transaktion: Mahnung speichern + Rechnung updaten
  await prisma.$transaction(async (tx) => {
    // Mahnung anlegen (unveränderlich)
    await tx.mahnung.create({
      data: {
        tenantId: rechnung.tenantId,
        rechnungId: rechnung.id,
        mahnstufe: stufe,
        gesendetAm: heute,
        fristBis,
        offenerBetrag: rechnung.brutto,
        mahngebuehr,
        verzugszinsen,
        verzugstage,
        schadenspauschale,
        gesamtbetrag,
        emailGesendetAn: rechnung.kunde.email ?? undefined,
        kanalEmail: !!rechnung.kunde.email,
        kanalTelegram: config.telegramBeiMahnung,
      }
    })
    
    // Rechnungsstatus aktualisieren
    const neuerStatus: RechnungStatus = [
      'ERINNERUNG', 'MAHNUNG_1', 'MAHNUNG_2', 'INKASSO'
    ][stufe] as RechnungStatus
    
    await tx.rechnung.update({
      where: { id: rechnung.id },
      data: {
        status: neuerStatus,
        mahnstufe: stufe,
        inkassoDatum: stufe === 3 ? heute : undefined,
      }
    })
  })
  
  // E-Mail senden (außerhalb der Transaktion)
  if (rechnung.kunde.email) {
    await sendeMailMahnung(rechnung, stufe, { verzugszinsen, mahngebuehr, gesamtbetrag, fristBis })
  }
  
  // Telegram-Benachrichtigung
  if (config.telegramBeiMahnung) {
    await sendeTelegramMahnung(rechnung, stufe, gesamtbetrag)
  }
}
```

### 4.3 E-Mail-Templates

**Template-Variablen (alle Templates):**

| Variable | Quelle |
|----------|--------|
| `{nummer}` | `Rechnung.nummer` |
| `{rechnungsdatum}` | `Rechnung.createdAt` (DD.MM.YYYY) |
| `{zahlungsziel}` | `Rechnung.zahlungsziel` (DD.MM.YYYY) |
| `{brutto}` | `Rechnung.brutto` (formatiert: 1.234,56 EUR) |
| `{kundenname}` | `Kunde.name` |
| `{tenantname}` | `Tenant.name` |
| `{iban}` | `Tenant.bankIban` (formatiert: DEXX XXXX ...) |
| `{zinsen}` | berechnete Verzugszinsen |
| `{mahngebuehr}` | Mahngebühr dieser Stufe |
| `{gesamtbetrag}` | Gesamtforderung |
| `{neue_frist_datum}` | fristBis (DD.MM.YYYY) |
| `{inkasso_datum}` | Inkasso-Übergabetermin |

**E-Mail-Betreffzeilen:**

```
Stufe 0: Zahlungserinnerung: Rechnung {nummer} vom {rechnungsdatum}
Stufe 1: 1. Mahnung: Rechnung {nummer} — offener Betrag {brutto} EUR  
Stufe 2: 2. Mahnung: Rechnung {nummer} — Letzte Zahlungsaufforderung
Stufe 3: Inkasso-Ankündigung: Rechnung {nummer}
```

**Pflichtangaben im Mahnschreiben (UStG/BGB):**
- Rechnungsnummer und -datum
- Fälligkeitsdatum der ursprünglichen Rechnung  
- Offener Betrag (Brutto der Rechnung)
- Neue Zahlungsfrist (außer bei Inkasso)
- Bankverbindung (IBAN, Verwendungszweck)
- Bei Stufe 2+: Aufschlüsselung Hauptforderung + Mahngebühr + Zinsen

### 4.4 Telegram-Notification (an Tenant)

Bei jeder gesendeten Mahnung erhält der Tenant eine Telegram-Nachricht:

```
🔔 Mahnung gesendet

Mahnstufe: {stufe_text}
Rechnung: {nummer}
Kunde: {kundenname}
Betrag: {brutto} EUR

Gesamtforderung: {gesamtbetrag} EUR
```

Bei Inkasso-Übergabe (Stufe 3):

```
⚠️ Inkasso-Übergabe erforderlich

Rechnung {nummer} ({kundenname}) ist seit {verzugstage} Tagen überfällig.
Gesamtforderung: {gesamtbetrag} EUR (inkl. 40,00 EUR Schadenspauschale)

Bitte übergeben Sie die Forderung manuell an Ihr Inkassounternehmen.
```

> **Hinweis:** Die automatische Übergabe an ein Inkasso-Unternehmen ist NICHT automatisiert. Der Tenant wird benachrichtigt und muss die Übergabe manuell vornehmen. Das System setzt den Status auf `INKASSO` und dokumentiert den Zeitpunkt.

---

## 5. GoBD-Compliance

### 5.1 Unveränderlichkeit der Mahnhistorie

Einmal gesendete Mahnungen dürfen **nicht gelöscht oder geändert** werden. GoBD (BMF-Schreiben 2019, Rz. 100-104): Änderungen an Buchungsbelegen sind unzulässig.

**Implementierung:**
- `Mahnung`-Modell hat **kein** `updatedAt`-Feld (kein Update-Pfad)
- API-Endpunkt für `PATCH /mahnungen/{id}` wird **nicht** implementiert
- Nur `DELETE`-Äquivalent: `storniert = true` mit `stornoGrund` (Soft-Storno)
- Stornierung erstellt einen gegensätzlichen Eintrag, löscht nie

### 5.2 Vollständiges Audit-Trail

Jede Mahnungsaktion wird in der `Mahnung`-Tabelle mit folgenden Pflichtfeldern protokolliert:
- `gesendetAm` — Zeitstempel der Mahnung
- `mahnstufe` — Welche Mahnstufe
- `offenerBetrag` — Betrag zum Sendezeitpunkt (historisch korrekt)
- `verzugstage` — Anzahl Verzugstage zum Sendezeitpunkt
- `emailGesendetAn` — An welche Adresse gesendet

### 5.3 Archivierungspflicht (10 Jahre)

```prisma
model Mahnung {
  // ... kein DELETE möglich ...
  // Mahnungen bleiben für mindestens 10 Jahre nach Erstellung in der DB
  // Archivierung: nur via archiviertAm-Flag, nie physisches DELETE
  archiviertAm DateTime? @map("archiviert_am")  // nach 10 Jahren gesetzt
}
```

**Aufbewahrungspflicht:** §147 AO: Belege 10 Jahre, Handelsbriefe (inkl. Mahnschreiben) 6 Jahre. Wir verwenden 10 Jahre als konservative Regel.

### 5.4 Zuordnung zu Buchungsbelegen

Jede `Mahnung` ist über `rechnungId` mit der Ursprungsrechnung verknüpft. Die Kette ist vollständig rekonstruierbar:

```
Auftrag → Angebot → Rechnung → Mahnhistorie (chronologisch)
```

---

## 6. API-Endpunkte (Phase 2)

### 6.1 Manuelle Mahnung senden

```
POST /api/rechnungen/{id}/mahnungen
Body: { stufe: 0|1|2|3, notizen?: string }
Auth: Tenant-Admin
```

**Validierung:**
- Rechnung muss Status `GESENDET`, `UEBERFAELLIG`, `ERINNERUNG`, `MAHNUNG_1`, `MAHNUNG_2` haben
- Nächste Stufe muss ≥ aktuelle Stufe sein (keine Rückstufung)
- Rechnung darf nicht `BEZAHLT`, `STORNIERT`, oder `INKASSO` sein

### 6.2 Mahnhistorie abrufen

```
GET /api/rechnungen/{id}/mahnungen
Response: Mahnung[] (chronologisch aufsteigend)
```

### 6.3 Mahnung sperren (pausieren)

```
PATCH /api/rechnungen/{id}
Body: { mahnungGesperrt: true, notizen?: "Kunde zahlt in Raten" }
```

### 6.4 Cron-Job manuell auslösen (Admin)

```
POST /api/admin/mahnlaeufer/run
Auth: System-Admin
Response: { verarbeitet: number, gesendet: number, fehler: string[] }
```

---

## 7. Statusübergänge (vollständig)

```
ENTWURF
  └─► GESENDET (bei Rechnungsversand)
        └─► UEBERFAELLIG (Cron: Tag nach zahlungsziel)
              ├─► ERINNERUNG (Cron: +3 Tage, oder manuell)
              │     └─► MAHNUNG_1 (Cron: +14 Tage, oder manuell)
              │           └─► MAHNUNG_2 (Cron: +28 Tage, oder manuell)
              │                 └─► INKASSO (Cron: +42 Tage, oder manuell)
              │
              └─► BEZAHLT (jederzeit — Zahlung eingetragen)

Jeder Status → STORNIERT (Stornorechnung erforderlich)
```

**Rückwärts-Übergänge:** Nicht erlaubt. Eine `MAHNUNG_2` kann nicht zu `MAHNUNG_1` zurückgesetzt werden.  
**BEZAHLT** ist von jedem Status außer `ENTWURF` und `STORNIERT` erreichbar.

---

## 8. Abgrenzung Phase 1 / Phase 2

| Feature | Phase 1 | Phase 2 (diese Spec) |
|---------|---------|----------------------|
| Rechnungsstatus `MAHNUNG` | ✅ (einfach) | — |
| Mehrere Mahnstufen | — | ✅ |
| Verzugszinsberechnung | — | ✅ |
| E-Mail-Templates je Stufe | — | ✅ |
| Cron-Job Mahnläufer | — | ✅ |
| Telegram-Notifications | — | ✅ |
| Inkasso-Dokumentation | — | ✅ |
| GoBD-konforme Mahnhistorie | — | ✅ |
| Schadenspauschale 40 EUR | — | ✅ |
| Basiszinssatz-Verwaltung | — | ✅ |

---

## 9. Nicht im Scope (Phase 2)

- Direkte API-Integration mit Inkasso-Dienstleistern (z.B. EOS, Creditreform)
- Gerichtliches Mahnverfahren (Mahnbescheid)
- Ratenzahlungsvereinbarungen (separates Feature Phase 3)
- Skonto-Anrechnung bei Frühzahlung
- AT/CH spezifische Mahnregeln (nur DE Phase 2)
- Automatischer SCHUFA-Eintrag (nicht zulässig ohne separate Einwilligung)

---

## 10. Referenzen

- BGB §286 — Verzug durch Mahnung
- BGB §288 — Verzugszinsen (Abs. 1: B2C, Abs. 2: B2B, Abs. 5: Schadenspauschale)
- BGB §187 — Fristenberechnung (Tag des Fristbeginns zählt nicht)
- §147 AO — Aufbewahrungspflichten (10 Jahre Belege)
- GoBD (BMF-Schreiben 2019) — Unveränderlichkeit, Vollständigkeit
- `docs/specs/kaufmaennische-regeln.md` — Basisregeln für Berechnungen
- `prisma/schema.prisma` — aktuelles Datenbankschema
