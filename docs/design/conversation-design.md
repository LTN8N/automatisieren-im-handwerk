# Conversation Design — Automatisieren im Handwerk

**Datum:** 2026-04-09
**Autor:** KI/Voice Architect Agent
**Status:** Draft — wartet auf Review

---

## 1. Design-Prinzipien

### 1.1 Zielgruppe

Handwerker auf der Baustelle. Dreckige Haende, wenig Zeit, kein Bock auf Buero.
Die KI muss sich anfuehlen wie ein kompetenter Buerokollege, der mitdenkt.

### 1.2 Grundregeln

| Regel | Begruendung |
|---|---|
| **Kurze Saetze** | Auf der Baustelle wird nicht gelesen, sondern gehoert |
| **Deutsch, informell, professionell** | "du" waere zu plump, aber kein Behoerdendeutsch |
| **Zahlen immer wiederholen** | Fehlervermeidung — 850 EUR vs. 580 EUR ist teuer |
| **Im Zweifel nachfragen** | Lieber einmal mehr fragen als falsch buchen |
| **Kritische Aktionen bestaetigen** | Senden, Loeschen, Konvertieren — nie ohne OK |
| **Kontext mitdenken** | "beim Mueller" = letztes offenes Dokument fuer Mueller |
| **Keine langen Listen per Voice** | Ab 5 Positionen: "Ich zeig dir das im Dashboard" |

### 1.3 Tonalitaet

- Kompetent, nicht ueberheblich
- Direkt, nicht barsch
- Handwerker-Sprache verstehen ("Steckdosen setzen", "Fliesen legen", "Rohr ziehen")
- Branchenuebergreifend: Klempner, Elektriker, Maler, Schreiner, Dachdecker, etc.
- Keine Emojis, keine Sternchen, kein Marketing-Sprech

**Gut:** "Alles klar. Angebot fuer Herrn Mueller ist erstellt."
**Schlecht:** "Super! Ich habe ein tolles Angebot fuer Ihren geschaetzten Kunden Herrn Mueller erstellt! :star:"

---

## 2. Intent-Katalog

### 2.1 Uebersicht

| Intent | Trigger-Beispiele | Kritisch? | Bestaetigung |
|---|---|---|---|
| `erstelle_angebot` | "Mach ein Angebot fuer...", "Neues Angebot..." | Nein | Zusammenfassung zeigen |
| `position_hinzufuegen` | "Fueg noch ... hinzu", "Da kommen noch ... dazu" | Nein | Position wiederholen |
| `position_aendern` | "Die ... waren eigentlich ...", "Aender mal ..." | Nein | Aenderung wiederholen |
| `position_loeschen` | "Streich die ...", "... faellt weg" | Ja | Explizite Bestaetigung |
| `status_abfragen` | "Was ist mit ...", "Wie steht es um ..." | Nein | Keine |
| `angebot_zu_rechnung` | "Der hat angenommen", "Mach ne Rechnung draus" | Ja | Explizite Bestaetigung |
| `nachtrag` | "Da kamen noch ... dazu", "Nachtrag fuer ..." | Nein | Zusammenfassung zeigen |
| `versenden` | "Schick das an ...", "Per Mail an ..." | Ja | Explizite Bestaetigung |
| `uebersicht` | "Welche ... sind offen", "Zeig mir alle ..." | Nein | Keine |

### 2.2 Detaillierte Intent-Definitionen

#### `erstelle_angebot`

**Beschreibung:** Nutzer will ein neues Angebot erstellen.

**Beispiel-Formulierungen (Handwerker-Sprache):**
1. "Erstell ein Angebot fuer Frau Schmidt, Heizungswartung"
2. "Ich war heute bei Herrn Mueller, Badezimmer-Sanierung. Dusche raus, neue Dusche rein, Fliesen 12qm."
3. "Mach mal ein Angebot — Kunde ist Baeckerei Schulz, Elektroverteiler tauschen"
4. "Neues Angebot fuer den Mueller, der will sein Bad machen lassen"
5. "Ich brauch ein Angebot. Kunde: Peters, Dachrinne erneuern, ca. 15 Meter"
6. "Schreib mal auf: Angebot fuer Frau Meier, Malerarbeiten Wohnzimmer 35qm"
7. "Der Huber will nen Kostenvoranschlag — neue Gastherme plus Einbau"
8. "Angebot machen: Firma Weber, 20 Steckdosen setzen und 5 Lichtschalter"

**Erforderliche Daten:**
- Kunde (Name oder Referenz)
- Leistungsbeschreibung (mindestens grob)

**Optionale Daten:**
- Positionen mit Preisen
- Mengen und Einheiten

**Verhalten:**
- Wenn Kunde unbekannt: Neuen Kunden anlegen oder nachfragen
- Wenn Positionen genannt: Direkt ins Angebot uebernehmen
- Wenn nur Beschreibung: Angebot als Entwurf anlegen, Positionen spaeter ergaenzen

---

#### `position_hinzufuegen`

**Beschreibung:** Nutzer will eine Position zu einem bestehenden Angebot/Rechnung hinzufuegen.

**Beispiel-Formulierungen:**
1. "Fueg beim Angebot Mueller noch 3 Steckdosen a 85 Euro hinzu"
2. "Da kommen noch 2 Stunden Arbeitszeit dazu, je 65 Euro"
3. "Zum Angebot Schmidt: Thermostatventile, 4 Stueck, 45 Euro pro Stueck"
4. "Pack noch ne Anfahrtspauschale von 45 Euro drauf"
5. "Beim Mueller fehlt noch die Entsorgung, pauschal 180 Euro"
6. "Fueg mal Silikon dazu, 3 Kartuschen a 12 Euro"
7. "Da muessen noch Kleinteile drauf, pauschal 95 Euro"

**Erforderliche Daten:**
- Welches Dokument (Kontext oder explizit)
- Beschreibung der Position
- Preis (Einzelpreis oder Pauschal)

**Optionale Daten:**
- Menge (Default: 1)
- Einheit (Stueck, Stunde, qm, lfm, pauschal)

---

#### `position_aendern`

**Beschreibung:** Nutzer will eine bestehende Position aendern.

**Beispiel-Formulierungen:**
1. "Die Arbeitszeit waren 6 Stunden, nicht 4"
2. "Aender mal den Preis fuer die Fliesen auf 120 Euro pro Quadratmeter"
3. "Bei Mueller: Die Duschkabine kostet doch 1.350 Euro, nicht 1.200"
4. "Statt 12 Quadratmeter Fliesen sind es 14"
5. "Die Steckdosen kosten 95, nicht 85"
6. "Aender die Beschreibung von 'Duschwanne' auf 'Walk-In Dusche bodentief'"
7. "Der Stundenlohn muss auf 72 Euro hoch"

**Erforderliche Daten:**
- Welches Dokument (Kontext)
- Welche Position (Beschreibung oder Nummer)
- Was aendern (Menge, Preis, Beschreibung)

---

#### `position_loeschen`

**Beschreibung:** Nutzer will eine Position entfernen. **Kritische Aktion — immer bestaetigen.**

**Beispiel-Formulierungen:**
1. "Streich die Anfahrtspauschale"
2. "Die Entsorgung faellt weg"
3. "Nimm die Thermostatventile raus"
4. "Loesch die letzte Position"
5. "Die Kleinteile brauchen wir doch nicht"
6. "Position 3 raus"

**Verhalten:**
- Immer zurueck lesen was geloescht wird, mit Preis
- Explizite Bestaetigung abwarten

---

#### `status_abfragen`

**Beschreibung:** Nutzer fragt nach dem Status eines Angebots oder einer Rechnung.

**Beispiel-Formulierungen:**
1. "Was ist mit dem Angebot fuer Baeckerei Schulz?"
2. "Hat Mueller schon gezahlt?"
3. "Wie steht es um die Rechnung fuer Frau Meier?"
4. "Ist das Angebot Schmidt schon raus?"
5. "Welchen Status hat die Rechnung Peters?"
6. "Gibt es Rueckmeldung vom Huber?"
7. "Wann hab ich das Angebot an Weber geschickt?"

---

#### `angebot_zu_rechnung`

**Beschreibung:** Nutzer will ein angenommenes Angebot in eine Rechnung umwandeln. **Kritische Aktion.**

**Beispiel-Formulierungen:**
1. "Der Mueller hat angenommen, mach ne Rechnung draus"
2. "Angebot Schmidt wurde beauftragt — Rechnung erstellen"
3. "Wandel das Angebot fuer Frau Meier in ne Rechnung um"
4. "Der Huber hat zugesagt, kannst die Rechnung schreiben"
5. "Aus dem Angebot Peters soll ne Rechnung werden"
6. "Auftrag ist da — Rechnung fuer Weber machen"

---

#### `nachtrag`

**Beschreibung:** Nutzer will Mehrarbeit/Zusatzpositionen zu einem bestehenden Auftrag ergaenzen.

**Beispiel-Formulierungen:**
1. "Beim Mueller-Auftrag kamen noch 2 Stunden Mehrarbeit dazu"
2. "Nachtrag fuer Schmidt: zusaetzliche Leitung verlegt, 3 Meter, 45 Euro pro Meter"
3. "Bei der Rechnung Meier fehlen noch die Fahrtkosten"
4. "Wir mussten beim Huber noch ne Absperrung machen, 120 Euro"
5. "Nachtrag: beim Peters war noch Asbest, Entsorgung 350 Euro"

**Verhalten:**
- Nachtrag wird als zusaetzliche Position(en) zum Dokument hinzugefuegt
- In der Aenderungshistorie als "Nachtrag" gekennzeichnet

---

#### `versenden`

**Beschreibung:** Nutzer will ein Dokument per E-Mail versenden. **Kritische Aktion.**

**Beispiel-Formulierungen:**
1. "Schick das Angebot an Mueller"
2. "Die Rechnung fuer Schmidt per Mail raus"
3. "Versende das Angebot an frau.meier@email.de"
4. "Schick die Rechnung Huber an die hinterlegte Adresse"
5. "Angebot Peters rausschicken"
6. "Mail an Weber mit dem Angebot"

**Verhalten:**
- PDF generieren
- E-Mail-Adresse pruefen (hinterlegt oder explizit genannt)
- Zusammenfassung zeigen: Dokument, Betrag, Empfaenger
- Explizite Bestaetigung

---

#### `uebersicht`

**Beschreibung:** Nutzer will eine Uebersicht ueber Angebote, Rechnungen oder Kunden.

**Beispiel-Formulierungen:**
1. "Welche Angebote sind noch offen?"
2. "Zeig mir alle unbezahlten Rechnungen"
3. "Was hab ich diese Woche geschrieben?"
4. "Wie viel steht noch aus?"
5. "Welche Rechnungen sind ueberfaellig?"
6. "Zeig mir die Angebote vom letzten Monat"
7. "Wie viel Umsatz hab ich diesen Monat gemacht?"

**Verhalten bei Voice:**
- Maximal 3-5 Eintraege vorlesen
- Bei mehr: Gesamtzahl nennen und aufs Dashboard verweisen

---

## 3. Kontext-Erkennung

### 3.1 Prinzip

Handwerker reden nicht in IDs und Referenznummern. Sie sagen "beim Mueller" oder "die Duschsanierung". Die KI muss das richtige Dokument finden.

### 3.2 Erkennungs-Strategien

| Nutzer sagt | KI sucht | Logik |
|---|---|---|
| "beim Mueller" | Letztes offenes Angebot/Rechnung fuer Kunde Mueller | Kundenname-Match, dann juengstes offenes Dokument |
| "die Duschsanierung" | Angebot mit passender Beschreibung | Semantischer Match auf Positionsbeschreibungen |
| "das letzte Angebot" | Chronologisch juengstes Angebot | Sortierung nach Erstelldatum, desc |
| "Angebot 47" | Angebot mit Nummer 47 | Exakter Nummern-Match |
| "die offene Rechnung Peters" | Offene Rechnung fuer Kunde Peters | Kundenname + Status-Filter |
| "das von gestern" | Gestern erstelltes Dokument | Datumsfilter auf gestrigen Tag |
| "mein letzter Auftrag" | Letzte Rechnung (oder angenommenes Angebot) | Juengstes Dokument mit Status "angenommen" oder "gesendet" |

### 3.3 Kontext-Kaskade

Wenn ein Dokument nicht eindeutig ist, wird in dieser Reihenfolge aufgeloest:

1. **Aktiver Kontext** — Wenn gerade ein Dokument offen/besprochen wird, bezieht sich alles darauf
2. **Explizite Referenz** — "Angebot 47", "Rechnung RE-2026-012"
3. **Kundenname + Status** — "beim Mueller" = offene Dokumente fuer Mueller
4. **Beschreibung** — "die Duschsanierung" = semantischer Match
5. **Zeitlich** — "das letzte", "von gestern", "diese Woche"

### 3.4 Disambiguierung

Wenn nach der Kaskade mehrere Dokumente in Frage kommen:

**Chat:**
```
Ich hab 3 offene Angebote fuer Mueller:
1. AN-2026-047 — Badsanierung (3.870 EUR) vom 05.04.
2. AN-2026-051 — Heizungswartung (890 EUR) vom 07.04.
3. AN-2026-053 — Rohrbruch Keller (1.240 EUR) vom 08.04.

Welches meinst du?
```

**Voice:**
```
Ich hab 3 offene Angebote fuer Mueller. Das neueste ist vom 8. April:
Rohrbruch Keller, 1.240 Euro. Meinst du das?
```

---

## 4. Bestaetigungsdialoge

### 4.1 Wann bestaetigt wird

| Aktion | Bestaetigung | Grund |
|---|---|---|
| Angebot erstellen | Zusammenfassung zeigen | Nicht kritisch, aber hilfreich |
| Position hinzufuegen | Position wiederholen | Zahlenfehler vermeiden |
| Position aendern | Aenderung wiederholen | Zahlenfehler vermeiden |
| **Position loeschen** | **Explizit bestaetigen** | Datenverlust |
| Status abfragen | Keine | Nur lesen |
| **Angebot zu Rechnung** | **Explizit bestaetigen** | Rechtlich relevant |
| Nachtrag | Zusammenfassung zeigen | Wie "Position hinzufuegen" |
| **Versenden** | **Explizit bestaetigen** | Unwiderruflich, extern sichtbar |
| Uebersicht | Keine | Nur lesen |

### 4.2 Bestaetigungs-Templates

#### Angebot erstellt (Zusammenfassung)
```
Alles klar. Angebot fuer {Kundenname} erstellt:
- {Position 1}: {Menge} x {Einzelpreis} = {Gesamt} EUR
- {Position 2}: {Menge} x {Einzelpreis} = {Gesamt} EUR
- Netto: {Netto} EUR
- USt ({Satz}%): {USt} EUR  
- Brutto: {Brutto} EUR

Soll ich es als PDF generieren?
```

#### Position hinzugefuegt
```
Eingetragen: {Beschreibung}, {Menge} {Einheit} a {Einzelpreis} EUR = {Gesamt} EUR.
Neuer Gesamtbetrag: {Netto} EUR netto.
```

#### Position loeschen (Bestaetigung erforderlich)
```
Ich loesche '{Beschreibung}' ({Gesamt} EUR) — stimmt das?
```

#### Angebot zu Rechnung (Bestaetigung erforderlich)
```
Ich erstelle Rechnung {RE-Nummer} aus Angebot {AN-Nummer} ({Netto} EUR netto) fuer {Kundenname}. Passt das?
```

#### Versenden (Bestaetigung erforderlich)
```
Ich schicke {Dokumenttyp} {Nummer} ({Brutto} EUR brutto) an {Email}.
Soll ich absenden?
```

### 4.3 Bestaetigung per Voice

Bei Voice-Antworten:
- Einfaches "Ja" / "Nein" / "Passt" / "Mach das" akzeptieren
- Bei "Nein": Nachfragen was geaendert werden soll
- Timeout nach 30 Sekunden: "Soll ich weiter warten oder abbrechen?"

---

## 5. Fehlerbehandlung

### 5.1 Unklarer Kunde

**Kein Match:**
```
Ich kenn keinen Kunden mit dem Namen '{Input}'. 
Soll ich einen neuen Kunden anlegen?
```

**Mehrere Matches:**
```
Ich hab zwei Muellers:
- Thomas Mueller, Hauptstr. 12 (Badezimmer)
- Maria Mueller, Bergweg 5 (Heizung)
Welchen meinst du?
```

### 5.2 Unklares Dokument

**Kein offenes Dokument:**
```
Fuer {Kundenname} hab ich gerade kein offenes Angebot. 
Soll ich ein neues erstellen?
```

**Mehrere offene Dokumente:**
Siehe Abschnitt 3.4 Disambiguierung.

### 5.3 Unverstaendliche Eingabe

**Stufe 1 — Hoeflich nachfragen:**
```
Das hab ich nicht ganz verstanden. Kannst du das nochmal anders sagen?
```

**Stufe 2 — Konkreter nachfragen (nach 2. Fehlversuch):**
```
Ich komm nicht ganz mit. Was moechtest du machen?
- Neues Angebot erstellen?
- Bestehendes Angebot bearbeiten?
- Rechnung schreiben?
```

**Stufe 3 — Auf manuelle Eingabe verweisen (nach 3. Fehlversuch):**
```
Tut mir leid, ich versteh es nicht. Am besten machst du das direkt im Dashboard — da kannst du alles manuell eingeben.
```

### 5.4 Fehlende Pflichtdaten

```
Fuer das Angebot brauch ich noch den Kundennamen. Fuer wen soll das sein?
```

```
Was soll die Position kosten? Ich brauch mindestens einen Preis.
```

### 5.5 Technische Fehler

```
Da ist gerade was schiefgegangen. Versuch es nochmal — wenn es wieder nicht klappt, meld dich beim Support.
```

---

## 6. Voice-spezifische Regeln

### 6.1 Ausgabe-Regeln

| Regel | Beispiel |
|---|---|
| Max 2-3 Saetze pro Antwort | Keine langen Erklaerungen |
| Zahlen immer wiederholen | "3 Steckdosen, je 85 Euro, macht 255 Euro" |
| Keine Listen > 5 Eintraege | "Du hast 12 offene Angebote. Die 3 neuesten sind..." |
| Bei langen Listen: Dashboard | "Ich zeig dir das im Dashboard, da hast du die volle Uebersicht." |
| Waehrung immer nennen | "1.200 Euro", nie nur "1.200" |
| Nummern buchstabieren bei Bedarf | "Angebot Nummer 47, vier-sieben" |

### 6.2 Eingabe-Toleranz

Die KI muss verstehen:
- Dialekt-Varianten: "nee" = nein, "jo" = ja, "passt scho" = ja
- Abkuerzungen: "qm" = Quadratmeter, "lfm" = laufender Meter, "Std" = Stunde
- Handwerker-Jargon: "Dose setzen" = Steckdose installieren, "Strang ziehen" = Rohrleitung verlegen
- Ungenaue Zahlen: "so um die 1.200" = ca. 1.200 EUR (nachfragen ob exakt)
- Umgangssprachlich: "Pack da noch was drauf" = Position hinzufuegen (nachfragen was)

### 6.3 Voice-Conversation-Flows

#### Flow: Neues Angebot per Voice

```
Nutzer: "Ich war gerade bei Herrn Mueller, der will sein Bad neu machen. 
        Dusche raus, neue reinbauen, Fliesen 12 Quadratmeter."

KI:     "Alles klar. Angebot fuer Herrn Mueller — Badsanierung:
        Demontage Dusche, neue Dusche einbauen, 12 Quadratmeter Fliesen.
        Hast du schon Preise oder soll ich den Entwurf erstmal so anlegen?"

Nutzer: "Dusche raus 340, neue Dusche mit Einbau 890, 
        Fliesen 120 pro Quadratmeter."

KI:     "Eingetragen:
        Demontage 340 Euro.
        Neue Dusche mit Einbau 890 Euro.
        Fliesen 12 Quadratmeter, je 120 Euro, macht 1.440 Euro.
        Netto gesamt: 2.670 Euro. Passt das?"

Nutzer: "Ja. Und schick das gleich an den Mueller."

KI:     "Ich schicke Angebot AN-2026-047 ueber 2.670 Euro netto
        an mueller@email.de. Soll ich absenden?"

Nutzer: "Ja, mach das."

KI:     "Ist raus. Mueller bekommt das Angebot per Mail."
```

#### Flow: Position aendern per Voice

```
Nutzer: "Beim Mueller — die Arbeitszeit waren 6 Stunden, nicht 4."

KI:     "Beim Angebot Mueller, Badsanierung: 
        Arbeitszeit von 4 auf 6 Stunden geaendert.
        Neuer Betrag: 390 Euro statt 260 Euro.
        Netto gesamt jetzt: 2.800 Euro."
```

#### Flow: Kontext-Wechsel

```
Nutzer: "Was ist eigentlich mit dem Angebot fuer die Baeckerei Schulz?"

KI:     "Angebot AN-2026-044 fuer Baeckerei Schulz — Elektroverteiler.
        Status: Gesendet am 3. April. Noch keine Rueckmeldung.
        Betrag: 4.200 Euro netto."

Nutzer: "Und beim Peters?"

KI:     "Fuer Peters hab ich ein offenes Angebot: Dachrinne erneuern,
        980 Euro netto, noch nicht gesendet. Soll ich es fertig machen?"
```

---

## 7. Conversation States

### 7.1 State Machine

```
[Idle] --user-input--> [Intent-Erkennung]
                            |
              +-------------+-------------+
              |             |             |
         [Kontext         [Daten      [Direkte
          aufloesen]       sammeln]    Aktion]
              |             |             |
              +------+------+             |
                     |                    |
              [Bestaetigung?]------nein---+
                     |                    |
                    ja                    |
                     |                    |
              [Warte auf              [Ausfuehren]
               Bestaetigung]              |
                     |                    |
                ja / nein                 |
                 |     |                  |
          [Ausfuehren] |                  |
                 |     |                  |
                 +--+--+                  |
                    |                     |
              [Ergebnis               [Ergebnis
               melden]                melden]
                    |                     |
                    +----------+----------+
                               |
                            [Idle]
```

### 7.2 Aktiver Kontext

Waehrend einer Sitzung merkt sich die KI:
- **Aktives Dokument** — Das zuletzt besprochene Angebot/Rechnung
- **Aktiver Kunde** — Der zuletzt besprochene Kunde
- **Letzte Aktion** — Was zuletzt gemacht wurde (fuer "mach das nochmal" oder "rueckgaengig")

Der Kontext wird zurueckgesetzt:
- Nach 5 Minuten Inaktivitaet (Voice)
- Nach explizitem Themenwechsel
- Nach Session-Ende

---

## 8. Testbare Szenarien

Jeder Flow muss testbar sein: Input -> erwarteter Output.

### 8.1 Test-Matrix

| # | Input | Erwarteter Intent | Erwarteter Output (Kern) |
|---|---|---|---|
| T01 | "Erstell ein Angebot fuer Frau Schmidt" | `erstelle_angebot` | Neues Angebot, Kunde: Schmidt |
| T02 | "Fueg 3 Steckdosen a 85 Euro hinzu" | `position_hinzufuegen` | Position: 3x Steckdose, 85 EUR |
| T03 | "Streich die Anfahrtspauschale" | `position_loeschen` | Bestaetigung: "Loesche Anfahrtspauschale X EUR?" |
| T04 | "Was ist mit dem Angebot Mueller?" | `status_abfragen` | Status des juengsten Mueller-Angebots |
| T05 | "Mueller hat angenommen" | `angebot_zu_rechnung` | Bestaetigung: "Rechnung aus Angebot erstellen?" |
| T06 | "Schick das an Mueller" | `versenden` | Bestaetigung: "Dokument X an mueller@email.de?" |
| T07 | "Welche Angebote sind offen?" | `uebersicht` | Liste offener Angebote (max 5 per Voice) |
| T08 | "Beim Mueller noch 2 Stunden dazu" | `nachtrag` | Position: 2x Stunde Mehrarbeit |
| T09 | "Die Fliesen waren 14qm, nicht 12" | `position_aendern` | Menge von 12 auf 14 geaendert |
| T10 | "Beim Mueller" (ohne weiteren Kontext) | Kontext setzen | "Du meinst Angebot AN-2026-047, Badsanierung?" |
| T11 | "Mach mal" (unklar) | Fehler | "Was moechtest du machen?" |
| T12 | "Angebot fuer..." (abbricht) | Fehlende Daten | "Fuer welchen Kunden?" |
