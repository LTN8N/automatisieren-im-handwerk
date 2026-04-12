# Conversation Flows — KI/Voice Architect

Testbare Gesprächsverläufe für alle Kern-Intents.
Format: `Input → Erwartetes Verhalten → Erwartete Antwort (Kurzform)`

---

## 1. Neues Angebot erstellen (`angebot_erstellen`)

### 1.1 Vollständiger Auftrag auf einen Schlag

**Input (Voice):**
> "Ich war heute bei Herrn Mueller, Badezimmer-Sanierung. Dusche raus, neue rein, Fliesen 12qm, zwei Waschtische."

**Erwartetes Verhalten:**
1. KI erkennt Intent: `angebot_erstellen`
2. Tool `kunde_suchen` mit "Mueller"
3. Falls Kunde gefunden → `angebot_erstellen` mit Positionen
4. Summe berechnen, kurze Bestätigung

**Erwartete Antwort:**
> "Angebot für Herrn Mueller erstellt — 3.870 Euro netto. Soll ich es an mueller@email.de schicken?"

---

### 1.2 Unklarer Kundenname

**Input:**
> "Mach ein Angebot für Müller"

**Erwartetes Verhalten:**
1. `kunde_suchen` → 2 Treffer (Thomas Müller, Maria Müller)
2. KI stellt Rückfrage

**Erwartete Antwort:**
> "Ich kenne zwei Müllers — meinst du Thomas Müller (Badezimmer) oder Maria Müller (Heizung)?"

---

### 1.3 Kunde nicht bekannt

**Input:**
> "Neues Angebot für Frau Hoffmann, Dachrinne"

**Erwartetes Verhalten:**
1. `kunde_suchen` → keine Treffer
2. KI fragt nach E-Mail/Adresse

**Erwartete Antwort:**
> "Frau Hoffmann kenne ich noch nicht. Wie lautet ihre E-Mail-Adresse?"

---

## 2. Position hinzufügen (`position_hinzufuegen`)

### 2.1 Klare Nachtrag-Aussage

**Input (Voice):**
> "Fueg beim Mueller noch 3 Steckdosen a 85 Euro hinzu"

**Erwartetes Verhalten:**
1. Kontext-Extraktor erkennt: kundenHinweis="Mueller", Menge=3, Preis=85 EUR
2. `angebot_suchen` für Mueller
3. `position_hinzufuegen` auf gefundenem Angebot
4. Neues Brutto zurückgeben

**Erwartete Antwort:**
> "3 Steckdosen, je 85 Euro, macht 255 Euro — Angebot Mueller aktualisiert. Neues Brutto: 4.125 Euro."

---

### 2.2 Nachtrag ohne konkretes Angebot

**Input:**
> "Noch 2 Stunden Mehrarbeit dazu"

**Erwartetes Verhalten:**
1. istNachtrag=true erkannt
2. Kein Angebot im Kontext → KI fragt nach

**Erwartete Antwort:**
> "Zu welchem Angebot soll ich die 2 Stunden hinzufügen?"

---

## 3. Position ändern (`position_aendern`)

### 3.1 Stundenanzahl korrigieren

**Input:**
> "Die Arbeitszeit beim Mueller waren 6 Stunden, nicht 4"

**Erwartetes Verhalten:**
1. `angebot_suchen` für Mueller
2. Position mit "Arbeitszeit/Stunden" identifizieren
3. `position_aendern` mit menge=6
4. Neue Summe zurückgeben

**Erwartete Antwort:**
> "Geändert — 6 Stunden statt 4. Neues Brutto: 4.260 Euro."

---

### 3.2 Preis korrigieren

**Input:**
> "Die Duschwanne kostet 950, nicht 890"

**Erwartetes Verhalten:**
1. Position "Duschwanne" im aktiven Angebot suchen
2. `position_aendern` mit einzelpreis=950

**Erwartete Antwort:**
> "Duschwanne auf 950 Euro geändert. Neues Brutto: 3.930 Euro."

---

## 4. Position löschen (`position_loeschen`) — KRITISCH

### 4.1 Klarer Lösch-Wunsch

**Input:**
> "Streich die Anfahrtspauschale"

**Erwartetes Verhalten:**
1. Position "Anfahrtspauschale" im Angebot suchen
2. **Bestätigung einholen** (Pflicht!)
3. Erst nach "Ja" → `position_loeschen`

**Erwartete KI-Zwischenfrage:**
> "Ich lösche 'Anfahrtspauschale 45 Euro' — richtig? Ja oder Nein?"

**Nach 'Ja':**
> "Position gelöscht. Neues Brutto: 3.825 Euro."

---

### 4.2 Löschen ohne Bestätigung abbrechen

**Input-Folge:**
1. "Streich die Anfahrtspauschale"
2. KI: "Soll ich löschen? Ja oder Nein?"
3. User: "Nein" oder "Lass das"

**Erwartete Antwort:**
> "Okay, nichts gelöscht. Was soll ich machen?"

---

## 5. Angebot → Rechnung (`angebot_zu_rechnung`) — KRITISCH

### 5.1 Annahme bekannt geben

**Input (Voice):**
> "Der Mueller hat angenommen, mach ne Rechnung draus"

**Erwartetes Verhalten:**
1. `angebot_suchen` für Mueller, Status ANGENOMMEN oder GESENDET
2. **Bestätigung** mit Nummer + Betrag
3. Erst nach "Ja" → `angebot_zu_rechnung`

**Erwartete KI-Zwischenfrage:**
> "Ich erstelle Rechnung aus Angebot AN-2026-047 (3.870 Euro netto) für Mueller — passt das?"

**Nach 'Ja':**
> "Rechnung RE-2026-012 erstellt. Brutto: 4.605,30 Euro."

---

### 5.2 Angebot noch nicht angenommen

**Input:**
> "Rechnung für Schulz draus machen"

**Angebot-Status: ENTWURF**

**Erwartete Antwort:**
> "Das Angebot für Schulz ist noch im Entwurf-Status. Zuerst als 'angenommen' markieren?"

---

## 6. Versenden (`dokument_versenden`) — KRITISCH

### 6.1 Angebot versenden

**Input:**
> "Schick das Angebot an Mueller"

**Erwartetes Verhalten:**
1. Angebot finden, E-Mail des Kunden laden
2. **Bestätigung** mit Betrag + E-Mail-Adresse
3. Erst nach "Ja" → `dokument_versenden`

**Erwartete KI-Zwischenfrage:**
> "Soll ich das Angebot (3.870 Euro netto) an mueller@email.de schicken? Ja oder Nein?"

---

## 7. Status abfragen (`status_abfragen`)

### 7.1 Angebots-Status

**Input:**
> "Was ist mit dem Angebot für Bäckerei Schulz?"

**Erwartete Antwort:**
> "Angebot AN-2026-039 für Bäckerei Schulz — Status: Gesendet, 2.340 Euro brutto, wartet auf Rückmeldung."

---

## 8. Übersicht (`uebersicht_abrufen`)

### 8.1 Offene Angebote

**Input:**
> "Welche Angebote sind noch offen?"

**Erwartetes Verhalten:**
- Bis 5 Angebote: als kurze Liste
- Mehr als 5: Zusammenfassung + Dashboard-Verweis

**Erwartete Antwort (Voice, 3 offen):**
> "3 offene Angebote: Mueller 3.870 Euro, Schmidt 1.240 Euro, Weber 890 Euro."

**Erwartete Antwort (Voice, 8 offen):**
> "Du hast 8 offene Angebote. Schau dir die vollständige Liste im Dashboard an."

---

### 8.2 Überfällige Rechnungen

**Input:**
> "Wer hat noch nicht gezahlt?"

**Erwartete Antwort:**
> "2 überfällige Rechnungen: Schulz (580 Euro, seit 12 Tagen) und Weber (1.200 Euro, seit 5 Tagen)."

---

## 9. Rechnung bezahlt markieren (`rechnung_status_aendern`) — KRITISCH

### 9.1 Einfache Bezahlung

**Input:**
> "Mueller hat bezahlt"

**Erwartetes Verhalten:**
1. Rechnung für Mueller suchen
2. **Bestätigung** mit Rechnungsnummer + Betrag
3. Erst nach "Ja" → `rechnung_status_aendern`

**Erwartete KI-Zwischenfrage:**
> "Soll ich Rechnung RE-2026-012 (4.605,30 Euro) als bezahlt markieren? Ja oder Nein?"

**Nach 'Ja':**
> "Rechnung RE-2026-012 als bezahlt markiert."

---

## 10. Fehlerbehandlung

### 10.1 Unverständliche Eingabe

**Input:**
> "Das Ding da mit dem Zeugs vom letzten Mal"

**Erwartete Antwort:**
> "Das hab ich nicht ganz verstanden. Kannst du das nochmal anders sagen?"

---

### 10.2 Keine Berechtigung / Gesperrtes Dokument

**Input:**
> "Rechnung RE-2026-001 stornieren"

**Rechnung-Status: gesperrt (GoBD)**

**Erwartete Antwort:**
> "Diese Rechnung ist gesperrt und kann nicht geändert werden."

---

### 10.3 Mehrere Angebote für Kunden

**Input:**
> "Nachtrag für Mueller — noch 2 Stunden"

**Mueller hat 3 offene Angebote**

**Erwartete Antwort:**
> "Mueller hat 3 offene Angebote. Welches meinst du — AN-2026-047 (Badezimmer), AN-2026-051 (Heizung) oder AN-2026-053 (Elektro)?"

---

## Voice-spezifische Regeln (Zusammenfassung)

| Regel | Beispiel |
|---|---|
| Maximal 3 Sätze | ✅ "Position hinzugefügt. Neues Brutto: 4.125 Euro." |
| Zahlen wiederholen | ✅ "3 Steckdosen, je 85 Euro, macht 255 Euro" |
| Keine Listen bei >5 Einträgen | ✅ "8 Angebote offen — Schau ins Dashboard" |
| Bestätigung mit Ja/Nein | ✅ "Soll ich löschen? Ja oder Nein?" |
| Kein Markdown | ✅ Kein **, keine #, keine Bullets in Sprachausgabe |

---

## Implementierungs-Checkliste

- [x] `buildSystemPrompt()` in `src/lib/ai/prompts.ts`
- [x] `HANDWERK_TOOLS` in `src/lib/ai/tools.ts` (13 Tools)
- [x] `executeTool()` in `src/lib/ai/tool-executor.ts`
- [x] `INTENT_KATALOG` in `src/lib/ai/intent-map.ts`
- [x] `extragiereKontext()` in `src/lib/ai/context-extractor.ts`
- [x] `formatiereVoiceAntwort()` in `src/lib/ai/voice-formatter.ts`
- [x] Chat-Route `/api/chat` mit SSE-Streaming
- [x] Voice-Route `/api/voice` mit vollständiger Pipeline (STT → KI → Voice-Format)
