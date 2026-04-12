/**
 * Unit-Tests: Wartungsmanager Planungs-Engine — deterministischer Kern (AUT-36)
 *
 * Testet:
 * - generateEvents mit 3 Beispiel-Leases
 * - validatePlan mit künstlichem Doppelbuchungs-Konflikt
 * - PLZ-Clustering: 5 Objekte in Hamburg → sinnvolle Tagesgruppen
 */

import { describe, it, expect } from "vitest"
import {
  generateEvents,
  filterConstraints,
  assignEvents,
  validatePlan,
  generateReport,
  getISOWeek,
  getWorkingDaysOfMonth,
  type MaintenanceLeaseWithRelations,
  type TechnicianInput,
  type PlanEntry,
  type SchoolHolidayData,
} from "../../src/lib/wartung/planning-engine"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EMPTY_SCHOOL_HOLIDAYS: SchoolHolidayData = {
  bundesland: "HH",
  year: 2027,
  periods: [],
}

const TECHNICIAN_A: TechnicianInput = {
  id: "tech-a",
  name: "Max Mustermann",
  qualifications: ["Gas-Konzession", "DGUV V3"],
  maxDailyHours: 8,
}

const TECHNICIAN_B: TechnicianInput = {
  id: "tech-b",
  name: "Erika Musterfrau",
  qualifications: ["DGUV V3"],
  maxDailyHours: 8,
}

function makeLease(
  overrides: Partial<MaintenanceLeaseWithRelations> & { id: string }
): MaintenanceLeaseWithRelations {
  return {
    contractId: "contract-1",
    serviceType: "Inspektion",
    intervalMonths: 12,
    estimatedHours: 2,
    qualificationRequired: null,
    seasonalPreference: null,
    legalBasis: null,
    legalDeadline: null,
    contract: {
      id: "contract-1",
      startDate: new Date("2026-01-01"),
      object: { id: "obj-1", postalCode: "22301" },
    },
    ...overrides,
  }
}

// ─── Layer 1: generateEvents ──────────────────────────────────────────────────

describe("generateEvents", () => {
  it("erzeugt für eine jährliche Leistung genau ein Event im Zieljahr", () => {
    const lease = makeLease({ id: "lease-1", intervalMonths: 12 })
    const events = generateEvents([lease], 2027)
    expect(events).toHaveLength(1)
    expect(events[0].leaseId).toBe("lease-1")
    expect(events[0].dueMonth.getFullYear()).toBe(2027)
  })

  it("erzeugt für eine halbjährliche Leistung zwei Events im Zieljahr", () => {
    const lease = makeLease({ id: "lease-2", intervalMonths: 6 })
    const events = generateEvents([lease], 2027)
    expect(events).toHaveLength(2)
    const months = events.map((e) => e.dueMonth.getMonth() + 1).sort((a, b) => a - b)
    expect(months[1] - months[0]).toBe(6)
  })

  it("erzeugt für eine vierteljährliche Leistung vier Events im Zieljahr", () => {
    const lease = makeLease({ id: "lease-3", intervalMonths: 3 })
    const events = generateEvents([lease], 2027)
    expect(events).toHaveLength(4)
  })

  it("markiert Events mit legalBasis als harte Fristen", () => {
    const hardLease = makeLease({
      id: "lease-hard",
      legalBasis: "BetrSichV §14",
      intervalMonths: 12,
    })
    const softLease = makeLease({ id: "lease-soft", intervalMonths: 12 })
    const events = generateEvents([softLease, hardLease], 2027)
    expect(events[0].isHardDeadline).toBe(true)
    expect(events[0].leaseId).toBe("lease-hard")
    expect(events[1].isHardDeadline).toBe(false)
  })

  it("verarbeitet drei verschiedene Leases korrekt", () => {
    const leases: MaintenanceLeaseWithRelations[] = [
      makeLease({ id: "l1", intervalMonths: 12, serviceType: "Jahresinspektion" }),
      makeLease({
        id: "l2",
        intervalMonths: 6,
        serviceType: "Halbjahrescheck",
        contract: {
          id: "c2",
          startDate: new Date("2026-03-01"),
          object: { id: "obj-2", postalCode: "22302" },
        },
        contractId: "c2",
      }),
      makeLease({
        id: "l3",
        intervalMonths: 12,
        serviceType: "Gas-Prüfung",
        legalBasis: "DVGW",
        contract: {
          id: "c3",
          startDate: new Date("2025-07-01"),
          object: { id: "obj-3", postalCode: "20095" },
        },
        contractId: "c3",
      }),
    ]

    const events = generateEvents(leases, 2027)
    expect(events.length).toBeGreaterThanOrEqual(3)

    // Harte Fristen stehen zuerst
    const hardEvents = events.filter((e) => e.isHardDeadline)
    const softEvents = events.filter((e) => !e.isHardDeadline)
    if (hardEvents.length > 0 && softEvents.length > 0) {
      expect(events[0].isHardDeadline).toBe(true)
    }
  })

  it("erzeugt keine Events für Leistungen die erst nach dem Zieljahr starten", () => {
    const lease = makeLease({
      id: "future",
      intervalMonths: 12,
      contract: {
        id: "c-future",
        startDate: new Date("2028-01-01"),
        object: { id: "obj-f", postalCode: "22301" },
      },
    })
    const events = generateEvents([lease], 2027)
    expect(events).toHaveLength(0)
  })
})

// ─── Layer 2: filterConstraints ───────────────────────────────────────────────

describe("filterConstraints", () => {
  it("markiert Events als infeasible wenn kein Techniker qualifiziert ist", () => {
    const lease = makeLease({
      id: "gas-lease",
      qualificationRequired: "Aufzugsprüfer",
      intervalMonths: 12,
    })
    const events = generateEvents([lease], 2027)
    const result = filterConstraints(
      events,
      [TECHNICIAN_A, TECHNICIAN_B],
      EMPTY_SCHOOL_HOLIDAYS,
      [],
      2027
    )
    expect(result.infeasible).toHaveLength(1)
    expect(result.infeasible[0].event.leaseId).toBe("gas-lease")
    expect(result.feasible).toHaveLength(0)
  })

  it("lässt Events durch wenn ein Techniker qualifiziert ist", () => {
    const lease = makeLease({
      id: "gas-lease",
      qualificationRequired: "Gas-Konzession",
      intervalMonths: 12,
    })
    const events = generateEvents([lease], 2027)
    const result = filterConstraints(
      events,
      [TECHNICIAN_A, TECHNICIAN_B],
      EMPTY_SCHOOL_HOLIDAYS,
      [],
      2027
    )
    expect(result.feasible).toHaveLength(1)
    expect(result.infeasible).toHaveLength(0)
  })

  it("baut korrekte PLZ-Cluster", () => {
    const leases = [
      makeLease({
        id: "l1",
        intervalMonths: 12,
        contract: { id: "c1", startDate: new Date("2026-01-01"), object: { id: "obj-1", postalCode: "22301" } },
      }),
      makeLease({
        id: "l2",
        intervalMonths: 12,
        contract: { id: "c2", startDate: new Date("2026-01-01"), object: { id: "obj-2", postalCode: "22305" } },
      }),
      makeLease({
        id: "l3",
        intervalMonths: 12,
        contract: { id: "c3", startDate: new Date("2026-01-01"), object: { id: "obj-3", postalCode: "20095" } },
      }),
    ]
    const events = generateEvents(leases, 2027)
    const result = filterConstraints(events, [TECHNICIAN_A], EMPTY_SCHOOL_HOLIDAYS, [], 2027)
    // PLZ-Prefix "22" enthält obj-1 und obj-2
    const cluster22 = result.plzClusters.get("22")
    expect(cluster22).toBeDefined()
    expect(cluster22).toContain("obj-1")
    expect(cluster22).toContain("obj-2")
    // PLZ-Prefix "20" enthält obj-3
    const cluster20 = result.plzClusters.get("20")
    expect(cluster20).toContain("obj-3")
  })

  it("zieht bestehende Buchungen von der Kapazität ab", () => {
    const lease = makeLease({ id: "l1", intervalMonths: 12 })
    const events = generateEvents([lease], 2027)
    const existingBooking = {
      technicianId: "tech-a",
      scheduledDate: new Date("2027-01-04"), // erster Montag Jan 2027
      estimatedHours: 6,
    }
    const result = filterConstraints(
      events,
      [TECHNICIAN_A],
      EMPTY_SCHOOL_HOLIDAYS,
      [existingBooking],
      2027
    )
    const cap = result.technicianCapacity.get("tech-a")
    expect(cap?.get("2027-01-04")).toBe(2) // 8 - 6 = 2
  })
})

// ─── Layer 4: validatePlan ────────────────────────────────────────────────────

describe("validatePlan", () => {
  it("gibt valid=true für einen fehlerfreien Plan zurück", () => {
    const entries: PlanEntry[] = [
      {
        leaseId: "l1",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 4,
        postalCode: "22301",
        isHardDeadline: false,
      },
      {
        leaseId: "l2",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-05"),
        estimatedHours: 4,
        postalCode: "22302",
        isHardDeadline: false,
      },
    ]
    const result = validatePlan(entries)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("erkennt Kapazitätsüberschreitung an einem Tag (> 8h)", () => {
    const entries: PlanEntry[] = [
      {
        leaseId: "l1",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 5,
        postalCode: "22301",
        isHardDeadline: false,
      },
      {
        leaseId: "l2",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 5,
        postalCode: "22302",
        isHardDeadline: false,
      },
    ]
    const result = validatePlan(entries)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].type).toBe("capacity_exceeded")
    expect(result.errors[0].message).toContain("tech-a")
    expect(result.errors[0].message).toContain("10h")
  })

  it("erlaubt genau 8h am gleichen Tag beim gleichen Techniker", () => {
    const entries: PlanEntry[] = [
      {
        leaseId: "l1",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 4,
        postalCode: "22301",
        isHardDeadline: false,
      },
      {
        leaseId: "l2",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 4,
        postalCode: "22302",
        isHardDeadline: false,
      },
    ]
    const result = validatePlan(entries)
    expect(result.valid).toBe(true)
  })

  it("meldet keine Fehler wenn verschiedene Techniker am gleichen Tag arbeiten", () => {
    const entries: PlanEntry[] = [
      {
        leaseId: "l1",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 8,
        postalCode: "22301",
        isHardDeadline: false,
      },
      {
        leaseId: "l2",
        technicianId: "tech-b",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 8,
        postalCode: "22302",
        isHardDeadline: false,
      },
    ]
    const result = validatePlan(entries)
    expect(result.valid).toBe(true)
  })
})

// ─── PLZ-Clustering: assignEvents ────────────────────────────────────────────

describe("assignEvents — PLZ-Clustering", () => {
  it("gruppiert 5 Hamburger Objekte in sinnvolle Tagesgruppen", () => {
    // 5 Objekte in Hamburg mit ähnlichen PLZ (Prefix "22")
    const leases: MaintenanceLeaseWithRelations[] = [
      makeLease({
        id: "hh-1",
        intervalMonths: 12,
        estimatedHours: 2,
        contract: { id: "c1", startDate: new Date("2026-01-01"), object: { id: "o1", postalCode: "22301" } },
        contractId: "c1",
      }),
      makeLease({
        id: "hh-2",
        intervalMonths: 12,
        estimatedHours: 2,
        contract: { id: "c2", startDate: new Date("2026-01-01"), object: { id: "o2", postalCode: "22303" } },
        contractId: "c2",
      }),
      makeLease({
        id: "hh-3",
        intervalMonths: 12,
        estimatedHours: 2,
        contract: { id: "c3", startDate: new Date("2026-01-01"), object: { id: "o3", postalCode: "22305" } },
        contractId: "c3",
      }),
      makeLease({
        id: "hh-4",
        intervalMonths: 12,
        estimatedHours: 2,
        contract: { id: "c4", startDate: new Date("2026-01-01"), object: { id: "o4", postalCode: "22307" } },
        contractId: "c4",
      }),
      makeLease({
        id: "hh-5",
        intervalMonths: 12,
        estimatedHours: 2,
        contract: { id: "c5", startDate: new Date("2026-01-01"), object: { id: "o5", postalCode: "22309" } },
        contractId: "c5",
      }),
    ]

    const events = generateEvents(leases, 2027)
    expect(events).toHaveLength(5)

    const filtered = filterConstraints(
      events,
      [TECHNICIAN_A],
      EMPTY_SCHOOL_HOLIDAYS,
      [],
      2027
    )

    const { entries, unplannable } = assignEvents(filtered, [TECHNICIAN_A], 2027)

    // Alle 5 sollten planbar sein (kein Qualifikations-Konflikt, 2h je 8h-Tag)
    expect(unplannable).toHaveLength(0)
    expect(entries).toHaveLength(5)

    // Clustering-Check: An jedem Tag mit mehreren Einträgen sollte die PLZ-Zone gleich sein
    const dayGroups = new Map<string, string[]>()
    for (const entry of entries) {
      const dateStr = entry.scheduledDate.toISOString().slice(0, 10)
      if (!dayGroups.has(dateStr)) dayGroups.set(dateStr, [])
      dayGroups.get(dateStr)!.push(entry.postalCode.slice(0, 2))
    }

    for (const [, prefixes] of dayGroups.entries()) {
      if (prefixes.length > 1) {
        // An Tagen mit mehreren Events sollten die PLZ-Prefixe gleich sein (Clustering)
        const uniquePrefixes = new Set(prefixes)
        expect(uniquePrefixes.size).toBe(1)
      }
    }
  })

  it("plant alle Events innerhalb ihres Fälligkeitsmonats", () => {
    const leases: MaintenanceLeaseWithRelations[] = Array.from({ length: 5 }, (_, i) =>
      makeLease({
        id: `lease-${i}`,
        intervalMonths: 12,
        estimatedHours: 1,
        contract: {
          id: `c${i}`,
          startDate: new Date("2026-03-01"),
          object: { id: `obj-${i}`, postalCode: `223${String(i).padStart(2, "0")}` },
        },
        contractId: `c${i}`,
      })
    )

    const events = generateEvents(leases, 2027)
    const filtered = filterConstraints(events, [TECHNICIAN_A, TECHNICIAN_B], EMPTY_SCHOOL_HOLIDAYS, [], 2027)
    const { entries } = assignEvents(filtered, [TECHNICIAN_A, TECHNICIAN_B], 2027)

    // Alle Entries sollten im März 2027 (month 3) liegen
    for (const entry of entries) {
      expect(entry.scheduledDate.getMonth() + 1).toBe(3)
      expect(entry.scheduledDate.getFullYear()).toBe(2027)
    }
  })
})

// ─── Layer 5: generateReport ──────────────────────────────────────────────────

describe("generateReport", () => {
  it("berechnet KPIs für einen Plan mit zwei Technikern", () => {
    const entries: PlanEntry[] = [
      {
        leaseId: "l1",
        technicianId: "tech-a",
        scheduledDate: new Date("2027-01-04"),
        estimatedHours: 8,
        postalCode: "22301",
        isHardDeadline: false,
      },
      {
        leaseId: "l2",
        technicianId: "tech-b",
        scheduledDate: new Date("2027-02-01"),
        estimatedHours: 4,
        postalCode: "22302",
        isHardDeadline: false,
      },
    ]

    const report = generateReport(entries, [TECHNICIAN_A, TECHNICIAN_B], 2027, [])
    expect(report.kpis.totalHours).toBe(12)
    expect(report.kpis.totalEntries).toBe(2)
    expect(report.totalMaintenancesByTechnician["tech-a"].count).toBe(1)
    expect(report.totalMaintenancesByTechnician["tech-b"].count).toBe(1)
    expect(report.unplannableEvents).toHaveLength(0)
  })

  it("enthält monatliche Auslastungseinträge für alle Monate", () => {
    const report = generateReport([], [TECHNICIAN_A], 2027, [])
    expect(report.monthlyUtilization).toHaveLength(12)
    for (const mu of report.monthlyUtilization) {
      expect(mu.availableHours).toBeGreaterThan(0)
      expect(mu.plannedHours).toBe(0)
      expect(mu.utilizationPercent).toBe(0)
    }
  })

  it("listet nicht planbare Events im Report auf", () => {
    const unplannable = [{ leaseId: "l-x", reason: "Kein qualifizierter Techniker" }]
    const report = generateReport([], [TECHNICIAN_A], 2027, unplannable)
    expect(report.unplannableEvents).toHaveLength(1)
    expect(report.unplannableEvents[0].leaseId).toBe("l-x")
  })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe("getISOWeek", () => {
  it("gibt die korrekte ISO-Woche zurück", () => {
    expect(getISOWeek(new Date("2027-01-04"))).toBe(1)
    expect(getISOWeek(new Date("2027-01-11"))).toBe(2)
    expect(getISOWeek(new Date("2027-12-27"))).toBe(52)
  })
})

describe("getWorkingDaysOfMonth", () => {
  it("gibt nur Werktage (Mo–Fr) zurück", () => {
    const days = getWorkingDaysOfMonth(2027, 1)
    for (const day of days) {
      const d = day.getDay()
      expect(d).not.toBe(0)
      expect(d).not.toBe(6)
    }
  })

  it("gibt ungefähr 20-23 Werktage pro Monat zurück", () => {
    for (let m = 1; m <= 12; m++) {
      const days = getWorkingDaysOfMonth(2027, m)
      expect(days.length).toBeGreaterThanOrEqual(20)
      expect(days.length).toBeLessThanOrEqual(23)
    }
  })
})
