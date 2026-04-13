# i18n DACH — Steuer- und Rechnungsregeln für Deutschland, Österreich, Schweiz

**Erstellt:** 2026-04-12  
**Autor:** CFO-Agent (AUT-55)  
**Status:** Finale Analyse — Basis für Builder-Task i18n-Implementierung  
**Rechtsgrundlagen:** UStG DE §14/§14a · UStG AT §11 · MWSTG CH Art. 26 · GoBD · BAO AT · OR CH Art. 958f

---

## 1. Überblick: Unterschiede DE vs. AT vs. CH

| Merkmal | Deutschland (DE) | Österreich (AT) | Schweiz (CH) |
|---------|-----------------|-----------------|--------------|
| **Währung** | EUR | EUR | CHF |
| **MwSt Normal** | 19 % | 20 % | 8,1 % |
| **MwSt Ermäßigt** | 7 % | 10 % | 2,6 % |
| **MwSt Sondersatz** | — | 13 % (Kunst, Wein, Pflanzen) | 3,8 % (Beherbergung) |
| **MwSt Frei** | 0 % | 0 % | 0 % |
| **Steuernummer-Format** | `DE`+9 Ziffern (USt-IdNr) | `ATU`+8 Ziffern | `CHE-xxx.xxx.xxx MWST` |
| **Rechtsgrundlage** | UStG §14 | UStG AT §11 | MWSTG Art. 26 |
| **Buchführungsgesetz** | GoBD (BMF 2019) | BAO §131/132 | OR Art. 957ff |
| **Aufbewahrungspflicht** | 10 Jahre (§14b UStG) | 7 Jahre (BAO §132) | 10 Jahre (OR Art. 958f) |
| **Kleinbetragsgrenze** | 250 EUR | 400 EUR | kein Konzept (Folio-Grenze CHF 100) |
| **Kleinunternehmergrenze** | 22.000 EUR | 35.000 EUR | 100.000 CHF |
| **Sonderzahlungsträger** | SEPA | SEPA | QR-Rechnung (pflicht seit 2022) |

---

## 2. Pflichtangaben auf Rechnungen je Land

### 2.1 Deutschland (UStG §14 Abs. 4)

| # | Pflichtfeld | Anmerkung |
|---|------------|-----------|
| 1 | Vollständiger Name & Anschrift Rechnungssteller | |
| 2 | Vollständiger Name & Anschrift Leistungsempfänger | |
| 3 | Steuernummer **oder** USt-IdNr des Ausstellers | Mind. 1 Pflicht |
| 4 | Rechnungsdatum (Ausstellungsdatum) | |
| 5 | Fortlaufende eindeutige Rechnungsnummer | |
| 6 | Menge und Art der Lieferung/Leistung | |
| 7 | Zeitpunkt/Zeitraum der Leistung | Auch wenn = Rechnungsdatum: explizit angeben |
| 8 | Nettobetrag getrennt nach Steuersätzen | |
| 9 | Steuersatz und USt-Betrag pro Gruppe | |
| 10 | Steuerfrei: Hinweis mit Rechtsgrundlage | |
| 11 | Bruttobetrag | |
| 12 | Zahlungsbedingungen (bei vereinbarten Entgeltsminderungen) | |

**Kleinbetragsrechnung** (bis 250 EUR brutto, §33 UStDV): Nur Pflichtfelder 1, 3 (Steuernummer), 4, 6, 8+9 (Steuersatz + USt-Betrag oder Brutto + Steuersatz).

### 2.2 Österreich (UStG AT §11 Abs. 1)

| # | Pflichtfeld | Unterschied zu DE |
|---|------------|-------------------|
| 1 | Name & Adresse Rechnungsaussteller | Gleich |
| 2 | Name & Adresse Rechnungsempfänger | Gleich |
| 3 | **UID-Nummer** des Ausstellers (`ATU`+8 Ziffern) | DE: Steuernummer **oder** USt-IdNr; AT: UID-Nummer wenn vorhanden |
| 4 | Rechnungsdatum | Gleich |
| 5 | Fortlaufende Rechnungsnummer | Gleich |
| 6 | Menge und handelsübliche Bezeichnung der Leistung | Gleich |
| 7 | Tag/Zeitraum der Leistung | Gleich |
| 8 | Steuersatz oder Hinweis auf Steuerbefreiung | |
| 9 | Nettobetrag und USt-Betrag (oder Brutto + Steuersatz) | |
| 10 | **Bei B2B über 10.000 EUR: UID-Nummer des Empfängers** | Kein Äquivalent in DE Phase 1 |

**Kleinbetragsrechnung AT** (bis 400 EUR brutto): Name+Adresse Aussteller, Datum, Leistungsbeschreibung, Entgelt, Steuersatz.

**AT-Sondersatz 13 %** gilt für: Kunstgegenstände, Sammlerstücke, lebende Tiere, Pflanzen, Holz, Wein ab Hof, Sportveranstaltungen, Kinos, Zirkusse, Museen, bestimmte Beherbergungsleistungen (seit 2016).

### 2.3 Schweiz (MWSTG Art. 26)

| # | Pflichtfeld | Unterschied zu DE/AT |
|---|------------|----------------------|
| 1 | Name & Adresse Rechnungsaussteller | Gleich |
| 2 | Name & Adresse Rechnungsempfänger | Gleich |
| 3 | **MWST-Nummer** des Ausstellers (`CHE-xxx.xxx.xxx MWST`) | Eigenes Format |
| 4 | Rechnungsdatum | Gleich |
| 5 | **Laufende Nummer** (kein gesetzlich vorgeschriebenes Format) | Flexibler als DE/AT |
| 6 | Leistungsbeschreibung und Menge | Gleich |
| 7 | **Zeitraum oder Datum der Leistungserbringung** | Gleich |
| 8 | Angewandter Steuersatz | |
| 9 | Steuerbetrag (aufgeschlüsselt nach Steuersatz) | |
| 10 | **Währungsangabe** (CHF Pflicht bei CHF-Beträgen) | Besonders relevant |
| 11 | **QR-Rechnung**: Zahlungsinfos im QR-Code (IBAN, Referenznummer, Betrag) | Kein Äquivalent in DE/AT |

**Besonderheit QR-Rechnung CH:** Seit 30. September 2022 ist der Einzahlungsschein abgeschafft. Die QR-Rechnung (QR-Bill) mit Zahlteil ist der Standard für strukturierte Zahlungen in der Schweiz. Enthält IBAN des Empfängers, Betrag, Währung, QR-Referenznummer und Zusatzinformationen im maschinenlesbaren QR-Code (ISO 20022).

---

## 3. Steuerlogik-Unterschiede

### 3.1 Steuersätze — vollständige Tabelle

| Land | Satztyp | Satz | Gültig für (Beispiele) |
|------|---------|------|------------------------|
| DE | Normal | 19 % | Allgemein, Dienstleistungen, Materialien |
| DE | Ermäßigt | 7 % | Lebensmittel, Bücher, ÖPNV, bestimmte Kulturleistungen |
| DE | Steuerfrei | 0 % | Exports, bestimmte Heilberufe |
| AT | Normal | 20 % | Allgemein |
| AT | Ermäßigt | 10 % | Lebensmittel, Bücher, Wohnungsmiete, Medikamente, Personentransport |
| AT | Sondersatz | 13 % | Kunst, Wein ab Hof, Pflanzen, Zoos, Sportveranstaltungen, Kinos |
| AT | Steuerfrei | 0 % | Exports, Heilberufe |
| CH | Normal | 8,1 % | Allgemein (ab 01.01.2024) |
| CH | Ermäßigt | 2,6 % | Lebensmittel, Bücher, Zeitungen, Medikamente, Wasser |
| CH | Beherbergung | 3,8 % | Hotelübernachtungen, Campingplätze |
| CH | Steuerfrei | 0 % | Exports, Gesundheitsleistungen |

**Historischer Hinweis CH:** Bis 31.12.2023 galten 7,7 % / 2,5 % / 3,7 %. Die Erhöhung ab 2024 dient der AHV-Finanzierung. Der Code muss historische Sätze für ältere Rechnungen vorhalten können.

### 3.2 Berechnungsregeln — Unterschiede

Alle drei Länder folgen demselben Grundprinzip (netto × Satz = USt; brutto = netto + USt). Keine abweichenden Rundungsregeln erforderlich.

**CH-Besonderheit: Saldosteuersatzmethode** (optional für Kleinunternehmen):
- Vereinfachtes Verfahren: MwSt wird als Prozentsatz des Bruttoumsatzes berechnet (branchenabhängig)
- Nicht im Scope Phase 1 — Handwerker mit regulärer Abrechnung nutzen die Standard-Methode

### 3.3 Kleinunternehmerregelung

| Land | Grenze | Regelung |
|------|--------|----------|
| DE | 22.000 EUR p.a. (ab 2025: 25.000 EUR) | Kein USt-Ausweis, Hinweis "gem. §19 UStG" auf Rechnung |
| AT | 35.000 EUR p.a. | Kein MwSt-Ausweis, Hinweis "gem. §6 Abs. 1 Z 27 UStG" |
| CH | 100.000 CHF p.a. | Kein MWST-Ausweis, keine MWST-Registrierung |

Implementierung: `Tenant.kleinunternehmer: boolean` — wenn true, kein USt-Ausweis, Hinweistext auf Rechnung.

---

## 4. Steuernummer-Formate

### 4.1 Validierungsregeln

| Land | Typ | Format | Regex-Muster | Beispiel |
|------|-----|--------|--------------|---------|
| DE | Steuernummer | je nach Bundesland, 10–13 Ziffern | `^\d{10,13}$` | `12345678901` |
| DE | USt-IdNr | DE + 9 Ziffern | `^DE\d{9}$` | `DE123456789` |
| AT | UID-Nummer | ATU + 8 Ziffern | `^ATU\d{8}$` | `ATU12345678` |
| CH | MWST-Nummer | CHE + 9 Ziffern + MWST | `^CHE-\d{3}\.\d{3}\.\d{3} MWST$` | `CHE-123.456.789 MWST` |
| CH | UID (ohne MWST) | CHE + 9 Ziffern | `^CHE-\d{3}\.\d{3}\.\d{3}$` | `CHE-123.456.789` |

**Wichtig:** DE-Steuernummern haben kein einheitliches Bundesformat; Validierung ist bundeslandabhängig. Für Phase 1: Format-Prüfung per `land` — für AT und CH strikte Regex, für DE nur Ziffern-Prüfung.

---

## 5. QR-Rechnung Schweiz (Detailspezifikation)

### 5.1 Was ist die QR-Rechnung?

Die QR-Rechnung (Swiss QR Bill) ist ein standardisiertes Format für Rechnungen mit integriertem Zahlteil. Sie besteht aus:
- **Rechnungsteil** (oben): normale Rechnung
- **Zahlteil** (unten links, A6): IBAN, Betrag, Empfängeradresse
- **Empfangsschein** (unten rechts, A7): Quittungsfeld
- **QR-Code** (im Zahlteil): maschinenlesbarer Datensatz (Swiss QR Code, ISO 20022)

### 5.2 Pflichtdaten im QR-Code

```
QRType: SPC (Swiss Payments Code)
Version: 0200
CodingType: 1 (UTF-8)
IBAN: [IBAN des Rechnungsstellers]
CdtrInf: [Name, Adresse, PLZ, Ort, Land des Empfängers]
UltmtCdtr: [Optional: Letzter Empfänger]
CcyAmt: [Betrag] [Währung CHF/EUR]
UltmtDbtr: [Optional: Auftraggeber]
RmtInf: [Zahlungsreferenz-Typ: QRR/SCOR/NON] + [Referenz]
AddInf: [Unstrukturierte Meldung, max. 140 Zeichen]
```

### 5.3 Implementierungshinweis

Für CH-Rechnungen muss ein QR-Rechnung-Generator integriert werden. Empfohlene Open-Source-Bibliothek für Node.js: `swico/qrbill` oder `swiss-qr-bill`.

**Voraussetzungen:**
- `Tenant.iban` muss für CH-Tenants gesetzt sein (Schweizer oder EU-IBAN mit Ländercode CH)
- PDF-Template muss den Zahlteil unten (A5-Format mit Perforationslinie) rendern können
- Betrag und Währung aus der Rechnung werden eingebettet

---

## 6. Nummernkreise pro Land

Die bestehende `Nummernkreis`-Logik aus `kaufmaennische-regeln.md` funktioniert für alle drei Länder identisch. Kein Änderungsbedarf.

**Empfehlung:** Präfix konfigurierbar per Tenant machen (nicht hardcoded `RE-`/`AG-`):

```prisma
model Tenant {
  rechnungPraefix  String  @default("RE") @map("rechnung_praefix")
  angebotPraefix   String  @default("AG") @map("angebot_praefix")
}
```

Österreichische Buchhalter bevorzugen oft `RG-` (Rechnung) oder eigene Präfixe.

---

## 7. Währungsunterstützung

### 7.1 Anforderungen

| Land | Währung | ISO-Code | Dezimalstellen |
|------|---------|----------|----------------|
| DE | Euro | EUR | 2 |
| AT | Euro | EUR | 2 |
| CH | Schweizer Franken | CHF | 2 (Rappen) |

**CH-Besonderheit: 5-Rappen-Rundung** (Preisbekanntmachungsverordnung):
- Bei Barzahlung wird auf 5 Rappen gerundet (0,05 CHF)
- Bei Kartenzahlung / E-Banking: keine Rundung nötig
- Für Phase 1: Keine Barrundung implementieren (Kartenzahlung wird Standard sein)

### 7.2 Datenbankstruktur

```prisma
model Tenant {
  land      String  @default("DE")  // "DE" | "AT" | "CH"
  waehrung  String  @default("EUR") // "EUR" | "CHF"
  locale    String  @default("de-DE") // "de-DE" | "de-AT" | "de-CH"
}
```

**Zahlenformatierung:**
- DE/AT: `1.234,56` (Punkt = Tausender, Komma = Dezimal)
- CH: `1'234.56` (Apostroph = Tausender, Punkt = Dezimal) — im Geschäftsverkehr oft auch Punkt als Tausender

---

## 8. Aufbewahrungsfristen und GoBD-Äquivalente

| Land | Rechtsgrundlage | Frist | Besonderheiten |
|------|----------------|-------|----------------|
| DE | GoBD / §14b UStG / §147 AO | 10 Jahre | Elektronisch unveränderlich, revisionssicher |
| AT | BAO §131/132 | 7 Jahre | Elektronische Bücher: BAO §131b |
| CH | OR Art. 958f | 10 Jahre | Keine GoBD, aber Unveränderlichkeit faktisch erforderlich |

**Implementierung:** Das bestehende `archiviertAm`-Feld und `gesperrt`-Flag gelten für alle Länder. Aufbewahrungspflicht wird im `Tenant.land` hinterlegt und kann zur Berechnung der Archivierungsfrist genutzt werden.

---

## 9. Code-Änderungsempfehlungen

### 9.1 Kritische Änderungen (Blockers für DACH-Launch)

| # | Änderung | Scope | Begründung |
|---|---------|-------|------------|
| 1 | `Tenant.land` Feld (DE/AT/CH) | Schema | Basis für alle länderspezifischen Regeln |
| 2 | `Tenant.waehrung` Feld (EUR/CHF) | Schema | CH braucht CHF |
| 3 | `Tenant.locale` Feld (de-DE/de-AT/de-CH) | Schema | Zahlen-/Datumsformatierung |
| 4 | `Tenant.mwstNummer` umbenennen/erweitern | Schema | Unterschiedliche Formate je Land |
| 5 | `UstSatz`-Tabelle: AT 13%-Satz hinzufügen | Datenmigration | AT-Sondersatz |
| 6 | `UstSatz`-Tabelle: CH-Sätze 8,1%/2,6%/3,8% | Datenmigration | CH-Sätze |
| 7 | Steuernummer-Validierung per Land | API-Logik | ATU-Format, CHE-Format |
| 8 | Pflichtfeld-Validierung: AT UID-Empfänger >10k | API-Logik | AT §11 Abs. 1a UStG |
| 9 | PDF-Template: Pflichtfelder je Land | Template | Unterschiedliche Texte je Rechtsordnung |
| 10 | QR-Rechnung Generator für CH | Backend + PDF | Pflicht für CH-Tenants |

### 9.2 Empfohlene Änderungen (Qualität, nicht Blocker)

| # | Änderung | Scope | Begründung |
|---|---------|-------|------------|
| 11 | `Tenant.rechnungPraefix` konfigurierbar | Schema | AT bevorzugt andere Präfixe |
| 12 | `Tenant.aufbewahrungsjahre` berechnet aus `land` | Logik | 7 (AT) vs. 10 (DE/CH) Jahre |
| 13 | `Tenant.kleinunternehmer` Flag | Schema | Unterschiedliche Freigrenzen je Land |
| 14 | Historische MwSt-Sätze archivieren | Datenmigration | CH-Erhöhung 2024 — alte Rechnungen |
| 15 | `Tenant.iban` für QR-Rechnung | Schema | CH: IBAN Pflicht für Zahlteil |

### 9.3 Nicht im Scope Phase 1 (DACH)

- Saldosteuersatzmethode (CH) — nur für kleine Betriebe, komplexes Verfahren
- Reverse Charge AT/CH — unterschiedliche Regelungen je Land
- B2G E-Invoicing AT (XML-Pflicht für öffentliche Auftraggeber)
- Innergemeinschaftliche Lieferungen AT/DE
- Kleinunternehmerregelung CH (100k-Grenze) — Flag vorbereiten, Feature Phase 2

---

## 10. Migrations-Reihenfolge (empfohlen)

```
Phase 1 (Datenmodell):
  1. Tenant.land / .waehrung / .locale hinzufügen
  2. Steuersatz-Tabelle um AT/CH-Sätze erweitern
  3. Steuernummer-Felder normalisieren (mwstNummer → landspezifisches Format)

Phase 2 (Validierungslogik):
  4. Pflichtfeld-Validierung je Land implementieren
  5. Steuernummer-Regex je Land aktivieren

Phase 3 (PDF):
  6. PDF-Templates mit Land-Switch ausstatten
  7. QR-Rechnung für CH integrieren

Phase 4 (Test & Compliance-Review):
  8. CFO-Review AT-Testrechnung (Pflichtfelder, USt-Ausweis)
  9. CFO-Review CH-Testrechnung (QR-Code, MWST-Nummer, CHF)
```

---

## 11. Offene Fragen / Risiken

| Frage | Risiko | Verantwortlich |
|-------|--------|----------------|
| QR-Rechnung: Welche Bibliothek? Lizenz? | Mittel — Lizenz-Kompatibilität prüfen | CTO |
| AT B2G: Müssen Handwerker XML-Rechnungen unterstützen? | Niedrig — Phase 1 nur B2B | CFO |
| CH: Barzahlungs-Rundung auf 5 Rappen nötig? | Niedrig — Kartenzahlung Standard | CFO |
| CH: MWST-Registrierungspflicht unter 100k CHF optional? | Niedrig — Tenant wählt selbst | CFO |
| AT 13%-Satz: Welche Handwerksleistungen betroffen? | Niedrig — nur Spezialfälle | CFO |

---

*Analyse basiert auf Stand 2026-04-12. Steuersätze und Gesetze können sich ändern — vor Produktionsrelease auf Aktualität prüfen.*
