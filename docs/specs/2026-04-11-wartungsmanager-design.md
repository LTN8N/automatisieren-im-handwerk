# Autonomer Wartungsmanager — Design Spec

**Datum:** 2026-04-11
**Autor:** Lars + Claude Code (Brainstorming & Tiefenanalyse)
**Status:** Draft — Übergabe an Paperclip Agenten-Team

---

## 1. Produktvision

### Elevator Pitch

Ein KI-gestützter Wartungsmanager der aus Wartungsverträgen automatisch optimierte Jahrespläne erstellt. Der Unternehmer sagt: "Erstelle einen Wartungsplan für 2027" — und das System liefert einen intelligenten Plan wie ein erfahrener Wartungsleiter mit 20 Jahren Erfahrung.

### Zwei Seiten des Produkts

**Seite 1 (diese Spec):** Der Unternehmer hat Wartungsverträge und muss diese erfüllen. Das System plant autonom, optimiert Routen, berücksichtigt Qualifikationen, saisonale Logik, gesetzliche Fristen und Kapazitäten. Manuelle Anpassungen werden auf Abhängigkeiten geprüft.

**Seite 2:** (wird ergänzt)

---

## 2. Kern-Features Seite 1: Autonome Jahresplanung

### 2.1 Der Prozess

```
Wartungsverträge hochladen
    → Agent parsed und strukturiert alle Verträge
    → Agent berechnet alle Wartungsereignisse für Zieljahr
    → Agent plant unter Berücksichtigung von 8 Constraint-Kategorien
    → Agent liefert optimierten Jahresplan + KPIs + Warnungen
    → Unternehmer passt manuell an
    → Agent prüft Änderungen auf Abhängigkeiten und Konflikte
    → Plan wird freigegeben → Ausführungsphase beginnt
```

### 2.2 Die 8 Constraint-Kategorien

#### 1. Vertragliche Pflichten (hart)
- Intervall (monatlich/quartalsweise/halbjährlich/jährlich)
- Vertragliche Fristen (z.B. "vor Beginn der Heizperiode")
- Bestellnummer/Vertragsnummer für Referenz

#### 2. Gesetzliche Prüffristen (hart)

| Anlage | Intervall | Rechtsgrundlage |
|--------|-----------|-----------------|
| Aufzüge | 2 Jahre + Zwischenprüfung | BetrSichV |
| Feuerlöscher | 2J Sicht / 5J innen / 10J Festigkeit | ASR A2.2 |
| Elektrische Anlagen (ortsfest) | 1-4 Jahre | DGUV Vorschrift 3 |
| Heizungsanlagen (Gas) | Jährlich | Herstellervorgabe, EnEV |
| Lüftung/Klima (RLT) | 1-3 Jahre | VDI 6022 |
| Brandmeldeanlagen | Quartalsweise + jährlich | DIN 14675 |
| Sprinkleranlagen | Quartalsweise + halbjährlich | VdS-Richtlinien |
| Legionellen (Trinkwasser) | Alle 3 Jahre | TrinkwV |
| Sicherheitsbeleuchtung | Jährlich + monatlich | ASR A3.4/3 |
| Blitzschutzanlagen | 1-4 Jahre | DIN EN 62305 |

Prüfverordnungen variieren je Bundesland (z.B. PrüfVO NRW).

#### 3. Saisonale Logik (weich)

| Wartungstyp | Ideale Saison | Begründung |
|-------------|---------------|------------|
| Heizungswartung | April–September | Vor Heizperiode, Anlage abschaltbar |
| Klimaanlagen | März–Mai | Vor Kühlsaison |
| Außenanlagen | April–Oktober | Witterung |
| Brandschutz | Ganzjährig | Keine saisonale Abhängigkeit |
| Sanitär/Legionellen | Ganzjährig | Temperaturunabhängig |

#### 4. Geographische Optimierung (weich)
- Objekte nach PLZ/Stadtteil clustern
- Tagesrouten bilden (alle Objekte eines Gebiets an einem Tag)
- Fahrzeiten: 15-30min im Stadtteil, 30-60min übergreifend
- Multi-Objekt-Kunden als Block planen

#### 5. Zeitkalkulation pro Wartungstyp

| Wartungstyp | Klein | Mittel | Groß |
|-------------|-------|--------|------|
| Heizung (Gas) | 1-1,5h | 2-3h | 4-6h |
| Sanitär-Check | 0,5-1h | 1-2h | 2-4h |
| Klima/Lüftung | 1-2h | 2-4h | 4-8h |
| Elektroprüfung | 1-2h | 2-4h | Tagesaufwand |
| Brandschutz | 0,5-1h | 1-2h | 2-4h |

System lernt aus tatsächlichen Durchführungszeiten und passt Kalkulation an.

#### 6. Techniker-Kapazität und Qualifikation
- Arbeitszeit: typisch Mo-Fr 07:00-16:00
- Max. 2-3 Wartungen pro Tag (je nach Umfang)
- Qualifikationen: Gas (Konzession), Elektro (Fachkraft), etc.
- Urlaubsplanung einbeziehen
- 20-25% Buffer für Notfälle (Branchenstandard: 80/20 geplant/reaktiv)

#### 7. Gebäude-Zugangsbeschränkungen

| Gebäudetyp | Einschränkung |
|------------|---------------|
| Schulen | Nur in Schulferien (variiert je Bundesland!) |
| Bürogebäude | Mo-Fr 08:00-18:00 |
| Pflegeheime | Nicht während Ruhezeiten |
| Produktionshallen | Nur bei Stillstand/Wochenende |
| Wohngebäude | 14 Tage Vorlaufzeit Ankündigung |
| Arztpraxen | Außerhalb Sprechzeiten |

Schulferien aller 16 Bundesländer als Constraint integrieren.

#### 8. Wirtschaftliche Optimierung
- Gleichmäßige Auslastung übers Jahr
- Umsatz-Smoothing (Revenue pro Quartal)
- Material-Bündelung (Sammelbestellungen)
- Techniker-Zufriedenheit (faire Verteilung)

### 2.3 Plan-Output

Der Agent liefert:

**A. Vollständiger Jahresplan** — KW für KW, Tag für Tag, Techniker für Techniker, mit:
- Geplante Wartung (Vertrag, Objekt, Anlage)
- Zeitfenster (von-bis inkl. Fahrzeit)
- Zugewiesener Techniker
- KI-Begründung warum dieses Datum

**B. Statistiken und KPIs:**
- Gesamtzahl Wartungsereignisse
- Durchschnittliche Auslastung pro Techniker
- Spitzen- und Ruhe-Wochen
- Notfall-Reserve (%)
- Saisonverteilung (Q1-Q4)
- Geschätzte Fahrzeit (optimiert vs. unoptimiert)
- Umsatzprognose pro Quartal

**C. Warnungen und Empfehlungen:**
- Kapazitäts-Engpässe
- Qualifikations-Engpässe
- Optimierungsvorschläge
- Vertrags-Hinweise (auslaufende Verträge)

### 2.4 Feedback-Loop

Manuelle Änderungen am Plan werden geprüft auf:
- Vertragsfrist-Einhaltung
- Techniker-Verfügbarkeit
- Qualifikations-Match
- Gebäude-Zugangszeiten (Schulferien etc.)
- Kapazitäts-Auswirkungen
- Routen-Auswirkungen

Pro Änderung: ✅ OK, ⚠️ Problem mit Lösungsvorschlag, oder ❌ Nicht möglich mit Begründung.

---

## 3. Datenmodell

### Neue Modelle (erweitern bestehendes Prisma-Schema)

```
Techniker
  id, tenant_id, name, telefon, email
  qualifikationen[] (GAS | ELEKTRO | SANITAER | KLIMA | BRANDSCHUTZ | ...)
  arbeitszeitModell (JSON: {mo: "07:00-16:00", fr: "07:00-13:00", ...})
  region (bevorzugtes PLZ-Gebiet)
  status (AKTIV | URLAUB | KRANK | INAKTIV)

TechnikerUrlaub
  id, techniker_id
  von, bis
  typ (URLAUB | KRANK | FORTBILDUNG)

WartungsVertrag
  id, tenant_id, kunde_id
  vertragsnummer, bestellnummer
  objektName, objektAdresse, objektPLZ
  ansprechpartner, apEmail, apTelefon
  gebaeudeTyp (SCHULE | BUERO | PFLEGE | WOHNUNG | PRODUKTION | ...)
  zugangszeiten (JSON)
  vertragsBeginn, vertragsEnde, kuendigungsfrist
  automatischeVerlaengerung (Boolean)
  originalDatei (Upload-Pfad)
  status (AKTIV | PAUSIERT | GEKUENDIGT | AUSGELAUFEN)
  notizen

WartungsLeistung
  id, vertrag_id
  anlagenTyp (HEIZUNG_GAS | KLIMA | SANITAER | ELEKTRO | BRANDSCHUTZ | ...)
  anlagenDetails (Hersteller, Modell, Baujahr, Standort)
  intervall (MONATLICH | QUARTALSWEISE | HALBJAEHRLICH | JAEHRLICH)
  geschaetzteDauerMinuten
  benoetigteQualifikation
  saisonPraeferenz (FRUEHLING | SOMMER | HERBST | WINTER | KEINE)
  gesetzlichePruefpflicht (Boolean)
  rechtsgrundlage (optional)
  letzteWartung (DateTime)

WartungsPlan
  id, tenant_id
  jahr
  status (ENTWURF | FREIGEGEBEN | IN_AUSFUEHRUNG | ABGESCHLOSSEN)
  erstelltVon (AGENT | MANUELL)
  parameter (JSON: {buffer, maxAuslastung, ...})
  statistiken (JSON: {events, auslastung, fahrzeit, ...})
  warnungen (JSON[])
  version (Int)

WartungsPlanEintrag
  id, plan_id, leistung_id, vertrag_id, techniker_id
  geplantDatum, zeitVon, zeitBis
  geschaetzteFahrtMinuten
  status (GEPLANT | MANUELL_ANGEPASST | BESTAETIGT | DURCHGEFUEHRT | VERSCHOBEN | AUSGEFALLEN)
  kiBegruendung (Text)
  cluster (String: z.B. "koeln-innenstadt-kw15")
  tatsaechlicheDauerMinuten (nach Durchführung)
```

### Verknüpfung mit bestehendem Schema
- WartungsVertrag → Kunde (FK, existiert)
- Mängel-Angebote → Angebot (FK, existiert)
- PDF-Generierung → bestehendes System
- Email-Versand → bestehender Mailer

---

## 4. Planungs-Engine: Hybrid-Ansatz

### Layer 1: Regelbasierte Vorverarbeitung (Code/n8n)
- Events aus Verträgen + Intervallen berechnen
- Harte Constraints anwenden (Fristen, Qualifikationen, Urlaub)
- Geographisches Clustering nach PLZ
- Kapazitätsberechnung

### Layer 2: KI-Optimierung (LLM)
- Saisonale Verteilung, Routen, Präferenzen, Balance
- Arbeitet monatsweise bei großen Datenmengen
- Generiert menschenlesbare Begründungen

### Layer 3: Regelbasierte Validierung (Code/n8n)
- Keine Doppelbuchungen
- Kapazitätslimits
- Vertragsfristen
- Qualifikations-Match

### Layer 4: KI-Reporting (LLM)
- Zusammenfassung, KPIs, Warnungen
- Änderungsanalysen beim Feedback-Loop

---

## 5. Zusatz-Features (eigene Vorschläge)

1. **Lernfähiges System** — Aus Durchführungsdaten Schätzungen verbessern
2. **Was-wäre-wenn-Szenarien** — "Was wenn wir einen 4. Techniker einstellen?"
3. **Material-Vorplanung** — Aggregierter Materialbedarf pro Monat
4. **Kunden-Compliance-Report** — Jahresbericht pro Kunde über erfüllte Wartungen
5. **Vertrags-Renewal-Assistent** — Auto-Verlängerungsangebote vor Vertragsende
6. **Notfall-Umplanung** — Techniker krank → automatische Umverteilung
7. **Auslastungs-Prognose** — Wachstumsplanung (wann braucht man mehr Personal?)
8. **Preiskalkulation-Check** — Ist der Vertragspreis profitabel?
9. **Export-Formate** — PDF, Excel, iCal, pro Techniker, pro Kunde
10. **Schulferien-Integration** — Alle 16 Bundesländer automatisch

---

## 6. Marktpositionierung

| Segment | Aktuelle Lösung | Unser Angebot |
|---------|----------------|---------------|
| Große FM (>50 MA) | CAFM (30.000-300.000€) | Nicht unser Markt |
| **Mittlere FM (10-50 MA)** | **Excel + Kopfwissen** | **Zielmarkt** |
| **Kleine Handwerker (5-15 MA)** | **Zettel + Excel** | **Zielmarkt** |

Kernargument: Reaktive Wartung kostet 4,8x mehr als geplante. Von 40% auf 80% geplant = halbe Kosten.

---

## 7. Offene Punkte

- [ ] Seite 2 der Vision ergänzen
- [ ] Tech-Stack-Entscheidung durch CTO (Next.js-Modul + n8n-Workflows)
- [ ] Prisma-Migration planen
- [ ] n8n-Workflow-Architektur für Planungs-Engine
- [ ] Schulferien-API/Datenquelle klären
- [ ] Geokodierung/Routing-API für Fahrzeitberechnung
- [ ] Import-Formate definieren (Excel-Template)
- [ ] Export-Templates designen
