/**
 * Unit-Tests: Kaufmännische USt-Berechnung (AUT-24)
 *
 * Testet berechnePosition() und berechneDokumentSummen() aus
 * src/lib/angebote/berechnung.ts
 *
 * Anforderungen laut CFO-Spec:
 * - Rundung kaufmännisch (half-up) auf 2 Dezimalstellen
 * - USt wird pro Position berechnet, nie über den Gesamtnettobetrag
 * - Kein hardcodierter Steuersatz
 */

import { describe, it, expect } from "vitest";
import {
  berechnePosition,
  berechneDokumentSummen,
} from "../../src/lib/angebote/berechnung";

describe("berechnePosition", () => {
  it("berechnet einfache Position korrekt (19%)", () => {
    const result = berechnePosition({ menge: 2, einzelpreis: 85.0, ustSatz: 19 });
    expect(result.gesamtpreis).toBe(170.0);
    // 170 × 0.19 = 32.30
    expect(result.ustBetrag).toBe(32.3);
  });

  it("berechnet Position mit 7% USt korrekt", () => {
    const result = berechnePosition({ menge: 3, einzelpreis: 10.0, ustSatz: 7 });
    expect(result.gesamtpreis).toBe(30.0);
    // 30 × 0.07 = 2.10
    expect(result.ustBetrag).toBe(2.1);
  });

  it("berechnet Position ohne USt (0%) korrekt", () => {
    const result = berechnePosition({ menge: 1, einzelpreis: 50.0, ustSatz: 0 });
    expect(result.gesamtpreis).toBe(50.0);
    expect(result.ustBetrag).toBe(0);
  });

  it("rundet kaufmännisch auf 2 Dezimalstellen", () => {
    // 3 × 1.005 = 3.015 → kaufmännisch → 3.02
    const result = berechnePosition({ menge: 3, einzelpreis: 1.005, ustSatz: 0 });
    expect(result.gesamtpreis).toBe(3.02);
  });

  it("rundet USt-Betrag kaufmännisch", () => {
    // 1 × 9.99 = 9.99 netto, 19% = 1.8981 → 1.90
    const result = berechnePosition({ menge: 1, einzelpreis: 9.99, ustSatz: 19 });
    expect(result.gesamtpreis).toBe(9.99);
    expect(result.ustBetrag).toBe(1.9);
  });

  it("berechnet Menge mit Dezimalstellen korrekt", () => {
    // 0.5 × 100 = 50 netto, 19% = 9.50
    const result = berechnePosition({ menge: 0.5, einzelpreis: 100.0, ustSatz: 19 });
    expect(result.gesamtpreis).toBe(50.0);
    expect(result.ustBetrag).toBe(9.5);
  });
});

describe("berechneDokumentSummen", () => {
  it("summiert mehrere Positionen korrekt", () => {
    const positionen = [
      { gesamtpreis: 170.0, ustBetrag: 32.3 },
      { gesamtpreis: 62.5, ustBetrag: 11.88 },
    ];
    const summen = berechneDokumentSummen(positionen);

    expect(summen.netto).toBe(232.5);
    expect(summen.ust).toBe(44.18);
    expect(summen.brutto).toBe(276.68);
  });

  it("berechnet leere Liste als Nullwerte", () => {
    const summen = berechneDokumentSummen([]);
    expect(summen.netto).toBe(0);
    expect(summen.ust).toBe(0);
    expect(summen.brutto).toBe(0);
  });

  it("summiert eine einzelne Position korrekt", () => {
    const positionen = [{ gesamtpreis: 100.0, ustBetrag: 19.0 }];
    const summen = berechneDokumentSummen(positionen);

    expect(summen.netto).toBe(100.0);
    expect(summen.ust).toBe(19.0);
    expect(summen.brutto).toBe(119.0);
  });

  it("brutto = netto + ust (keine doppelte Rundungsfehler)", () => {
    // Gemischte Sätze: simuliere 3 Positionen
    const positionen = [
      { gesamtpreis: 33.33, ustBetrag: 6.33 },
      { gesamtpreis: 33.33, ustBetrag: 6.33 },
      { gesamtpreis: 33.34, ustBetrag: 6.33 },
    ];
    const summen = berechneDokumentSummen(positionen);

    // brutto muss exakt netto + ust sein
    expect(summen.brutto).toBe(
      Math.round((summen.netto + summen.ust) * 100) / 100
    );
  });

  it("USt wird pro Position summiert, nicht über den Gesamtnetto berechnet", () => {
    // Position 1: 33.33 × 19% = 6.3327 → 6.33
    // Position 2: 33.33 × 19% = 6.3327 → 6.33
    // Position 3: 33.34 × 19% = 6.3346 → 6.33
    // Summe USt = 18.99 (3 × 6.33)
    // NICHT: 100 × 19% = 19.00 (falsch — Gesamtberechnung)
    const p1 = berechnePosition({ menge: 1, einzelpreis: 33.33, ustSatz: 19 });
    const p2 = berechnePosition({ menge: 1, einzelpreis: 33.33, ustSatz: 19 });
    const p3 = berechnePosition({ menge: 1, einzelpreis: 33.34, ustSatz: 19 });

    const summen = berechneDokumentSummen([p1, p2, p3]);

    // USt aus Einzelpositionen summiert
    expect(summen.ust).toBe(18.99);
    // Nicht die falsche Methode: 100 × 19% = 19.00
    expect(summen.ust).not.toBe(19.0);
  });
});

describe("Integrations-Berechnung: Angebot komplett", () => {
  it("berechnet typisches Sanitär-Angebot korrekt", () => {
    // Wie im E2E-Test für Angebots-CRUD
    const pos1 = berechnePosition({ menge: 2, einzelpreis: 85.0, ustSatz: 19 });
    const pos2 = berechnePosition({ menge: 5, einzelpreis: 12.5, ustSatz: 19 });

    expect(pos1.gesamtpreis).toBe(170.0);
    expect(pos1.ustBetrag).toBe(32.3);
    expect(pos2.gesamtpreis).toBe(62.5);
    expect(pos2.ustBetrag).toBe(11.88);

    const summen = berechneDokumentSummen([pos1, pos2]);
    expect(summen.netto).toBe(232.5);
    expect(summen.ust).toBe(44.18);
    expect(summen.brutto).toBe(276.68);
  });
});
