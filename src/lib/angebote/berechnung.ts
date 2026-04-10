/**
 * Kaufmännische USt-Berechnung nach CFO-Spezifikation.
 * Rundung: kaufmännisch auf 2 Dezimalstellen (half-up).
 * USt wird pro Position berechnet, nie über den Gesamtnettobetrag.
 */

export interface PositionBerechnung {
  menge: number
  einzelpreis: number
  ustSatz: number
}

export interface PositionErgebnis {
  gesamtpreis: number
  ustBetrag: number
}

export interface DokumentSummen {
  netto: number
  ust: number
  brutto: number
}

/** Kaufmännisch runden auf 2 Dezimalstellen */
function runden(wert: number): number {
  return Math.round((wert + Number.EPSILON) * 100) / 100
}

/** Berechnet Gesamtpreis und USt-Betrag einer Position */
export function berechnePosition(pos: PositionBerechnung): PositionErgebnis {
  const gesamtpreis = runden(pos.menge * pos.einzelpreis)
  const ustBetrag = runden(gesamtpreis * (pos.ustSatz / 100))
  return { gesamtpreis, ustBetrag }
}

/** Berechnet Dokumentsummen aus allen Positionen */
export function berechneDokumentSummen(
  positionen: Array<{ gesamtpreis: number; ustBetrag: number }>
): DokumentSummen {
  const netto = runden(positionen.reduce((sum, p) => sum + p.gesamtpreis, 0))
  const ust = runden(positionen.reduce((sum, p) => sum + p.ustBetrag, 0))
  const brutto = runden(netto + ust)
  return { netto, ust, brutto }
}
