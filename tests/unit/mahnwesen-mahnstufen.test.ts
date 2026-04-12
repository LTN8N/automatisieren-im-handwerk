/**
 * Unit-Tests: Mahnwesen — Mahnstufen und Fristenberechnung
 * AUT-54
 */

import { describe, it, expect } from "vitest";
import {
  berechneVerzugstage,
  berechneVerzugszinsen,
  ermittleFaelligeMahnstufe,
  istMahnstufeZulaessig,
  MAHNSTUFE_TAGE,
  MAHNSTUFE_GEBUEHR,
} from "@/lib/mahnwesen/mahnstufen";

describe("berechneVerzugstage", () => {
  it("gibt 0 zurück wenn Rechnung noch nicht fällig", () => {
    const morgen = new Date();
    morgen.setDate(morgen.getDate() + 1);
    expect(berechneVerzugstage(morgen)).toBe(0);
  });

  it("gibt 0 zurück am Fälligkeitstag selbst (BGB §187 Abs. 1)", () => {
    const heute = new Date();
    // Fälligkeit heute → noch kein Verzug
    expect(berechneVerzugstage(heute)).toBe(0);
  });

  it("berechnet Verzugstage korrekt", () => {
    const bezugsdatum = new Date("2026-04-12T10:00:00");
    const faelligkeitsdatum = new Date("2026-03-29T10:00:00");
    // 14 Tage Verzug
    expect(berechneVerzugstage(faelligkeitsdatum, bezugsdatum)).toBe(14);
  });

  it("berechnet 3 Verzugstage", () => {
    const bezugsdatum = new Date("2026-04-12T12:00:00");
    const faelligkeitsdatum = new Date("2026-04-09T12:00:00");
    expect(berechneVerzugstage(faelligkeitsdatum, bezugsdatum)).toBe(3);
  });

  it("berechnet 42 Verzugstage", () => {
    const bezugsdatum = new Date("2026-04-12T00:00:00");
    const faelligkeitsdatum = new Date("2026-03-01T00:00:00");
    expect(berechneVerzugstage(faelligkeitsdatum, bezugsdatum)).toBe(42);
  });
});

describe("ermittleFaelligeMahnstufe", () => {
  it("gibt null bei 0 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(0)).toBeNull();
  });

  it("gibt null bei 2 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(2)).toBeNull();
  });

  it("gibt ERINNERUNG bei 3 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(3)).toBe("ERINNERUNG");
  });

  it("gibt ERINNERUNG bei 13 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(13)).toBe("ERINNERUNG");
  });

  it("gibt MAHNUNG_1 bei 14 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(14)).toBe("MAHNUNG_1");
  });

  it("gibt MAHNUNG_2 bei 28 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(28)).toBe("MAHNUNG_2");
  });

  it("gibt INKASSO bei 42 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(42)).toBe("INKASSO");
  });

  it("gibt INKASSO bei mehr als 42 Verzugstagen zurück", () => {
    expect(ermittleFaelligeMahnstufe(100)).toBe("INKASSO");
  });
});

describe("istMahnstufeZulaessig", () => {
  it("erlaubt erste Mahnstufe wenn keine bisherige", () => {
    expect(istMahnstufeZulaessig("ERINNERUNG", null)).toBe(true);
  });

  it("erlaubt gleiche Mahnstufe (idempotent)", () => {
    expect(istMahnstufeZulaessig("ERINNERUNG", "ERINNERUNG")).toBe(true);
  });

  it("erlaubt höhere Mahnstufe", () => {
    expect(istMahnstufeZulaessig("MAHNUNG_1", "ERINNERUNG")).toBe(true);
    expect(istMahnstufeZulaessig("MAHNUNG_2", "MAHNUNG_1")).toBe(true);
    expect(istMahnstufeZulaessig("INKASSO", "MAHNUNG_2")).toBe(true);
  });

  it("verbietet Rückstufung", () => {
    expect(istMahnstufeZulaessig("ERINNERUNG", "MAHNUNG_1")).toBe(false);
    expect(istMahnstufeZulaessig("MAHNUNG_1", "MAHNUNG_2")).toBe(false);
    expect(istMahnstufeZulaessig("MAHNUNG_1", "INKASSO")).toBe(false);
  });
});

describe("berechneVerzugszinsen", () => {
  it("berechnet Verzugszinsen für 365 Tage (ein Jahr)", () => {
    const betrag = 1000;
    const verzugstage = 365;
    const zinsen = berechneVerzugszinsen(betrag, verzugstage);
    // Basiszinssatz 3,62% + 9 = 12,62%
    const erwartet = Math.round(betrag * (12.62 / 100) * 100) / 100;
    expect(zinsen).toBeCloseTo(erwartet, 1);
  });

  it("berechnet Verzugszinsen für 14 Tage", () => {
    const betrag = 500;
    const zinsen = berechneVerzugszinsen(betrag, 14);
    expect(zinsen).toBeGreaterThan(0);
    expect(zinsen).toBeLessThan(5); // Plausibilitätscheck
  });

  it("gibt 0 zurück bei 0 Verzugstagen", () => {
    expect(berechneVerzugszinsen(1000, 0)).toBe(0);
  });
});

describe("MAHNSTUFE_TAGE", () => {
  it("enthält die richtigen Fristen gemäß Spezifikation", () => {
    expect(MAHNSTUFE_TAGE.ERINNERUNG).toBe(3);
    expect(MAHNSTUFE_TAGE.MAHNUNG_1).toBe(14);
    expect(MAHNSTUFE_TAGE.MAHNUNG_2).toBe(28);
    expect(MAHNSTUFE_TAGE.INKASSO).toBe(42);
  });
});

describe("MAHNSTUFE_GEBUEHR", () => {
  it("enthält die richtigen Gebühren gemäß Spezifikation", () => {
    expect(MAHNSTUFE_GEBUEHR.ERINNERUNG).toBe(0);
    expect(MAHNSTUFE_GEBUEHR.MAHNUNG_1).toBe(0);
    expect(MAHNSTUFE_GEBUEHR.MAHNUNG_2).toBe(5.0);
    expect(MAHNSTUFE_GEBUEHR.INKASSO).toBe(40.0);
  });
});
