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
];

export const KRITISCHE_TOOLS = new Set([
  "angebot_zu_rechnung",
  "dokument_versenden",
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
};
