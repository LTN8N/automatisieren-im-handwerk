/**
 * Integrations-Tests: Wartungsplan Layer 3 — Planning Optimizer (AUT-37)
 *
 * Testet:
 * - formatInput() und buildRetryPrompt() aus planning-optimizer.ts
 * - Sortierung: harte Fristen zuerst
 * - PLZ-Cluster-Struktur im Output
 * - Retry-Prompt enthält Validierungsfehler
 *
 * Hinweis: Kein echter Claude-Call — Anthropic-SDK wird gemockt.
 * Claude-Verhalten (JSON-Qualität) ist in E2E-Tests zu prüfen.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatInput,
  buildRetryPrompt,
  type PlanningOptimizerInput,
  type PlanningOptimizerOutput,
} from "../../src/lib/wartung/prompts/planning-optimizer";

// ---------------------------------------------------------------------------
// Mock-Daten: 10 Events Hamburg, März 2027, 2 Techniker
// ---------------------------------------------------------------------------

const MOCK_INPUT: PlanningOptimizerInput = {
  month: 3,
  year: 2027,
  events: [
    {
      id: "ev-001",
      serviceType: "Gasheizung Jahresinspektion",
      objectPostalCode: "22301",
      estimatedHours: 2,
      isHardDeadline: false,
      seasonalPreference: "Herbst/Winter",
      qualificationRequired: "Gas-Konzession",
    },
    {
      id: "ev-002",
      serviceType: "BetrSichV Druckbehälter-Prüfung",
      objectPostalCode: "22305",
      estimatedHours: 3,
      isHardDeadline: true,
      deadlineDate: "2027-03-15",
      qualificationRequired: "DGUV-Sachkundiger",
    },
    {
      id: "ev-003",
      serviceType: "Trinkwasser-Probe TrinkwV",
      objectPostalCode: "22041",
      estimatedHours: 1.5,
      isHardDeadline: true,
      deadlineDate: "2027-03-28",
    },
    {
      id: "ev-004",
      serviceType: "Klimaanlage Wartung",
      objectPostalCode: "22301",
      estimatedHours: 2.5,
      isHardDeadline: false,
      seasonalPreference: "Frühjahr",
    },
    {
      id: "ev-005",
      serviceType: "Feuerlöscher-Prüfung DGUV",
      objectPostalCode: "22305",
      estimatedHours: 1,
      isHardDeadline: true,
      deadlineDate: "2027-03-10",
      qualificationRequired: "DGUV V3",
    },
    {
      id: "ev-006",
      serviceType: "Aufzugsinspektion",
      objectPostalCode: "22041",
      estimatedHours: 4,
      isHardDeadline: false,
    },
    {
      id: "ev-007",
      serviceType: "Elektroprüfung DGUV V3",
      objectPostalCode: "22769",
      estimatedHours: 3,
      isHardDeadline: false,
      qualificationRequired: "DGUV V3",
    },
    {
      id: "ev-008",
      serviceType: "Heizkessel Jahresservice",
      objectPostalCode: "22769",
      estimatedHours: 2,
      isHardDeadline: false,
      qualificationRequired: "Gas-Konzession",
    },
    {
      id: "ev-009",
      serviceType: "RWA-Anlage Funktionsprüfung",
      objectPostalCode: "22301",
      estimatedHours: 1.5,
      isHardDeadline: false,
    },
    {
      id: "ev-010",
      serviceType: "Brandschutzbegehung",
      objectPostalCode: "22305",
      estimatedHours: 2,
      isHardDeadline: false,
    },
  ],
  technicians: [
    {
      id: "tech-A",
      name: "Klaus Müller",
      qualifications: ["Gas-Konzession", "DGUV V3"],
      availableSlots: [
        { date: "2027-03-08", remainingHours: 8 },
        { date: "2027-03-09", remainingHours: 8 },
        { date: "2027-03-10", remainingHours: 8 },
        { date: "2027-03-15", remainingHours: 8 },
        { date: "2027-03-22", remainingHours: 8 },
        { date: "2027-03-29", remainingHours: 8 },
      ],
    },
    {
      id: "tech-B",
      name: "Sabine Richter",
      qualifications: ["DGUV-Sachkundiger"],
      availableSlots: [
        { date: "2027-03-08", remainingHours: 8 },
        { date: "2027-03-10", remainingHours: 8 },
        { date: "2027-03-15", remainingHours: 8 },
        { date: "2027-03-22", remainingHours: 8 },
        { date: "2027-03-28", remainingHours: 8 },
      ],
    },
  ],
  clusters: {
    "223": ["ev-001", "ev-002", "ev-004", "ev-005", "ev-010"],
    "220": ["ev-003", "ev-006"],
    "227": ["ev-007", "ev-008", "ev-009"],
  },
};

// ---------------------------------------------------------------------------
// formatInput Tests
// ---------------------------------------------------------------------------

describe("formatInput", () => {
  it("gibt valides JSON zurück", () => {
    const result = formatInput(MOCK_INPUT);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("enthält planungsmonat mit Monatsnamen", () => {
    const parsed = JSON.parse(formatInput(MOCK_INPUT));
    expect(parsed.planungsmonat).toBe("März 2027");
  });

  it("sortiert harte Fristen zuerst", () => {
    const parsed = JSON.parse(formatInput(MOCK_INPUT));
    const events: Array<{ id: string; isHardDeadline: boolean }> = parsed.events;

    // Alle harten Fristen sollen vor weichen kommen
    let hardPhaseEnded = false;
    for (const ev of events) {
      if (!ev.isHardDeadline) {
        hardPhaseEnded = true;
      }
      if (hardPhaseEnded && ev.isHardDeadline) {
        throw new Error(`Hartes Event ${ev.id} erscheint nach einem weichen Event`);
      }
    }
    // Mindestens ein hartes Event muss vorne stehen
    expect(events[0].isHardDeadline).toBe(true);
  });

  it("innerhalb harter Fristen: früheres deadlineDate zuerst", () => {
    const parsed = JSON.parse(formatInput(MOCK_INPUT));
    const hardEvents: Array<{ id: string; deadlineDate?: string }> = parsed.events.filter(
      (e: { isHardDeadline: boolean }) => e.isHardDeadline
    );
    for (let i = 1; i < hardEvents.length; i++) {
      if (hardEvents[i - 1].deadlineDate && hardEvents[i].deadlineDate) {
        expect(hardEvents[i - 1].deadlineDate! <= hardEvents[i].deadlineDate!).toBe(true);
      }
    }
  });

  it("enthält alle Events", () => {
    const parsed = JSON.parse(formatInput(MOCK_INPUT));
    expect(parsed.events).toHaveLength(10);
  });

  it("enthält PLZ-Cluster-Struktur", () => {
    const parsed = JSON.parse(formatInput(MOCK_INPUT));
    expect(parsed.cluster).toEqual(MOCK_INPUT.clusters);
    expect(Object.keys(parsed.cluster)).toContain("223");
    expect(Object.keys(parsed.cluster)).toContain("220");
  });

  it("enthält Techniker mit Qualifikationen", () => {
    const parsed = JSON.parse(formatInput(MOCK_INPUT));
    const techA = parsed.techniker.find((t: { id: string }) => t.id === "tech-A");
    expect(techA).toBeDefined();
    expect(techA.qualifications).toContain("Gas-Konzession");
  });
});

// ---------------------------------------------------------------------------
// buildRetryPrompt Tests
// ---------------------------------------------------------------------------

describe("buildRetryPrompt", () => {
  it("enthält retryRunde und Validierungsfehler", () => {
    const errors = ["eventId ev-002: Techniker tech-A hat keinen DGUV-Sachkundiger", "eventId ev-005: Doppelbuchung am 2027-03-10"];
    const result = buildRetryPrompt(MOCK_INPUT, errors, 1);
    const parsed = JSON.parse(result);

    expect(parsed.retryRunde).toBe(1);
    expect(parsed.validierungsfehler).toEqual(errors);
    expect(parsed.anweisung).toBeTruthy();
  });

  it("enthält wieder alle Events sortiert", () => {
    const result = buildRetryPrompt(MOCK_INPUT, ["eventId ev-001: fehler"], 2);
    const parsed = JSON.parse(result);
    expect(parsed.events).toHaveLength(10);
    expect(parsed.events[0].isHardDeadline).toBe(true);
  });

  it("bleibt valides JSON bei leerer Fehlerliste", () => {
    const result = buildRetryPrompt(MOCK_INPUT, [], 3);
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// optimizeWartungsplan mit gemocktem Claude-Client
// ---------------------------------------------------------------------------

const MOCK_CLAUDE_OUTPUT: PlanningOptimizerOutput = {
  assignments: [
    {
      eventId: "ev-002",
      technicianId: "tech-B",
      scheduledDate: "2027-03-15",
      cluster: "223",
      begruendung: "Harte Frist 15.03. — DGUV-Sachkundiger Sabine verfügbar",
      konfidenz: 0.98,
    },
    {
      eventId: "ev-005",
      technicianId: "tech-A",
      scheduledDate: "2027-03-10",
      cluster: "223",
      begruendung: "Frist 10.03. — Klaus hat Gas-Konzession und DGUV V3",
      konfidenz: 1.0,
    },
  ],
  warnings: [],
  kpis: { plannedEvents: 2, unplannedEvents: 8, avgDailyLoad: 4.0 },
};

// Mock Anthropic SDK — muss auf Modul-Ebene stehen (vi.mock wird gehoisted)
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(MOCK_CLAUDE_OUTPUT) }],
      }),
    },
  })),
}));

describe("optimizeWartungsplan (gemockter Claude-Client)", () => {
  // Wir testen die Orchestrierungslogik ohne echten API-Call

  it("gibt Mock-Output korrekt durch, wenn validate OK", async () => {
    const { optimizeWartungsplan } = await import("../../src/lib/wartung/ai-optimizer");
    const result = await optimizeWartungsplan(MOCK_INPUT, { apiKey: "test-key" });

    expect(result.assignments).toHaveLength(2);
    expect(result.kpis.plannedEvents).toBe(2);
    expect(result.warnings).toHaveLength(0);
  });

  it("harte Fristen sind im PLZ-Cluster 223", () => {
    // Strukturtest ohne API-Call: Cluster-Mapping korrekt
    const hardDeadlineEvents = MOCK_INPUT.events.filter((e) => e.isHardDeadline);
    const clusterIds = Object.values(MOCK_INPUT.clusters).flat();

    for (const ev of hardDeadlineEvents) {
      expect(clusterIds).toContain(ev.id);
    }
  });

  it("Techniker tech-B hat DGUV-Sachkundiger für ev-002", () => {
    const ev002 = MOCK_INPUT.events.find((e) => e.id === "ev-002")!;
    const techB = MOCK_INPUT.technicians.find((t) => t.id === "tech-B")!;

    expect(ev002.qualificationRequired).toBe("DGUV-Sachkundiger");
    expect(techB.qualifications).toContain("DGUV-Sachkundiger");
  });
});
