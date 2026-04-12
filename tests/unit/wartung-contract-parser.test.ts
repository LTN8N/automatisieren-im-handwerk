/**
 * Unit-Tests: Wartungsvertrag-Parser Layer 3 (AUT-47)
 *
 * Testet:
 * - CONTRACT_PARSER_SYSTEM_PROMPT: vorhanden und enthält Schlüsselbegriffe
 * - buildPageExtractionNote(): korrekte Seitenhinweise
 * - extractLowConfidenceFields(): Felder mit confidence < 0.8 erkannt
 * - parseContractPdf(): Normalisierung + Konfidenz-Felder via gemocktem Claude
 *
 * Kein echter Claude-Call — Anthropic-SDK wird gemockt.
 */

import { describe, it, expect, vi } from "vitest";
import {
  CONTRACT_PARSER_SYSTEM_PROMPT,
  buildPageExtractionNote,
  type ParsedContractData,
} from "../../src/lib/wartung/prompts/contract-parser";
import { extractLowConfidenceFields } from "../../src/lib/wartung/contract-parser";

// ---------------------------------------------------------------------------
// Mock-Antwort: Claude-Output mit normalisiertem serviceType + confidence
// ---------------------------------------------------------------------------

const MOCK_PARSED_CONTRACT: ParsedContractData = {
  contractNumber: "WV-2024-001",
  customerName: "Muster Verwaltungs GmbH",
  customerAddress: "Hauptstr. 10, 22305 Hamburg",
  startDate: "2024-01-01",
  endDate: "2025-12-31",
  autoRenew: true,
  objects: [
    {
      name: "Bürogebäude Hauptstr.",
      address: "Hauptstr. 10",
      postalCode: "22305",
      city: "Hamburg",
      buildingType: "Büro",
      accessNotes: "Schlüssel beim Hausmeister",
    },
  ],
  leases: [
    {
      serviceType: "heizung_gas",
      intervalMonths: 12,
      estimatedHours: 2.5,
      qualificationRequired: "gas_konzession",
      legalBasis: "TRGI 2008",
      legalDeadline: "2024-12-31",
    },
    {
      serviceType: "brandschutz",
      intervalMonths: 6,
      estimatedHours: 1,
    },
    {
      serviceType: "klima",
      intervalMonths: 3,
      estimatedHours: 1.5,
    },
  ],
  confidence: {
    contractNumber: 1.0,
    customerName: 1.0,
    customerAddress: 0.8,
    startDate: 1.0,
    endDate: 0.8,
    autoRenew: 0.5,           // < 0.8 → Review
    "objects[0].postalCode": 1.0,
    "leases[0].serviceType": 0.8,
    "leases[0].intervalMonths": 1.0,
    "leases[0].estimatedHours": 0.5, // < 0.8 → Review
    "leases[1].serviceType": 0.8,
    "leases[1].intervalMonths": 0.8,
    "leases[2].serviceType": 0.8,
    "leases[2].intervalMonths": 0.2, // < 0.8 → Review
  },
  rawNotes: "Seite 4 unleserlich.",
};

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify(MOCK_PARSED_CONTRACT),
          },
        ],
      }),
    },
  })),
}));

// ---------------------------------------------------------------------------
// System-Prompt Tests
// ---------------------------------------------------------------------------

describe("CONTRACT_PARSER_SYSTEM_PROMPT", () => {
  it("ist definiert und nicht leer", () => {
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toBeTruthy();
    expect(CONTRACT_PARSER_SYSTEM_PROMPT.length).toBeGreaterThan(200);
  });

  it("enthält Service-Type-Normalisierungs-Schlüssel", () => {
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("heizung_gas");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("klima");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("sanitaer");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("elektro");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("brandschutz");
  });

  it("enthält Intervall-Normalisierungs-Beispiele", () => {
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("quartalsweise");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("halbjährlich");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("jährlich");
  });

  it("enthält Konfidenz-Score-Erklärung", () => {
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("1.0");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("0.8");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("0.5");
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toContain("0.2");
  });

  it("fordert reines JSON-Output (kein Markdown)", () => {
    expect(CONTRACT_PARSER_SYSTEM_PROMPT).toMatch(/NUR mit validem JSON/i);
  });
});

// ---------------------------------------------------------------------------
// buildPageExtractionNote Tests
// ---------------------------------------------------------------------------

describe("buildPageExtractionNote", () => {
  it("kurzes Dokument (≤ 5 Seiten) → alle Seiten analysieren", () => {
    const note = buildPageExtractionNote(3);
    expect(note).toContain("3 Seite");
    expect(note).not.toContain("übersprungen");
  });

  it("langes Dokument (> 5 Seiten) → Prioritäts-Seiten erwähnt", () => {
    const note = buildPageExtractionNote(20);
    expect(note).toContain("20 Seiten");
    expect(note).toContain("1–3");
    expect(note).toContain("letzte Seite");
    expect(note).toContain("übersprungen");
  });

  it("Grenzfall 5 Seiten → alle Seiten", () => {
    const note = buildPageExtractionNote(5);
    expect(note).not.toContain("übersprungen");
  });

  it("Grenzfall 6 Seiten → Priorisierung", () => {
    const note = buildPageExtractionNote(6);
    expect(note).toContain("übersprungen");
  });
});

// ---------------------------------------------------------------------------
// extractLowConfidenceFields Tests
// ---------------------------------------------------------------------------

describe("extractLowConfidenceFields", () => {
  it("findet alle Felder mit confidence < 0.8", () => {
    const lowConf = extractLowConfidenceFields(MOCK_PARSED_CONTRACT);
    const fields = lowConf.map((f) => f.field);

    expect(fields).toContain("autoRenew");
    expect(fields).toContain("leases[0].estimatedHours");
    expect(fields).toContain("leases[2].intervalMonths");
  });

  it("enthält kein Feld mit confidence >= 0.8", () => {
    const lowConf = extractLowConfidenceFields(MOCK_PARSED_CONTRACT);
    for (const { confidence } of lowConf) {
      expect(confidence).toBeLessThan(0.8);
    }
  });

  it("gibt leeres Array zurück wenn alle confidence >= 0.8", () => {
    const allHighConf: ParsedContractData = {
      ...MOCK_PARSED_CONTRACT,
      confidence: { contractNumber: 1.0, customerName: 0.9, startDate: 0.8 },
    };
    expect(extractLowConfidenceFields(allHighConf)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseContractPdf mit gemocktem Claude (Orchestrierungs-Tests)
// ---------------------------------------------------------------------------

describe("parseContractPdf (gemockter Claude-Client)", () => {
  it("gibt Mock-Daten korrekt zurück", async () => {
    const { parseContractPdf } = await import("../../src/lib/wartung/contract-parser");
    const result = await parseContractPdf("dGVzdA==", 3, { apiKey: "test-key" });

    expect(result.data.contractNumber).toBe("WV-2024-001");
    expect(result.data.customerName).toBe("Muster Verwaltungs GmbH");
  });

  it("intervalMonths-Normalisierung korrekt in Mock-Daten", async () => {
    const { parseContractPdf } = await import("../../src/lib/wartung/contract-parser");
    const result = await parseContractPdf("dGVzdA==", 3, { apiKey: "test-key" });

    const leases = result.data.leases;
    // Heizung jährlich → 12
    expect(leases[0].intervalMonths).toBe(12);
    // Brandschutz halbjährlich → 6
    expect(leases[1].intervalMonths).toBe(6);
    // Klima quartalsweise → 3
    expect(leases[2].intervalMonths).toBe(3);
  });

  it("reviewQueue enthält Felder mit confidence < 0.8", async () => {
    const { parseContractPdf } = await import("../../src/lib/wartung/contract-parser");
    const result = await parseContractPdf("dGVzdA==", 3, { apiKey: "test-key" });

    expect(result.reviewQueue.length).toBeGreaterThan(0);
    const reviewFields = result.reviewQueue.map((f) => f.field);
    expect(reviewFields).toContain("autoRenew");
    expect(reviewFields).toContain("leases[0].estimatedHours");
  });

  it("confidence-Felder sind vorhanden im Ergebnis", async () => {
    const { parseContractPdf } = await import("../../src/lib/wartung/contract-parser");
    const result = await parseContractPdf("dGVzdA==", 3, { apiKey: "test-key" });

    expect(result.data.confidence).toBeDefined();
    expect(Object.keys(result.data.confidence).length).toBeGreaterThan(0);
  });

  it("objects-Array enthält mindestens ein Objekt", async () => {
    const { parseContractPdf } = await import("../../src/lib/wartung/contract-parser");
    const result = await parseContractPdf("dGVzdA==", 3, { apiKey: "test-key" });

    expect(result.data.objects).toHaveLength(1);
    expect(result.data.objects[0].postalCode).toBe("22305");
  });
});
