import type Anthropic from "@anthropic-ai/sdk";

/**
 * KI-Voice-Architect: Tool-Definitionen für Claude
 *
 * Diese Tools repräsentieren die Intent-Katalog-Aktionen.
 * Claude nutzt Function Calling zur Intent-Erkennung.
 * Kritische Tools sind im System-Prompt mit Bestätigungspflicht markiert.
 */

export const HANDWERK_TOOLS: Anthropic.Tool[] = [
  {
    name: "kunde_suchen",
    description:
      "Sucht einen Kunden anhand des Namens. Gibt bis zu 5 Treffer zurück. Nutze dies wenn der Nutzer einen Kunden erwähnt bevor du andere Aktionen ausführst.",
    input_schema: {
      type: "object",
      properties: {
        suchbegriff: {
          type: "string",
          description:
            "Kundenname oder Teil davon, z.B. 'Müller', 'Mueller', 'Müllers'",
        },
      },
      required: ["suchbegriff"],
    },
  },
  {
    name: "angebot_erstellen",
    description:
      "Erstellt ein neues Angebot für einen Kunden. Erfordert mindestens Kunden-ID.",
    input_schema: {
      type: "object",
      properties: {
        kundeId: {
          type: "string",
          description: "ID des Kunden",
        },
        titel: {
          type: "string",
          description:
            "Kurze Beschreibung des Auftrags, z.B. 'Badsanierung Hauptstraße 5'",
        },
        positionen: {
          type: "array",
          description: "Optionale Positionen für das Angebot",
          items: {
            type: "object",
            properties: {
              beschreibung: { type: "string" },
              menge: { type: "number" },
              einheit: { type: "string" },
              einzelpreis: { type: "number" },
            },
            required: ["beschreibung", "menge", "einheit", "einzelpreis"],
          },
        },
      },
      required: ["kundeId"],
    },
  },
  {
    name: "position_hinzufuegen",
    description: "Fügt eine neue Position zu einem bestehenden Angebot hinzu.",
    input_schema: {
      type: "object",
      properties: {
        angebotId: {
          type: "string",
          description: "ID des Angebots",
        },
        beschreibung: {
          type: "string",
          description: "Bezeichnung der Position",
        },
        menge: {
          type: "number",
          description: "Menge",
        },
        einheit: {
          type: "string",
          description: "Einheit z.B. Stk, m², h, pauschal",
        },
        einzelpreis: {
          type: "number",
          description: "Preis pro Einheit in Euro",
        },
      },
      required: [
        "angebotId",
        "beschreibung",
        "menge",
        "einheit",
        "einzelpreis",
      ],
    },
  },
  {
    name: "position_aendern",
    description: "Ändert eine bestehende Position in einem Angebot.",
    input_schema: {
      type: "object",
      properties: {
        positionId: {
          type: "string",
          description: "ID der Position",
        },
        beschreibung: {
          type: "string",
          description: "Neue Bezeichnung (optional)",
        },
        menge: {
          type: "number",
          description: "Neue Menge (optional)",
        },
        einheit: {
          type: "string",
          description: "Neue Einheit (optional)",
        },
        einzelpreis: {
          type: "number",
          description: "Neuer Einzelpreis in Euro (optional)",
        },
      },
      required: ["positionId"],
    },
  },
  {
    name: "position_loeschen",
    description:
      "KRITISCHE AKTION: Löscht eine Position aus einem Angebot. NUR nach expliziter Bestätigung durch den Nutzer ausführen.",
    input_schema: {
      type: "object",
      properties: {
        positionId: {
          type: "string",
          description: "ID der zu löschenden Position",
        },
        bestaetigt: {
          type: "boolean",
          description:
            "Muss true sein — nur setzen wenn der Nutzer explizit 'Ja' gesagt hat",
        },
      },
      required: ["positionId", "bestaetigt"],
    },
  },
  {
    name: "status_abfragen",
    description: "Fragt den Status eines Angebots oder einer Rechnung ab.",
    input_schema: {
      type: "object",
      properties: {
        typ: {
          type: "string",
          enum: ["angebot", "rechnung"],
          description: "Art des Dokuments",
        },
        dokumentId: {
          type: "string",
          description: "ID des Angebots oder der Rechnung",
        },
      },
      required: ["typ", "dokumentId"],
    },
  },
  {
    name: "angebot_zu_rechnung",
    description:
      "KRITISCHE AKTION: Wandelt ein angenommenes Angebot in eine Rechnung um. NUR nach expliziter Bestätigung ausführen.",
    input_schema: {
      type: "object",
      properties: {
        angebotId: {
          type: "string",
          description: "ID des Angebots",
        },
        bestaetigt: {
          type: "boolean",
          description:
            "Muss true sein — nur setzen wenn der Nutzer explizit 'Ja' gesagt hat",
        },
      },
      required: ["angebotId", "bestaetigt"],
    },
  },
  {
    name: "dokument_versenden",
    description:
      "KRITISCHE AKTION: Versendet ein Angebot oder eine Rechnung per E-Mail. NUR nach expliziter Bestätigung ausführen.",
    input_schema: {
      type: "object",
      properties: {
        typ: {
          type: "string",
          enum: ["angebot", "rechnung"],
        },
        dokumentId: {
          type: "string",
          description: "ID des zu versendenden Dokuments",
        },
        empfaengerEmail: {
          type: "string",
          description:
            "E-Mail-Adresse des Empfängers (Standardmäßig Kunden-E-Mail)",
        },
        bestaetigt: {
          type: "boolean",
          description:
            "Muss true sein — nur setzen wenn der Nutzer explizit 'Ja' gesagt hat",
        },
      },
      required: ["typ", "dokumentId", "bestaetigt"],
    },
  },
  {
    name: "uebersicht_abrufen",
    description:
      "Gibt eine Übersicht über offene Angebote, Rechnungen oder Kunden. Voice-Modus: max. 5 Einträge.",
    input_schema: {
      type: "object",
      properties: {
        typ: {
          type: "string",
          enum: ["angebote", "rechnungen", "kunden"],
          description: "Was soll angezeigt werden",
        },
        status: {
          type: "string",
          description:
            "Optionaler Statusfilter z.B. 'ENTWURF', 'GESENDET', 'OFFEN'",
        },
        limit: {
          type: "number",
          description: "Maximale Anzahl Einträge (Standard: 10, Voice: 5)",
        },
      },
      required: ["typ"],
    },
  },
  {
    name: "rechnung_erstellen",
    description:
      "Erstellt eine neue Rechnung — entweder aus einem bestehenden Angebot oder direkt für einen Kunden. Biete dieses Tool proaktiv an wenn ein Angebot als angenommen markiert wird.",
    input_schema: {
      type: "object",
      properties: {
        kundeId: {
          type: "string",
          description: "ID des Kunden",
        },
        angebotId: {
          type: "string",
          description:
            "Optionale Angebots-ID — wenn angegeben, werden Positionen übernommen",
        },
        titel: {
          type: "string",
          description:
            "Kurze Beschreibung der Rechnung, z.B. 'Badsanierung Hauptstraße 5'",
        },
        faelligkeitTage: {
          type: "number",
          description:
            "Zahlungsziel in Tagen ab heute (Standard: 14)",
        },
        positionen: {
          type: "array",
          description:
            "Optionale Positionen — nur nötig wenn keine angebotId angegeben",
          items: {
            type: "object",
            properties: {
              beschreibung: { type: "string" },
              menge: { type: "number" },
              einheit: { type: "string" },
              einzelpreis: { type: "number" },
            },
            required: ["beschreibung", "menge", "einheit", "einzelpreis"],
          },
        },
      },
      required: ["kundeId"],
    },
  },
  {
    name: "rechnung_status_aendern",
    description:
      "KRITISCHE AKTION: Ändert den Status einer Rechnung auf bezahlt oder storniert. NUR nach expliziter Bestätigung ausführen.",
    input_schema: {
      type: "object",
      properties: {
        rechnungId: {
          type: "string",
          description: "ID der Rechnung",
        },
        neuerStatus: {
          type: "string",
          enum: ["BEZAHLT", "STORNIERT"],
          description: "Neuer Status der Rechnung",
        },
        bestaetigt: {
          type: "boolean",
          description:
            "Muss true sein — nur setzen wenn der Nutzer explizit 'Ja' gesagt hat",
        },
      },
      required: ["rechnungId", "neuerStatus", "bestaetigt"],
    },
  },
  {
    name: "rechnung_suchen",
    description:
      "Sucht Rechnungen nach Kunde, Rechnungsnummer oder Status. Gibt bis zu 10 Treffer zurück.",
    input_schema: {
      type: "object",
      properties: {
        kundeId: {
          type: "string",
          description: "Optionale Kunden-ID zum Filtern",
        },
        rechnungsnummer: {
          type: "string",
          description: "Optionale Rechnungsnummer oder Teil davon",
        },
        status: {
          type: "string",
          enum: ["ENTWURF", "GESENDET", "OFFEN", "BEZAHLT", "STORNIERT"],
          description: "Optionaler Statusfilter",
        },
        limit: {
          type: "number",
          description: "Maximale Anzahl Einträge (Standard: 10, Voice: 5)",
        },
      },
      required: [],
    },
  },
  {
    name: "ueberfaellige_rechnungen_liste",
    description:
      "Gibt eine Liste aller überfälligen Rechnungen zurück — also Rechnungen deren Zahlungsziel überschritten ist und die noch nicht bezahlt sind. Voice-Modus: max. 5 Einträge.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximale Anzahl Einträge (Standard: 10, Voice: 5)",
        },
      },
      required: [],
    },
  },
];

/**
 * Tool-Namen die eine kritische Aktion sind und Bestätigung benötigen.
 */
export const KRITISCHE_TOOLS = new Set([
  "position_loeschen",
  "angebot_zu_rechnung",
  "dokument_versenden",
  "rechnung_status_aendern",
]);

/**
 * Intent-Mapping: Tool-Name → menschenlesbare Beschreibung für Bestätigungs-Dialog
 */
export const TOOL_BESCHREIBUNG: Record<string, string> = {
  position_loeschen: "Position löschen",
  angebot_zu_rechnung: "Angebot in Rechnung umwandeln",
  dokument_versenden: "Dokument versenden",
  angebot_erstellen: "Angebot erstellen",
  position_hinzufuegen: "Position hinzufügen",
  position_aendern: "Position ändern",
  status_abfragen: "Status abfragen",
  uebersicht_abrufen: "Übersicht anzeigen",
  kunde_suchen: "Kunden suchen",
  rechnung_erstellen: "Rechnung erstellen",
  rechnung_status_aendern: "Rechnungsstatus ändern",
  rechnung_suchen: "Rechnungen suchen",
  ueberfaellige_rechnungen_liste: "Überfällige Rechnungen anzeigen",
};
