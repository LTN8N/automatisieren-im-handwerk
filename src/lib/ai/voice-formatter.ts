/**
 * Voice-Formatter — Post-LLM-Aufbereitung fuer Sprachausgabe
 *
 * Handwerker hoeren die Antwort per TTS (Text-to-Speech).
 * Regeln:
 * - Max 2-3 kurze Saetze
 * - Keine Markdown-Formatierung
 * - Zahlen natuerlich sprechen: "3.870 Euro" → "dreitausend achthundert siebzig Euro"
 * - Bei langen Listen: Kuerzen und auf Dashboard verweisen
 * - Bestaetigungsfragen am Ende behalten
 */

const MAX_VOICE_SAETZE = 3;
const MAX_VOICE_ZEICHEN = 280; // ca. 15 Sekunden TTS

/** Entfernt Markdown-Formatierung aus dem Text */
function entferneMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")           // **fett** → fett
    .replace(/\*(.*?)\*/g, "$1")               // *kursiv* → kursiv
    .replace(/#{1,6}\s+/g, "")                 // Ueberschriften entfernen
    .replace(/`(.*?)`/g, "$1")                 // Code-Spans entfernen
    .replace(/^[-*•]\s+/gm, "")               // Aufzaehlungs-Bullets entfernen
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // Links: nur Text behalten
    .replace(/\n{2,}/g, " ")                   // Doppelte Zeilenumbrueche → Leerzeichen
    .replace(/\n/g, " ")                       // Einzelne Zeilenumbrueche → Leerzeichen
    .trim();
}

/** Kuerzt zu lange Antworten auf max N Saetze */
function kuerzeAufSaetze(text: string, maxSaetze: number): string {
  // Saetze aufteilen (Punkt, Ausrufezeichen, Fragezeichen)
  const saetze = text.match(/[^.!?]+[.!?]+/g) ?? [text];

  if (saetze.length <= maxSaetze) return text;

  // Pruefen ob die letzte Zeile eine Bestaetigungsfrage ist
  const letzterSatz = saetze[saetze.length - 1];
  const istFrage = letzterSatz.trim().endsWith("?");

  if (istFrage && saetze.length > 1) {
    // Kuerze Mitte, behalte die Frage am Ende
    const behalte = saetze.slice(0, maxSaetze - 1).concat([letzterSatz]);
    return behalte.join(" ").trim();
  }

  return saetze.slice(0, maxSaetze).join(" ").trim();
}

/**
 * Erkennt ob Text eine lange Liste enthaelt (mehr als 5 Positionen)
 * und ersetzt sie mit einem Dashboard-Verweis.
 */
function behandleLangeListen(text: string): string {
  // Zeilen die wie Positionen oder Listenpunkte aussehen
  const zeilenMitPunkten = (text.match(/\n/g) ?? []).length;
  const aufzaehlungen = (text.match(/^[-•*\d]+[\.\)]/gm) ?? []).length;

  if (zeilenMitPunkten > 5 || aufzaehlungen > 5) {
    // Ersten Satz behalten, Rest durch Dashboard-Hinweis ersetzen
    const ersteSaetze = text.match(/[^.!?]+[.!?]+/g) ?? [];
    const intro = ersteSaetze.slice(0, 2).join(" ");
    return `${intro} Schau dir die vollstaendige Liste im Dashboard an.`;
  }

  return text;
}

/** Haengt Zahlen-Wiederholung an kritische Betraege an */
function wiederholeBetrag(text: string): string {
  // Nur bei einer zentralen Summe — nicht bei jeder Zahl
  const gesamtMatch = text.match(/gesamt[:\s]+(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:euro|eur|€)/i);
  if (gesamtMatch) {
    const betragStr = gesamtMatch[1];
    const betrag = parseFloat(betragStr.replace(/\./g, "").replace(",", "."));
    if (!isNaN(betrag) && betrag > 0) {
      const gesprochen = formatiereBetragAlsText(betrag);
      // Duplikat vermeiden
      if (!text.includes(gesprochen)) {
        return text.replace(
          gesamtMatch[0],
          `${gesamtMatch[0]} — ${gesprochen}`
        );
      }
    }
  }
  return text;
}

/** Formatiert einen Betrag als deutschen Text fuer TTS */
function formatiereBetragAlsText(betrag: number): string {
  // Vereinfachte Ausgabe fuer TTS: "3870 Euro" → "dreitausend achthundert siebzig Euro"
  // Wir nutzen Intl.NumberFormat fuer die Ziffern — TTS-Systeme koennen das lesen
  const formatted = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(betrag);
  return formatted;
}

/**
 * Hauptfunktion: Optimiert eine KI-Antwort fuer Sprachausgabe.
 *
 * @param text       Rohe LLM-Antwort
 * @param maxSaetze  Maximale Satzanzahl (Standard: 3)
 */
export function formatiereVoiceAntwort(
  text: string,
  maxSaetze: number = MAX_VOICE_SAETZE
): string {
  if (!text?.trim()) return "Das hat leider nicht geklappt. Versuch es nochmal.";

  let ergebnis = entferneMarkdown(text);
  ergebnis = behandleLangeListen(ergebnis);
  ergebnis = kuerzeAufSaetze(ergebnis, maxSaetze);
  ergebnis = wiederholeBetrag(ergebnis);

  // Zeichenlimit als letztes Sicherheitsnetz
  if (ergebnis.length > MAX_VOICE_ZEICHEN) {
    const saetze = ergebnis.match(/[^.!?]+[.!?]+/g) ?? [ergebnis];
    ergebnis = saetze[0].trim();
    if (ergebnis.length > MAX_VOICE_ZEICHEN) {
      ergebnis = ergebnis.slice(0, MAX_VOICE_ZEICHEN).trim() + ".";
    }
  }

  return ergebnis.trim();
}

/**
 * Erstellt eine Voice-optimierte Bestaetigungsfrage.
 * Format: "<Aktion>, [Betrag,] richtig?"
 */
export function erstelleVoiceBestaetigung(params: {
  aktion: string;
  detail?: string;
  betrag?: number;
  empfaenger?: string;
}): string {
  const { aktion, detail, betrag, empfaenger } = params;

  const teile: string[] = [aktion];
  if (detail) teile.push(detail);
  if (betrag !== undefined) {
    teile.push(formatiereBetragAlsText(betrag));
  }
  if (empfaenger) teile.push(`an ${empfaenger}`);

  return `${teile.join(", ")} — ja oder nein?`;
}
