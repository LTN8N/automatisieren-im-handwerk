# Kaufmaennische Anforderungen — Automatisieren im Handwerk

**Version:** 1.0
**Datum:** 2026-04-09
**Verantwortlich:** CFO-Agent
**Referenz:** Design Spec Sektion 3.2, 3.6 | UStG §14, §14a | GoBD

---

## 1. Umsatzsteuer (USt / MwSt) pro Land

### 1.1 Steuersaetze

| Land | Regel-Satz | Ermaessigt | Weitere | Kleinunternehmer |
|------|-----------|------------|---------|------------------|
| DE | 19% | 7% | — | 0% (§19 UStG) |
| AT | 20% | 10% | 13% (Beherbergung, Kultur) | Kleinunternehmerregelung bis 35.000 EUR/Jahr |
| CH | 8.1% | 2.6% | 3.8% (Beherbergung) | Befreiung bis 100.000 CHF/Jahr |

### 1.2 Architektur-Anforderungen

- **NIEMALS hardcoded.** Alle Steuersaetze muessen in einer konfigurierbaren Tabelle gespeichert werden.
- Datenmodell `TaxRate`:
  ```
  TaxRate
  +-- id: UUID
  +-- country_code: string (ISO 3166-1 alpha-2: DE, AT, CH)
  +-- rate_type: enum (standard, reduced, reduced_2, zero, exempt)
  +-- rate_percent: decimal(5,2)
  +-- label: string (z.B. "Regelsteuersatz", "Ermaessigt")
  +-- valid_from: date
  +-- valid_to: date | null (null = aktuell gueltig)
  +-- created_at: timestamp
  ```
- Pro Tenant wird das **Land** gesetzt → daraus ergeben sich die verfuegbaren Steuersaetze.
- Jede Position auf Angebot/Rechnung bekommt einen eigenen `tax_rate_id`.
- Historische Steuersaetze muessen erhalten bleiben (valid_from/valid_to), damit alte Rechnungen korrekt nachvollziehbar sind.

### 1.3 Reverse Charge (Innergemeinschaftliche Leistungen)

- Bei B2B-Leistungen ueber EU-Landesgrenzen: **Reverse Charge** (§13b UStG).
- Rechnung muss dann enthalten: "Steuerschuldnerschaft des Leistungsempfaengers" / "Reverse Charge".
- USt-Betrag = 0, aber der Hinweis ist Pflicht.
- Voraussetzung: Gueltige USt-ID des Empfaengers (Validierung ueber VIES-API).
- Gilt NICHT fuer CH (Drittland, andere Regeln).

### 1.4 Berechnungsregeln

- Berechnung immer: `netto_position = menge * einzelpreis`
- USt pro Position: `ust_position = netto_position * (steuersatz / 100)`
- Rundung: Auf **2 Dezimalstellen** pro Position (kaufmaennisch, §14 Abs. 4 UStG).
- Gesamtbetraege: Summe der gerundeten Einzelpositionen, NICHT Rundung der Gesamtsumme.
- Reihenfolge: Erst pro Position runden, dann summieren.

### 1.5 Gemischte Steuersaetze

- Eine Rechnung kann Positionen mit unterschiedlichen Steuersaetzen enthalten.
- Ausweisung: Netto, USt und Brutto **pro Steuersatz** getrennt ausweisen.
- Beispiel:
  ```
  Positionen 19%:  Netto 1.000,00 EUR | USt 190,00 EUR | Brutto 1.190,00 EUR
  Positionen 7%:   Netto   200,00 EUR | USt  14,00 EUR | Brutto   214,00 EUR
  Gesamt:          Netto 1.200,00 EUR | USt 204,00 EUR | Brutto 1.404,00 EUR
  ```

---

## 2. Pflichtangaben auf Rechnungen

### 2.1 Regulaere Rechnungen (§14 Abs. 4 UStG)

| Nr | Pflichtfeld | Datenquelle | Validierung |
|----|-------------|-------------|-------------|
| 1 | Vollstaendiger Name und Adresse des leistenden Unternehmers | Tenant-Profil | NOT NULL, min. Name + Strasse + PLZ + Ort |
| 2 | Vollstaendiger Name und Adresse des Leistungsempfaengers | Kunde | NOT NULL, min. Name + Strasse + PLZ + Ort |
| 3 | Steuernummer ODER USt-IdNr des Ausstellers | Tenant-Profil | Mindestens eins von beiden NOT NULL |
| 4 | Rechnungsdatum | System/Eingabe | NOT NULL, Format: TT.MM.JJJJ |
| 5 | Fortlaufende Rechnungsnummer | System (Nummernkreis) | Automatisch, lueckenlos |
| 6 | Menge und Art der Lieferung/Leistung | Positionen | Jede Position: beschreibung NOT NULL |
| 7 | Zeitpunkt der Lieferung/Leistung | Eingabe | NOT NULL (Monat genuegt) |
| 8 | Nettobetrag | Berechnet | Automatisch |
| 9 | Steuersatz (%) | Pro Position | NOT NULL, aus TaxRate-Tabelle |
| 10 | USt-Betrag | Berechnet | Automatisch |
| 11 | Bruttobetrag | Berechnet | Automatisch |
| 12 | Zahlungsziel | Tenant-Default oder manuell | NOT NULL, Datum oder "sofort faellig" |
| 13 | Ggf. Hinweis auf Steuerbefreiung | System | Bei §19 UStG: "Kleinunternehmer gemaess §19 UStG — keine USt ausgewiesen" |
| 14 | Ggf. Reverse-Charge-Hinweis | System | Bei §13b: "Steuerschuldnerschaft des Leistungsempfaengers" |

### 2.2 Kleinbetragsrechnungen (bis 250 EUR brutto, §33 UStDV)

Vereinfachte Pflichtangaben:

| Nr | Pflichtfeld | Validierung |
|----|-------------|-------------|
| 1 | Name und Adresse des Ausstellers | NOT NULL |
| 2 | Rechnungsdatum | NOT NULL |
| 3 | Menge und Art der Leistung | NOT NULL |
| 4 | Bruttobetrag | NOT NULL |
| 5 | Steuersatz (%) | NOT NULL |

**NICHT erforderlich** bei Kleinbetragsrechnungen:
- Rechnungsnummer (trotzdem empfohlen und wir vergeben sie)
- Name/Adresse des Empfaengers
- Netto/USt-Aufschluesselung
- Leistungszeitpunkt

### 2.3 Laenderspezifische Abweichungen

| Land | Zusatz-Pflichtangaben |
|------|----------------------|
| DE | Steuernummer oder USt-IdNr |
| AT | UID-Nummer (ab 10.000 EUR brutto Pflicht), Kleinbetragsgrenze 400 EUR |
| CH | MWST-Nummer (CHE-xxx.xxx.xxx MWST), QR-Rechnung empfohlen |

---

## 3. Pflichtangaben auf Angeboten

| Nr | Pflichtfeld | Validierung |
|----|-------------|-------------|
| 1 | Name und Adresse des Anbieters | NOT NULL |
| 2 | Name und Adresse des Empfaengers | NOT NULL |
| 3 | Angebotsdatum | NOT NULL |
| 4 | Angebotsnummer | Automatisch aus Nummernkreis |
| 5 | Gueltigkeitsdauer | NOT NULL, Default: 30 Tage |
| 6 | Leistungsbeschreibung mit Positionen | Min. 1 Position |
| 7 | Einzelpreise und Mengen | Pro Position NOT NULL |
| 8 | Nettobetrag | Berechnet |
| 9 | USt-Betrag und -Satz | Berechnet, ausgewiesen |
| 10 | Bruttobetrag | Berechnet |
| 11 | Zahlungsbedingungen (optional) | Freitext oder Tenant-Default |

### 3.1 Angebot-zu-Rechnung-Konvertierung

- Alle Positionen 1:1 uebernehmen (Beschreibung, Menge, Einzelpreis, Steuersatz).
- Rechnungsnummer aus Rechnungs-Nummernkreis vergeben (NICHT Angebotsnummer verwenden!).
- Rechnungsdatum = Konvertierungsdatum.
- Leistungszeitraum muss manuell ergaenzt oder bestaetigt werden.
- Referenz auf Angebotsnummer in der Rechnung empfohlen ("Gemaess Angebot AN-2026-047").
- Nach Konvertierung: Angebotsstatus auf "angenommen" setzen.

---

## 4. Nummernkreise

### 4.1 Anforderungen

- **Fortlaufend und lueckenlos** (§14 Abs. 4 Nr. 4 UStG, GoBD).
- Pro Tenant konfigurierbar.
- Pro Dokumenttyp getrennt (Angebote und Rechnungen haben separate Nummernkreise).

### 4.2 Datenmodell

```
NumberSequence
+-- id: UUID
+-- tenant_id: UUID (FK)
+-- document_type: enum (invoice, quote)
+-- prefix: string (z.B. "RE", "AN")
+-- pattern: string (z.B. "{prefix}-{year}-{seq:3}")
+-- current_value: integer
+-- year: integer (fuer Jahreswechsel-Reset)
+-- reset_yearly: boolean (default: true)
+-- created_at: timestamp
+-- updated_at: timestamp
```

### 4.3 Muster-Beispiele

| Typ | Muster | Ergebnis |
|-----|--------|----------|
| Rechnung | `RE-{year}-{seq:3}` | RE-2026-001, RE-2026-002, ... |
| Angebot | `AN-{year}-{seq:3}` | AN-2026-001, AN-2026-002, ... |
| Rechnung (alt) | `{year}{seq:5}` | 202600001, 202600002, ... |
| Frei | `INV-{seq:4}` | INV-0001, INV-0002, ... |

### 4.4 Technische Regeln

- **Atomare Vergabe:** Nummernvergabe muss ueber Datenbank-Lock (SELECT FOR UPDATE oder SERIAL) erfolgen — keine Race Conditions.
- **Keine Luecken:** Wird eine Nummer vergeben, ist sie verbraucht — auch bei Abbruch. Stornierte Rechnungen behalten ihre Nummer.
- **Jahreswechsel:** Wenn `reset_yearly = true`, startet `current_value` am 01.01. bei 1. Das `year`-Feld wird aktualisiert.
- **Kein manuelles Ueberschreiben:** Nutzer koennen Prefix und Muster aendern, aber NICHT die aktuelle laufende Nummer zuruecksetzen.

---

## 5. GoBD-Konformitaet

### 5.1 Grundsaetze

Die GoBD (Grundsaetze zur ordnungsmaessigen Fuehrung und Aufbewahrung von Buechern, Aufzeichnungen und Unterlagen in elektronischer Form) verlangen:

| Grundsatz | Umsetzung |
|-----------|-----------|
| **Nachvollziehbarkeit** | Jede Aenderung wird mit Zeitstempel, Akteur und altem/neuem Wert protokolliert |
| **Unveraenderbarkeit** | Gesendete/finalisierte Rechnungen sind schreibgeschuetzt |
| **Vollstaendigkeit** | Keine Luecken in Nummernkreisen, kein Loeschen von Rechnungen |
| **Ordnung** | Systematische Ablage, Nummernkreise, Suchbarkeit |
| **Zeitgerechtheit** | Rechnungen zeitnah erstellen (Leistungszeitpunkt nahe Rechnungsdatum) |

### 5.2 Unveraenderbarkeit (Immutability)

- **Entwurf-Status:** Frei bearbeitbar (alle Felder aenderbar).
- **Gesendet-Status:** Rechnung ist **eingefroren**. Keine inhaltlichen Aenderungen mehr moeglich.
- Korrekturen nur ueber **Storno-Rechnung** (gleicher Betrag negativ) + neue Rechnung.
- Storno-Rechnung bekommt eigene Nummer aus dem Nummernkreis.
- Referenz auf Originalrechnung ist Pflicht: "Storno zu RE-2026-015".

### 5.3 Aenderungshistorie (Audit Trail)

```
AuditLog
+-- id: UUID
+-- tenant_id: UUID
+-- document_type: enum (invoice, quote)
+-- document_id: UUID
+-- action: enum (created, updated, sent, cancelled, converted, payment_received)
+-- field_changed: string | null
+-- old_value: text | null
+-- new_value: text | null
+-- changed_by: UUID (user_id)
+-- changed_at: timestamp
+-- source: enum (voice, chat, manual, system)
```

- Jede Aenderung an Angeboten und Rechnungen wird geloggt.
- Audit-Log-Eintraege sind **append-only** — kein UPDATE, kein DELETE.
- Bei geloeschten Entwuerfen: Soft-Delete (`deleted_at` statt physisches Loeschen).

### 5.4 Archivierung

- Gesendete Rechnungen muessen **10 Jahre** aufbewahrt werden (§147 AO).
- PDF-Kopie wird bei Versand erstellt und unveraenderbar gespeichert.
- Empfehlung: Separate Archiv-Tabelle oder Cloud-Storage mit Retention Policy.
- Metadaten (Rechnungsnummer, Datum, Kunde, Betrag) muessen durchsuchbar bleiben.

---

## 6. Zahlungsziele und Mahnwesen

### 6.1 Zahlungsziele

- **Standard-Zahlungsziel** pro Tenant konfigurierbar (Default: 14 Tage).
- Optionen: 7, 14, 30, 45, 60 Tage oder benutzerdefiniert.
- Pro Rechnung ueberschreibbar.
- Skonto optional: z.B. "2% Skonto bei Zahlung innerhalb 10 Tagen".

```
PaymentTerms (Tenant-Level)
+-- id: UUID
+-- tenant_id: UUID
+-- default_days: integer (Default: 14)
+-- skonto_percent: decimal(4,2) | null
+-- skonto_days: integer | null
+-- custom_text: text | null (z.B. "Zahlbar innerhalb von 14 Tagen ohne Abzug")
```

### 6.2 Mahnwesen (Dunning)

| Stufe | Name | Frist nach Faelligkeit | Mahngebuehr | Ton |
|-------|------|----------------------|-------------|-----|
| 0 | Zahlungserinnerung | 3-7 Tage | Keine | Freundlich |
| 1 | 1. Mahnung | 14 Tage | Optional (z.B. 5 EUR) | Sachlich |
| 2 | 2. Mahnung | 28 Tage | Optional (z.B. 10 EUR) | Bestimmt |
| 3 | 3. Mahnung (letzte) | 42 Tage | Optional (z.B. 15 EUR) | Letzte Frist, Ankuendigung rechtlicher Schritte |

### 6.3 Datenmodell Mahnwesen

```
DunningConfig (Tenant-Level)
+-- id: UUID
+-- tenant_id: UUID
+-- reminder_days: integer (Default: 5)
+-- dunning_1_days: integer (Default: 14)
+-- dunning_2_days: integer (Default: 28)
+-- dunning_3_days: integer (Default: 42)
+-- reminder_fee: decimal(8,2) (Default: 0)
+-- dunning_1_fee: decimal(8,2) (Default: 0)
+-- dunning_2_fee: decimal(8,2) (Default: 0)
+-- dunning_3_fee: decimal(8,2) (Default: 0)
+-- auto_remind: boolean (Default: false)
+-- auto_dunning: boolean (Default: false)

DunningEntry (Pro Rechnung)
+-- id: UUID
+-- invoice_id: UUID
+-- level: enum (reminder, dunning_1, dunning_2, dunning_3)
+-- sent_at: timestamp
+-- sent_via: enum (email, pdf_download, manual)
+-- fee_amount: decimal(8,2)
+-- notes: text | null
```

### 6.4 Regeln

- Mahnungen nur fuer Rechnungen mit Status "gesendet" und ueberschrittenem Zahlungsziel.
- Mahngebuehren muessen dem Kunden vorher bekannt sein (z.B. in AGB).
- Verzugszinsen: Gesetzlich 5 Prozentpunkte ueber Basiszinssatz (§288 BGB) — optional berechenbar.
- Mahnstopp moeglich (z.B. bei Zahlungsvereinbarung).

---

## 7. Waehrungen

| Land | Waehrung | Code | Format-Beispiel |
|------|----------|------|-----------------|
| DE | Euro | EUR | 1.234,56 EUR |
| AT | Euro | EUR | 1.234,56 EUR |
| CH | Schweizer Franken | CHF | CHF 1'234.56 |

- Waehrung pro Tenant konfigurierbar.
- Formatierung ueber `Intl.NumberFormat` mit korrektem Locale.
- Alle Betraege als `decimal(10,2)` in der Datenbank.
- Keine Waehrungsumrechnung in Phase 1 (kommt spaeter).

---

## 8. Validierungsregeln (Zusammenfassung)

### 8.1 Vor Versand einer Rechnung pruefen

| Regel | Fehler bei Verstoss |
|-------|---------------------|
| Alle Pflichtfelder aus 2.1 befuellt | "Pflichtfeld [X] fehlt" |
| Mindestens 1 Position | "Rechnung hat keine Positionen" |
| Jede Position hat Beschreibung, Menge, Einzelpreis, Steuersatz | "Position [N]: [Feld] fehlt" |
| Rechnungsnummer vergeben | "Rechnungsnummer fehlt" (System-Fehler) |
| Nettobetrag > 0 | "Rechnungsbetrag muss groesser 0 sein" (ausser Storno) |
| Steuersatz existiert und ist gueltig | "Ungueltiger Steuersatz" |
| Tenant hat Steuernummer oder USt-IdNr | "Steuernummer/USt-IdNr im Firmenprofil fehlt" |
| Tenant hat vollstaendige Adresse | "Firmenadresse unvollstaendig" |
| Leistungszeitpunkt angegeben | "Leistungszeitpunkt fehlt" |

### 8.2 Vor Versand eines Angebots pruefen

| Regel | Fehler bei Verstoss |
|-------|---------------------|
| Alle Pflichtfelder aus 3 befuellt | "Pflichtfeld [X] fehlt" |
| Mindestens 1 Position | "Angebot hat keine Positionen" |
| Gueltigkeitsdauer gesetzt | "Gueltigkeitsdauer fehlt" |
| Gueltig-bis-Datum in der Zukunft | "Gueltigkeitsdatum liegt in der Vergangenheit" |

---

## 9. Beispiel-Rechnungen pro Land

### 9.1 Deutschland (Regelbesteuerung)

```
Max Mustermann Sanitaer GmbH          Rechnung
Musterstrasse 1                        Rechnungs-Nr: RE-2026-001
22145 Hamburg                          Datum: 09.04.2026
Steuernummer: 12/345/67890            Leistungsdatum: April 2026
USt-IdNr: DE123456789

An:
Hans Meier
Kundenweg 5
22145 Hamburg

Pos  Beschreibung              Menge  Einheit  Einzelpreis  Gesamt
1    Demontage alte Dusche      1     Pauschal    340,00    340,00
2    Neue Duschwanne inkl.      1     Stueck      890,00    890,00
     Einbau
3    Fliesen 30x60 inkl.       12     m2          120,00  1.440,00
     Verlegung
4    Waschtisch inkl. Montage   2     Stueck      600,00  1.200,00

                                        Netto:           3.870,00 EUR
                                        USt 19%:           735,30 EUR
                                        Brutto:          4.605,30 EUR

Zahlungsziel: 14 Tage (bis 23.04.2026)
Bankverbindung: DE89 3704 0044 0532 0130 00 | BIC: COBADEFFXXX
```

### 9.2 Oesterreich

```
(wie DE, aber mit:)
- UID-Nummer statt USt-IdNr: ATU12345678
- USt 20% statt 19%
- Kleinbetragsgrenze: 400 EUR (statt 250 EUR)
```

### 9.3 Schweiz

```
(wie DE, aber mit:)
- MWST-Nummer: CHE-123.456.789 MWST
- MWST 8.1% statt USt 19%
- Waehrung: CHF
- Zahlenformat: 1'234.56 (Apostroph als Tausendertrennzeichen)
- QR-Rechnung empfohlen (QR-Code mit Zahlungsinformationen)
```

---

## 10. Tenant-Firmenprofil (Pflichtfelder fuer Rechnungsstellung)

| Feld | Typ | Pflicht | Hinweis |
|------|-----|---------|---------|
| firma_name | string | Ja | Vollstaendiger Firmenname |
| strasse | string | Ja | |
| plz | string | Ja | |
| ort | string | Ja | |
| land | enum (DE/AT/CH) | Ja | Bestimmt Steuersaetze und Pflichtangaben |
| steuernummer | string | Bedingt | Entweder steuernummer oder ust_id |
| ust_id | string | Bedingt | USt-IdNr (DE), UID (AT), MWST-Nr (CH) |
| bankverbindung_iban | string | Empfohlen | Fuer Zahlungsanweisung |
| bankverbindung_bic | string | Empfohlen | |
| email | string | Ja | Fuer Rechnungsversand |
| telefon | string | Empfohlen | |
| logo | binary/url | Optional | Fuer PDF-Branding |
| waehrung | enum (EUR/CHF) | Ja | Default: EUR |
| sprache | enum (de/en) | Ja | Default: de |

---

## Aenderungshistorie

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 2026-04-09 | Erstversion: Alle DACH-Anforderungen definiert |
