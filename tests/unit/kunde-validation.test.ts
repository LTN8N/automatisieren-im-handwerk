import { describe, it, expect } from "vitest";
import { kundeSchema } from "../../src/lib/validations/kunde";

describe("kundeSchema", () => {
  it("akzeptiert gültige Daten mit allen Feldern", () => {
    const result = kundeSchema.safeParse({
      name: "Max Mustermann GmbH",
      adresse: "Musterstraße 1, 22143 Hamburg",
      email: "info@mustermann.de",
      telefon: "+49 40 123456",
      notizen: "Stammkunde seit 2020",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Max Mustermann GmbH");
      expect(result.data.email).toBe("info@mustermann.de");
    }
  });

  it("akzeptiert Daten nur mit Name (Pflichtfeld)", () => {
    const result = kundeSchema.safeParse({
      name: "Einfacher Kunde",
    });

    expect(result.success).toBe(true);
  });

  it("lehnt leeren Namen ab", () => {
    const result = kundeSchema.safeParse({
      name: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.name).toBeDefined();
      expect(errors.name!.length).toBeGreaterThan(0);
    }
  });

  it("lehnt fehlenden Namen ab", () => {
    const result = kundeSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("lehnt ungültige E-Mail ab", () => {
    const result = kundeSchema.safeParse({
      name: "Test Kunde",
      email: "keine-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.email).toBeDefined();
    }
  });

  it("akzeptiert leere E-Mail", () => {
    const result = kundeSchema.safeParse({
      name: "Test Kunde",
      email: "",
    });

    expect(result.success).toBe(true);
  });

  it("akzeptiert fehlende optionale Felder", () => {
    const result = kundeSchema.safeParse({
      name: "Minimal Kunde",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Minimal Kunde");
    }
  });
});
