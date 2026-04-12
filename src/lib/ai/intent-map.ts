/**
 * Intent-Katalog fuer die Handwerker-KI.
 *
 * Jeder Intent hat:
 * - id:          Tool-Name (mappt auf HANDWERK_TOOLS)
 * - beschreibung: Was der Nutzer will
 * - beispiele:   Typische Saetze vom Baustellen-Kontext
 * - trigger:     Regex-Patterns fuer optionale Pre-LLM-Erkennung
 * - kritisch:    Bestaetigung erforderlich?
 */

export interface IntentDefinition {
  id: string;
  beschreibung: string;
  beispiele: string[];
  trigger: RegExp[];
  kritisch: boolean;
}

export const INTENT_KATALOG: IntentDefinition[] = [
  {
    id: "angebot_erstellen",
    beschreibung: "Neues Angebot fuer einen Kunden erstellen",
    beispiele: [
      "Mach ein Angebot fuer Herrn Mueller, Badsanierung",
      "Neues Angebot fuer Frau Schmidt, Heizungseinbau",
      "Erstell ein Angebot fuer die Baeckerei Schulz",
      "Ich war heute bei Mueller — Dusche raus, neue rein, 12qm Fliesen",
      "Angebot fuer Weber, Elektroinstallation Kueche",
    ],
    trigger: [
      /\b(mach|erstell|neues?)\s+(ein\s+)?angebot\b/i,
      /\bangebot\s+fuer\b/i,
      /\bich\s+war\s+(heute|gestern|gerade)\s+bei\b/i,
    ],
    kritisch: false,
  },
  {
    id: "angebot_suchen",
    beschreibung: "Bestehendes Angebot suchen oder anzeigen",
    beispiele: [
      "Zeig mir das Angebot Mueller",
      "Was steht im Angebot fuer Schmidt?",
      "Angebot Badsanierung aufmachen",
      "Das Angebot von letzter Woche fuer Weber",
      "Hol das letzte Angebot fuer Frau Schulz raus",
    ],
    trigger: [
      /\b(zeig|zeige|oeffne?|hol)\s+(mir\s+)?(das\s+)?angebot\b/i,
      /\bangebot\s+(fuer|von|beim?)\b/i,
    ],
    kritisch: false,
  },
  {
    id: "position_hinzufuegen",
    beschreibung: "Position zu einem Angebot hinzufuegen",
    beispiele: [
      "Fueg beim Mueller noch 3 Steckdosen a 85 Euro hinzu",
      "Da kommen noch 2 Stunden Mehrarbeit dazu",
      "Noch ein Warmwasserspeicher, 1.200 Euro",
      "Nachtrag: 4 Meter Kupferrohr a 12 Euro",
      "Beim Schulz-Angebot noch Anfahrt 45 Euro",
      "Position hinzufuegen: Abdichtung 320 Euro",
    ],
    trigger: [
      /\b(fueg|fuegte?|noch|nachtrag|dazu(kommen)?)\b.*\b(position|stunde|meter|stueck|euro)\b/i,
      /\b(position|pos\.?)\s+(hinzufuegen|ergaenzen|einfuegen)\b/i,
      /\bkommen\s+noch\b.*\b(dazu|hinzu)\b/i,
    ],
    kritisch: false,
  },
  {
    id: "position_aendern",
    beschreibung: "Bestehende Position in einem Angebot aendern",
    beispiele: [
      "Die Arbeitszeit waren 6 Stunden, nicht 4",
      "Aender die Fliesen auf 15 Quadratmeter",
      "Preis fuer den Warmwasserspeicher war 1.350 Euro",
      "Beim Mueller — Dusche kostet 950 nicht 890",
      "Position Anfahrt aendern auf 55 Euro",
    ],
    trigger: [
      /\b(aender|aendere|korrigier|war\s+eigentlich|nicht\s+\d|statt)\b/i,
      /\b(position|preis|menge|stunden?|quadratmeter)\s+(aendern|korrigieren)\b/i,
      /\bwaren?\s+\d+/i,
    ],
    kritisch: false,
  },
  {
    id: "position_loeschen",
    beschreibung: "Position aus einem Angebot entfernen",
    beispiele: [
      "Streich die Anfahrtspauschale",
      "Die Abdichtung faellt weg",
      "Position Warmwasserspeicher loeschen",
      "Das brauchen wir nicht mehr — Heizungsinspektion raus",
      "Beim Mueller die Entsorgung streichen",
    ],
    trigger: [
      /\b(streich|loeschem?|faellt\s+weg|raus|entfern|weg)\b/i,
      /\b(position|pos\.?)\s+(loeschen|entfernen|streichen)\b/i,
    ],
    kritisch: true,
  },
  {
    id: "status_abfragen",
    beschreibung: "Status eines Angebots oder einer Rechnung abfragen",
    beispiele: [
      "Was ist mit dem Angebot Mueller?",
      "Wie steht es um die Rechnung Schmidt?",
      "Hat Schulz das Angebot angenommen?",
      "Was ist der Status von AN-2026-047?",
      "Ist die Rechnung Weber schon bezahlt?",
    ],
    trigger: [
      /\b(was\s+ist|wie\s+steht|status|angenommen|bezahlt|abgelehnt)\b/i,
      /\b(angebot|rechnung)\s+(mueller|schmidt|schulz|weber|\w+)\b.*\b(status|aktuell)\b/i,
    ],
    kritisch: false,
  },
  {
    id: "angebot_zu_rechnung",
    beschreibung: "Angenommenes Angebot in Rechnung umwandeln",
    beispiele: [
      "Der Mueller hat angenommen, mach ne Rechnung draus",
      "Angebot Schmidt ist durch — Rechnung erstellen",
      "Rechnung aus Angebot AN-2026-047",
      "Auftrag bestaetigt, jetzt Rechnung",
      "Schmidt hat unterschrieben — Rechnung draus machen",
    ],
    trigger: [
      /\b(hat\s+angenommen|ist\s+durch|hat\s+unterschrieben|auftrag\s+bestae?tigt)\b/i,
      /\brechnung\s+(draus|daraus|erstellen)\b/i,
      /\bangebot\s+zu\s+rechnung\b/i,
    ],
    kritisch: true,
  },
  {
    id: "rechnung_erstellen",
    beschreibung: "Neue Rechnung direkt erstellen (ohne Angebot)",
    beispiele: [
      "Rechnung fuer Weber erstellen, Rohrreinigung 380 Euro",
      "Neue Rechnung fuer Frau Schmidt",
      "Direkt Rechnung machen fuer Baeckerei Schulz",
    ],
    trigger: [
      /\b(neue?|direkt)\s+rechnung\b/i,
      /\brechnung\s+erstellen\b/i,
    ],
    kritisch: false,
  },
  {
    id: "rechnung_status_aendern",
    beschreibung: "Rechnung als bezahlt markieren oder stornieren",
    beispiele: [
      "Mueller hat bezahlt",
      "Rechnung Schmidt ist bezahlt",
      "RE-2026-012 als bezahlt markieren",
      "Rechnung Weber stornieren",
      "Die Rechnung von Schulz ist eingegangen",
    ],
    trigger: [
      /\b(hat\s+bezahlt|ist\s+bezahlt|als\s+bezahlt|eingegangen)\b/i,
      /\brechnung\s+stornieren\b/i,
    ],
    kritisch: true,
  },
  {
    id: "dokument_versenden",
    beschreibung: "Angebot oder Rechnung per E-Mail versenden",
    beispiele: [
      "Schick das Angebot an Mueller",
      "Per Mail an mueller@email.de schicken",
      "Rechnung Schmidt versenden",
      "Angebot rausschicken",
      "An die E-Mail von Weber schicken",
    ],
    trigger: [
      /\b(schick|sende?|versende?|rausschicken)\b/i,
      /\bper\s+mail\b/i,
    ],
    kritisch: true,
  },
  {
    id: "uebersicht_abrufen",
    beschreibung: "Uebersicht ueber Angebote, Rechnungen oder Kunden",
    beispiele: [
      "Welche Angebote sind noch offen?",
      "Zeig mir alle offenen Rechnungen",
      "Was hab ich alles laufen?",
      "Uebersicht Angebote",
      "Wie viele offene Rechnungen hab ich?",
      "Alle Kunden anzeigen",
    ],
    trigger: [
      /\b(alle|offene?n?|uebersicht|liste|zeig\s+mir\s+alle)\b.*\b(angebote?|rechnungen?|kunden)\b/i,
      /\bwas\s+hab\s+ich\s+alles\b/i,
    ],
    kritisch: false,
  },
  {
    id: "ueberfaellige_rechnungen_liste",
    beschreibung: "Ueberfaellige Rechnungen anzeigen",
    beispiele: [
      "Wer hat noch nicht gezahlt?",
      "Ueberfaellige Rechnungen zeigen",
      "Was ist ueberfaellig?",
      "Offene Zahlungen?",
      "Wer ist noch im Rueckstand?",
    ],
    trigger: [
      /\b(ueberfaellig|noch\s+nicht\s+gezahlt|offene\s+zahlungen?|rueckstand)\b/i,
    ],
    kritisch: false,
  },
  {
    id: "kunde_suchen",
    beschreibung: "Kunden suchen oder anzeigen",
    beispiele: [
      "Suche Kunde Mueller",
      "Gibt es einen Herrn Schmidt bei uns?",
      "Kunden Weber",
      "Adresse von Schulz",
    ],
    trigger: [
      /\b(such|suche|gibt\s+es|kunden?|adresse\s+von)\b.*\b(mueller|schmidt|schulz|weber|\w+)\b/i,
      /\bkunden?\s+suchen\b/i,
    ],
    kritisch: false,
  },

  // -------------------------------------------------------------------------
  // Wartungsmanager-Intents
  // -------------------------------------------------------------------------
  {
    id: "wartung_faellig_abfragen",
    beschreibung: "Fällige oder überfällige Wartungseinträge abfragen",
    beispiele: [
      "Welche Wartungen sind diese Woche fällig?",
      "Was steht diese Woche an?",
      "Gibt es überfällige Wartungen?",
      "Was ist noch offen bei den Wartungen?",
      "Welche Wartungen stehen im März an?",
      "Was ist beim Gebäude Mueller zu tun?",
    ],
    trigger: [
      /\b(wartung|wartungen)\s+(f.+llig|diese\s+woche|diesen\s+monat|.+berfällig|offen)\b/i,
      /\bwas\s+steht\s+(an|diese\s+woche|heute)\b/i,
      /\b(.+berfällige?|f.+llige?)\s+wartung\b/i,
    ],
    kritisch: false,
  },
  {
    id: "wartungsplan_status",
    beschreibung: "Status eines Wartungsplans oder Objekts abfragen",
    beispiele: [
      "Wie weit sind wir mit Gebäude Mueller?",
      "Sind alle März-Wartungen bei Schmidt durch?",
      "Was ist der Stand beim Schulz-Objekt?",
      "Wie viele Wartungen sind beim Weber schon erledigt?",
    ],
    trigger: [
      /\b(wie\s+weit|wie\s+viele|wie\s+ist\s+der\s+stand|stand)\b.*\b(wartung|geb.ude|objekt)\b/i,
      /\bwartungsplan\s+(status|stand|fortschritt)\b/i,
      /\bsind\s+alle\s+\w+-wartungen?\s+(durch|erledigt|fertig)\b/i,
    ],
    kritisch: false,
  },
  {
    id: "vertrag_suchen",
    beschreibung: "Wartungsvertrag suchen oder anzeigen",
    beispiele: [
      "Zeig den Wartungsvertrag von Schmidt",
      "Was steht im Vertrag Mueller?",
      "Vertrag Bäckerei Schulz",
      "Welche Objekte hat Weber im Vertrag?",
    ],
    trigger: [
      /\b(zeig|oeffne?|was\s+steht|vertrag)\s+(den\s+)?(wartungs)?vertrag\b/i,
      /\b(wartungs)?vertrag\s+(von|bei|fuer)\b/i,
    ],
    kritisch: false,
  },
  {
    id: "wartungseintrag_abhaken",
    beschreibung: "Wartungseintrag als erledigt markieren",
    beispiele: [
      "Heizungsinspektion Gebäude Mueller ist erledigt",
      "Wartung beim Schmidt abhaken",
      "Das ist fertig — Klimaanlage Weber",
      "Markier die Heizungswartung als erledigt",
    ],
    trigger: [
      /\b(erledigt|fertig|abhaken?|abgehakt|gemacht|durch)\b.*\b(wartung|inspektion|heizung|klima)\b/i,
      /\bwartung\b.*\b(erledigt|fertig|abhaken?)\b/i,
      /\bals\s+erledigt\s+markier\b/i,
    ],
    kritisch: true,
  },
];

/**
 * Schaut sich die Nachricht an und gibt den wahrscheinlichsten Intent zurueck.
 * Nur fuer schnelle Vorfilterung — die echte Intent-Erkennung uebernimmt der LLM.
 */
export function hinteIntent(nachricht: string): string | null {
  const normalized = nachricht.toLowerCase().trim();

  for (const intent of INTENT_KATALOG) {
    for (const pattern of intent.trigger) {
      if (pattern.test(normalized)) {
        return intent.id;
      }
    }
  }

  return null;
}
