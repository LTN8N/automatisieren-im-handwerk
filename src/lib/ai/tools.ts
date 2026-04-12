import type OpenAI from "openai";

/**
 * Tool-Definitionen fuer OpenAI Function Calling.
 * Tools repraesentieren die Intent-Katalog-Aktionen.
 */

export const HANDWERK_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "kunde_suchen",
      description: "Sucht einen Kunden anhand des Namens. Gibt bis zu 5 Treffer zurueck.",
      parameters: {
        type: "object",
        properties: {
          suchbegriff: { type: "string", description: "Kundenname oder Teil davon" },
        },
        required: ["suchbegriff"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "angebot_erstellen",
      description: "Erstellt ein neues Angebot fuer einen Kunden. Erfordert mindestens Kunden-ID und Positionen.",
      parameters: {
        type: "object",
        properties: {
          kundeId: { type: "string", description: "ID des Kunden" },
          positionen: {
            type: "array",
            description: "Positionen fuer das Angebot",
            items: {
              type: "object",
              properties: {
                beschreibung: { type: "string" },
                menge: { type: "number" },
                einheit: { type: "string" },
                einzelpreis: { type: "number" },
                ustSatz: { type: "number", description: "USt-Satz in %, Standard 19" },
              },
              required: ["beschreibung", "menge", "einheit", "einzelpreis"],
            },
          },
        },
        required: ["kundeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "uebersicht_abrufen",
      description: "Gibt eine Uebersicht ueber offene Angebote, Rechnungen oder Kunden.",
      parameters: {
        type: "object",
        properties: {
          typ: { type: "string", enum: ["angebote", "rechnungen", "kunden"], description: "Was soll angezeigt werden" },
          status: { type: "string", description: "Optionaler Statusfilter" },
          limit: { type: "number", description: "Max Eintraege (Standard: 10)" },
        },
        required: ["typ"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "status_abfragen",
      description: "Fragt den Status eines Angebots oder einer Rechnung ab.",
      parameters: {
        type: "object",
        properties: {
          typ: { type: "string", enum: ["angebot", "rechnung"] },
          dokumentId: { type: "string", description: "ID des Angebots oder der Rechnung" },
        },
        required: ["typ", "dokumentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rechnung_erstellen",
      description: "Erstellt eine neue Rechnung fuer einen Kunden.",
      parameters: {
        type: "object",
        properties: {
          kundeId: { type: "string", description: "ID des Kunden" },
          angebotId: { type: "string", description: "Optional: Angebots-ID um Positionen zu uebernehmen" },
          faelligkeitTage: { type: "number", description: "Zahlungsziel in Tagen (Standard: 14)" },
          positionen: {
            type: "array",
            description: "Positionen (nur noetig wenn keine angebotId)",
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
  },
  {
    type: "function",
    function: {
      name: "angebot_zu_rechnung",
      description: "KRITISCH: Wandelt ein angenommenes Angebot in eine Rechnung um. Nur nach Bestaetigung.",
      parameters: {
        type: "object",
        properties: {
          angebotId: { type: "string" },
          bestaetigt: { type: "boolean", description: "Muss true sein" },
        },
        required: ["angebotId", "bestaetigt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dokument_versenden",
      description: "KRITISCH: Versendet Angebot oder Rechnung per E-Mail. Nur nach Bestaetigung.",
      parameters: {
        type: "object",
        properties: {
          typ: { type: "string", enum: ["angebot", "rechnung"] },
          dokumentId: { type: "string" },
          bestaetigt: { type: "boolean", description: "Muss true sein" },
        },
        required: ["typ", "dokumentId", "bestaetigt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ueberfaellige_rechnungen_liste",
      description: "Gibt alle ueberfaelligen Rechnungen zurueck.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max Eintraege (Standard: 10)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "zahlungserinnerung_senden",
      description: "Erstellt eine Zahlungserinnerung oder Mahnung fuer eine ueberfaellige Rechnung und sendet sie per E-Mail an den Kunden.",
      parameters: {
        type: "object",
        properties: {
          rechnungId: {
            type: "string",
            description: "ID der Rechnung, fuer die die Mahnung erstellt werden soll",
          },
          kundeName: {
            type: "string",
            description: "Name des Kunden (zur Suche, wenn rechnungId unbekannt)",
          },
          stufe: {
            type: "string",
            enum: ["ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2", "INKASSO"],
            description: "Mahnstufe. ERINNERUNG = Zahlungserinnerung, MAHNUNG_1 = 1. Mahnung, MAHNUNG_2 = 2. Mahnung, INKASSO = Inkasso-Uebergabe",
          },
          bestaetigt: {
            type: "boolean",
            description: "Muss true sein, damit die Mahnung tatsaechlich versendet wird",
          },
        },
        required: ["bestaetigt"],
      },
    },
  },
];

export const KRITISCHE_TOOLS = new Set([
  "angebot_zu_rechnung",
  "dokument_versenden",
  "zahlungserinnerung_senden",
]);

export const TOOL_BESCHREIBUNG: Record<string, string> = {
  angebot_zu_rechnung: "Angebot in Rechnung umwandeln",
  dokument_versenden: "Dokument versenden",
  angebot_erstellen: "Angebot erstellen",
  status_abfragen: "Status abfragen",
  uebersicht_abrufen: "Uebersicht anzeigen",
  kunde_suchen: "Kunden suchen",
  rechnung_erstellen: "Rechnung erstellen",
  ueberfaellige_rechnungen_liste: "Ueberfaellige Rechnungen anzeigen",
  zahlungserinnerung_senden: "Zahlungserinnerung / Mahnung senden",
};
