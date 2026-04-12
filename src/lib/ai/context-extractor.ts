/**
 * Kontext-Extraktor — Pre-LLM-Parser
 *
 * Analysiert die Nutzernachricht BEVOR sie an den LLM geht
 * und extrahiert strukturierten Kontext:
 * - Welcher Kunde ist gemeint?
 * - Welches Angebot/Rechnung?
 * - Welche Zahlen/Mengen wurden genannt?
 *
 * Ziel: Schnelle Vorverarbeitung, Fehlerreduktion, bessere System-Prompt-Injektion.
 */

export interface ExtrahierterKontext {
  /** Name-Fragment das nach Kundenname aussieht */
  kundenHinweis: string | null;
  /** Dokumenttyp der gemeint ist */
  dokumentTyp: "angebot" | "rechnung" | "beide" | null;
  /** Zahlen die explizit genannt wurden (Preise, Mengen) */
  genanntePraise: number[];
  genannteMenugen: { wert: number; einheit: string }[];
  /** Ob der Nutzer einen Nachtrag/Erweiterung meint */
  istNachtrag: boolean;
  /** Ob es sich um das "letzte" oder "neueste" Dokument handelt */
  neuestesGemeint: boolean;
  /** Rohtext nach Bereinigung */
  bereinigt: string;
}

// Häufige deutsche Einheiten im Handwerk
const EINHEITEN_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(stunde[n]?|std\.?|h\b|stk\.?|stueck|stücke?|qm|m²|m2|meter|ml?|liter|l\b|paar|pauschal|pauschalpreis|tag[e]?|woche[n]?)/gi;

const PREIS_PATTERN =
  /(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:euro|eur|€)/gi;

const KUNDEN_TRIGGER = [
  /\bfuer\s+(?:herrn?|frau|firma|die|den|das)?\s*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\b/,
  /\bbeim?\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\b/,
  /\bvon\s+(?:herrn?|frau|firma)?\s*([A-ZÄÖÜ][a-zäöüß]+)\b/,
  /\b([A-ZÄÖÜ][a-zäöüß]+)\s+(?:hat|hatte|will|soll|braucht)\b/,
];

const NACHTRAG_TRIGGER =
  /\b(nachtrag|noch|dazu|zus[äa]tzlich|kommen\s+noch|hinzu|ergaenzen)\b/i;

const NEUESTES_TRIGGER =
  /\b(letztes?|neuestes?|aktuelles?|j[üu]ngstes?)\s+(angebot|rechnung)\b/i;

export function extragiereKontext(nachricht: string): ExtrahierterKontext {
  const text = nachricht.trim();
  const bereinigt = text.replace(/\s+/g, " ");

  // Kundenname extrahieren
  let kundenHinweis: string | null = null;
  for (const pattern of KUNDEN_TRIGGER) {
    const match = bereinigt.match(pattern);
    if (match?.[1]) {
      kundenHinweis = match[1];
      break;
    }
  }

  // Dokumenttyp erkennen
  const hatAngebot = /\bangebot\b/i.test(bereinigt);
  const hatRechnung = /\brechnung\b/i.test(bereinigt);
  let dokumentTyp: ExtrahierterKontext["dokumentTyp"] = null;
  if (hatAngebot && hatRechnung) dokumentTyp = "beide";
  else if (hatAngebot) dokumentTyp = "angebot";
  else if (hatRechnung) dokumentTyp = "rechnung";

  // Preise extrahieren
  const genanntePraise: number[] = [];
  const preisMatches = bereinigt.matchAll(new RegExp(PREIS_PATTERN.source, "gi"));
  for (const m of preisMatches) {
    const zahl = parseFloat(m[1].replace(",", "."));
    if (!isNaN(zahl)) genanntePraise.push(zahl);
  }

  // Mengen mit Einheiten extrahieren
  const genannteMenugen: { wert: number; einheit: string }[] = [];
  const einheitMatches = bereinigt.matchAll(new RegExp(EINHEITEN_PATTERN.source, "gi"));
  for (const m of einheitMatches) {
    const wert = parseFloat(m[1].replace(",", "."));
    const einheit = normalisiereEinheit(m[2]);
    if (!isNaN(wert)) genannteMenugen.push({ wert, einheit });
  }

  return {
    kundenHinweis,
    dokumentTyp,
    genanntePraise,
    genannteMenugen,
    istNachtrag: NACHTRAG_TRIGGER.test(bereinigt),
    neuestesGemeint: NEUESTES_TRIGGER.test(bereinigt),
    bereinigt,
  };
}

function normalisiereEinheit(einheit: string): string {
  const e = einheit.toLowerCase().trim();
  if (/^(stunde[n]?|std\.?|h)$/.test(e)) return "h";
  if (/^(stk\.?|stueck|stück|stücke?)$/.test(e)) return "Stk";
  if (/^(qm|m²|m2)$/.test(e)) return "m²";
  if (/^(meter|m)$/.test(e)) return "m";
  if (/^(liter|l)$/.test(e)) return "l";
  if (/^(tag[e]?)$/.test(e)) return "Tag";
  if (/^(woche[n]?)$/.test(e)) return "Woche";
  if (/^(pauschal|pauschalpreis)$/.test(e)) return "pauschal";
  return e;
}

/**
 * Baut einen kompakten Kontext-Hinweis fuer den System-Prompt.
 * Wird in buildSystemPrompt() eingebettet wenn Kontext erkannt wurde.
 */
export function formatKontextHinweis(kontext: ExtrahierterKontext): string {
  const teile: string[] = [];

  if (kontext.kundenHinweis) {
    teile.push(`Genannter Kundenname: "${kontext.kundenHinweis}" — suche zuerst diesen Kunden.`);
  }
  if (kontext.dokumentTyp) {
    teile.push(`Dokument-Typ: ${kontext.dokumentTyp}`);
  }
  if (kontext.neuestesGemeint) {
    teile.push("Nutzer meint das neueste/letzte Dokument.");
  }
  if (kontext.istNachtrag) {
    teile.push("Nutzer moechte etwas hinzufuegen (Nachtrag/Erweiterung).");
  }
  if (kontext.genanntePraise.length > 0) {
    teile.push(`Genannte Preise: ${kontext.genanntePraise.map((p) => `${p.toFixed(2)} EUR`).join(", ")}`);
  }
  if (kontext.genannteMenugen.length > 0) {
    teile.push(
      `Genannte Mengen: ${kontext.genannteMenugen.map((m) => `${m.wert} ${m.einheit}`).join(", ")}`
    );
  }

  return teile.length > 0 ? `\n## Erkannter Kontext\n${teile.join("\n")}` : "";
}
