/**
 * Mahnwesen — Mahnstufen und Fristenberechnung
 * Rechtsgrundlagen: BGB §286, §288, §187
 * GoBD-konform: unveränderliche Mahnhistorie
 */

import type { Mahnstufe } from "@prisma/client";

/** Tage ab Fälligkeit bis zur jeweiligen Mahnstufe (BGB §187: Fälligkeitstag zählt nicht) */
export const MAHNSTUFE_TAGE: Record<Mahnstufe, number> = {
  ERINNERUNG: 3,
  MAHNUNG_1: 14,
  MAHNUNG_2: 28,
  INKASSO: 42,
};

export const MAHNSTUFE_GEBUEHR: Record<Mahnstufe, number> = {
  ERINNERUNG: 0,
  MAHNUNG_1: 0,
  MAHNUNG_2: 5.0,
  INKASSO: 40.0,
};

/** Basiszinssatz 2024 (§247 BGB), wird vom CFO konfiguriert */
const BASISZINSSATZ_PROZENT = 3.62;
const VERZUGSZINSSATZ_B2B = BASISZINSSATZ_PROZENT + 9; // §288 Abs. 2 BGB

/**
 * Berechnet die Verzugszinsen auf einen Betrag für eine Anzahl Verzugstage.
 * §288 Abs. 2 BGB: Basiszinssatz + 9 Prozentpunkte (B2B)
 */
export function berechneVerzugszinsen(betrag: number, verzugstage: number): number {
  const zinsenJaehrlich = betrag * (VERZUGSZINSSATZ_B2B / 100);
  const zinsenTaeglich = zinsenJaehrlich / 365;
  return Math.round(zinsenTaeglich * verzugstage * 100) / 100;
}

/**
 * Berechnet die Anzahl Verzugstage ab dem Fälligkeitsdatum.
 * BGB §187 Abs. 1: Fälligkeitstag zählt nicht.
 * UTC-basierte Berechnung zur Vermeidung von DST-Problemen.
 */
export function berechneVerzugstage(faelligkeitsdatum: Date, bezugsdatum?: Date): number {
  const ref = bezugsdatum ?? new Date();
  // UTC-Tage: ignoriere Uhrzeit, rechne nur mit Kalendertagen (UTC)
  const refUTC = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const faelligUTC = Date.UTC(
    faelligkeitsdatum.getFullYear(),
    faelligkeitsdatum.getMonth(),
    faelligkeitsdatum.getDate()
  );
  const diffMs = refUTC - faelligUTC;
  const tage = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, tage);
}

/**
 * Ermittelt die fällige Mahnstufe anhand der Verzugstage.
 * Gibt null zurück, wenn noch keine Mahnstufe fällig ist.
 */
export function ermittleFaelligeMahnstufe(verzugstage: number): Mahnstufe | null {
  if (verzugstage >= MAHNSTUFE_TAGE.INKASSO) return "INKASSO";
  if (verzugstage >= MAHNSTUFE_TAGE.MAHNUNG_2) return "MAHNUNG_2";
  if (verzugstage >= MAHNSTUFE_TAGE.MAHNUNG_1) return "MAHNUNG_1";
  if (verzugstage >= MAHNSTUFE_TAGE.ERINNERUNG) return "ERINNERUNG";
  return null;
}

/** Reihenfolge der Mahnstufen für Stufenvalidierung */
const MAHNSTUFE_REIHENFOLGE: Mahnstufe[] = ["ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2", "INKASSO"];

/**
 * Prüft, ob eine neue Mahnstufe für eine Rechnung zulässig ist.
 * Rückstufungen sind nicht erlaubt (§ Statusübergänge Spec Abschnitt 7).
 */
export function istMahnstufeZulaessig(
  neueStufe: Mahnstufe,
  hoechsteBisherigeStufe: Mahnstufe | null
): boolean {
  if (!hoechsteBisherigeStufe) return true;
  const neuerIndex = MAHNSTUFE_REIHENFOLGE.indexOf(neueStufe);
  const bisherigerIndex = MAHNSTUFE_REIHENFOLGE.indexOf(hoechsteBisherigeStufe);
  return neuerIndex >= bisherigerIndex;
}

/**
 * Gibt den nächsten RechnungStatus für eine gegebene Mahnstufe zurück.
 */
export function mahnstufeZuRechnungStatus(
  stufe: Mahnstufe
): "ERINNERUNG" | "MAHNUNG_1" | "MAHNUNG_2" | "INKASSO" {
  return stufe;
}
