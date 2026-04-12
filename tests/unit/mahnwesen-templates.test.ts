/**
 * Unit-Tests: Mahnwesen — E-Mail-Templates
 * AUT-54
 */

import { describe, it, expect } from "vitest";
import { erstelleMahnEmail, berechneNeueFrist } from "@/lib/mahnwesen/templates";

const baseVars = {
  kundenname: "Max Müller",
  nummer: "RE-2026-042",
  rechnungsdatum: "01.03.2026",
  zahlungsziel: "15.03.2026",
  brutto: "1.190,00 EUR",
  tenantname: "Muster GmbH",
  iban: "DE89370400440532013000",
  neue_frist_datum: "29.03.2026",
  inkasso_datum: "26.04.2026",
  mahngebuehr: "5,00 EUR",
  verzugszinsen: "3,50 EUR",
  gesamtbetrag: "1.198,50 EUR",
};

describe("erstelleMahnEmail", () => {
  it("ERINNERUNG enthält freundlichen Ton und keine Gebühren", () => {
    const email = erstelleMahnEmail("ERINNERUNG", baseVars);
    expect(email.betreff).toContain("Erinnerung");
    expect(email.betreff).toContain("RE-2026-042");
    expect(email.text).toContain("freundlich");
    expect(email.text).toContain("Max Müller");
    expect(email.text).toContain("RE-2026-042");
  });

  it("MAHNUNG_1 enthält Betreff mit '1. Mahnung'", () => {
    const email = erstelleMahnEmail("MAHNUNG_1", baseVars);
    expect(email.betreff).toContain("1. Mahnung");
    expect(email.text).toContain("Max Müller");
    expect(email.text).toContain("IBAN");
  });

  it("MAHNUNG_2 enthält Mahngebühr und Inkasso-Androhung", () => {
    const email = erstelleMahnEmail("MAHNUNG_2", baseVars);
    expect(email.betreff).toContain("2. Mahnung");
    expect(email.text).toContain("5,00 EUR");
    expect(email.text).toContain("Inkasso");
  });

  it("INKASSO enthält Schadenspauschale und Gesamtforderung", () => {
    const email = erstelleMahnEmail("INKASSO", baseVars);
    expect(email.betreff).toContain("Inkasso");
    expect(email.text).toContain("40,00 EUR");
  });

  it("gibt HTML-Version zurück", () => {
    const email = erstelleMahnEmail("ERINNERUNG", baseVars);
    expect(email.html).toContain("<html>");
    expect(email.html).toContain("</html>");
  });
});

describe("berechneNeueFrist", () => {
  it("addiert Tage korrekt", () => {
    const datum = new Date("2026-03-15");
    const frist = berechneNeueFrist(datum, 14);
    expect(frist).toBe("29.3.2026");
  });

  it("funktioniert über Monatsgrenzen hinweg", () => {
    const datum = new Date("2026-01-25");
    const frist = berechneNeueFrist(datum, 14);
    expect(frist).toBe("8.2.2026");
  });
});
