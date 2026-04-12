/**
 * Unit-Tests: Excel-Import Route (AUT-48)
 *
 * Testet:
 * - Validierung: Pflichtfelder fehlen → 422
 * - Validierung: Ungültiges Datum → 422
 * - Validierung: Objekt-Zeile außerhalb des Bereichs → 422
 * - Bug 1 Fix: getTenantDb wird für die Transaktion verwendet
 * - Bug 2 Fix: contractLine-Filterung — Leistung nur für bestimmten Vertrag
 * - Backward-Compat: Leistungen ohne contractLine gelten für alle Verträge
 * - Erfolgreicher Import → 200 mit importedObjects/importedContracts
 *
 * Kein echter DB-Aufruf — getTenantDb und auth werden gemockt.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import ExcelJS from "exceljs"

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock-Session mit tenantId
const MOCK_SESSION = { user: { tenantId: "tenant-123" } }

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(MOCK_SESSION),
}))

// Captured lease-creates pro Vertrag für Assertions in Tests
let capturedLeaseCreates: Array<{ contractIndex: number; leases: unknown[] }> = []

const mockTransactionFn = vi.fn()

vi.mock("@/lib/db", () => ({
  getTenantDb: vi.fn().mockReturnValue({
    $transaction: mockTransactionFn,
  }),
}))

// ── Hilfsfunktionen: Workbook-Builder ─────────────────────────────────────

async function buildWorkbookBuffer(options: {
  objects?: Array<[string, string, string, string, string]>
  leases?: Array<[string, number, string, number, string?, string?, string?, number?]>
  contracts?: Array<[string, string, string, string, number]>
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()

  // Sheet 1: Objekte
  const s1 = wb.addWorksheet("Objekte")
  s1.addRow(["Name", "Adresse", "Stadt", "PLZ", "Gebäudetyp", "Ansprechpartner", "Zugangszeiten"])
  for (const obj of options.objects ?? [["Büro A", "Hauptstr. 1", "Hamburg", "20001", "Büro"]]) {
    s1.addRow(obj)
  }

  // Sheet 2: Leistungen
  const s2 = wb.addWorksheet("Leistungen")
  s2.addRow([
    "Anlagentyp", "Intervall", "Qualifikation", "Dauer", "Saison",
    "Rechtsgrundlage", "Rechtl. Frist", "Vertrag-Zeile",
  ])
  for (const lease of options.leases ?? [["heizung_gas", 12, "", 2, "", "", ""]]) {
    s2.addRow(lease)
  }

  // Sheet 3: Vertragsdaten
  const s3 = wb.addWorksheet("Vertragsdaten")
  s3.addRow(["Vertragsnummer", "Laufzeit von", "Laufzeit bis", "Kundenname", "Objekt-Zeile"])
  for (const contract of options.contracts ?? [["V-001", "2024-01-01", "", "Muster GmbH", 1]]) {
    s3.addRow(contract)
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

async function buildRequest(buffer: Buffer): Promise<Request> {
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  formData.append("file", blob, "import.xlsx")
  return new Request("http://localhost/api/wartung/contracts/import/excel", {
    method: "POST",
    body: formData,
  })
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  capturedLeaseCreates = []
  vi.clearAllMocks()

  // Standard-Mock: Transaktion führt die Callback-Funktion aus und gibt IDs zurück
  mockTransactionFn.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    let objectIdCounter = 0
    let contractIdCounter = 0
    const tx = {
      maintenanceObject: {
        create: vi.fn().mockImplementation(async () => ({ id: `obj-${++objectIdCounter}` })),
      },
      maintenanceContract: {
        create: vi.fn().mockImplementation(async ({ data }: { data: { leases: { create: unknown[] } } }) => {
          capturedLeaseCreates.push({
            contractIndex: contractIdCounter,
            leases: data.leases?.create ?? [],
          })
          return { id: `contract-${++contractIdCounter}` }
        }),
      },
    }
    return callback(tx)
  })
})

// ── Tests ─────────────────────────────────────────────────────────────────

describe("POST /api/wartung/contracts/import/excel", () => {
  describe("Authentifizierung", () => {
    it("gibt 401 zurück wenn keine Session vorhanden", async () => {
      const { auth } = await import("@/lib/auth")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValueOnce(null as any)

      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({})
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toContain("authentifiziert")
    })
  })

  describe("Validierung", () => {
    it("gibt 422 zurück wenn Pflichtfeld Name fehlt", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        objects: [["", "Hauptstr. 1", "Hamburg", "20001", "Büro"]],
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sheet: "Objekte", error: "Name fehlt" }),
        ])
      )
    })

    it("gibt 422 zurück wenn Intervall = 0 in Sheet 2", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        leases: [["heizung_gas", 0, "", 2]],
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sheet: "Leistungen", error: "Intervall muss > 0 sein" }),
        ])
      )
    })

    it("gibt 422 zurück wenn Objekt-Zeile in Sheet 3 außerhalb des Bereichs", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        objects: [["Büro A", "Hauptstr. 1", "Hamburg", "20001", "Büro"]],
        contracts: [["V-001", "2024-01-01", "", "Muster GmbH", 99]], // Zeile 99 existiert nicht
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sheet: "Vertragsdaten", error: expect.stringContaining("existiert nicht") }),
        ])
      )
    })

    it("gibt 422 zurück bei ungültigem Startdatum", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        contracts: [["V-001", "kein-datum", "", "Muster GmbH", 1]],
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sheet: "Vertragsdaten", error: "Ungültiges Startdatum" }),
        ])
      )
    })
  })

  describe("Bug 1 Fix: Tenant-DB-Transaktion", () => {
    it("verwendet getTenantDb statt globalem prisma", async () => {
      const { getTenantDb } = await import("@/lib/db")
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({})
      const req = await buildRequest(buf)
      await POST(req as unknown as import("next/server").NextRequest)

      expect(getTenantDb).toHaveBeenCalledWith("tenant-123")
      expect(mockTransactionFn).toHaveBeenCalled()
    })
  })

  describe("Bug 2 Fix: contractLine-Filterung", () => {
    it("Leistung ohne contractLine wird allen Verträgen zugeordnet", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        objects: [
          ["Büro A", "Str. 1", "Hamburg", "20001", "Büro"],
          ["Büro B", "Str. 2", "Hamburg", "20002", "Büro"],
        ],
        // Leistung ohne contractLine (Spalte 8 fehlt) → gilt für alle
        leases: [["heizung_gas", 12, "", 2]],
        contracts: [
          ["V-001", "2024-01-01", "", "Firma A", 1],
          ["V-002", "2024-01-01", "", "Firma B", 2],
        ],
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(200)
      // Beide Verträge haben die Leistung
      expect(capturedLeaseCreates).toHaveLength(2)
      expect(capturedLeaseCreates[0].leases).toHaveLength(1)
      expect(capturedLeaseCreates[1].leases).toHaveLength(1)
    })

    it("Leistung mit contractLine=2 wird nur dem 2. Vertrag zugeordnet", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        objects: [
          ["Büro A", "Str. 1", "Hamburg", "20001", "Büro"],
          ["Büro B", "Str. 2", "Hamburg", "20002", "Büro"],
        ],
        leases: [
          ["heizung_gas", 12, "", 2, "", "", "", 2], // contractLine=2 → nur Vertrag 2
        ],
        contracts: [
          ["V-001", "2024-01-01", "", "Firma A", 1],
          ["V-002", "2024-01-01", "", "Firma B", 2],
        ],
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(200)
      expect(capturedLeaseCreates[0].leases).toHaveLength(0) // Vertrag 1 bekommt keine Leistung
      expect(capturedLeaseCreates[1].leases).toHaveLength(1) // Vertrag 2 bekommt die Leistung
    })

    it("Mischung aus globalen und vertrags-spezifischen Leistungen", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        objects: [
          ["Büro A", "Str. 1", "Hamburg", "20001", "Büro"],
          ["Büro B", "Str. 2", "Hamburg", "20002", "Büro"],
        ],
        leases: [
          ["heizung_gas", 12, "", 2],           // global → beide Verträge
          ["brandschutz", 6, "", 1, "", "", "", 1], // nur Vertrag 1
          ["klima", 3, "", 1.5, "", "", "", 2],     // nur Vertrag 2
        ],
        contracts: [
          ["V-001", "2024-01-01", "", "Firma A", 1],
          ["V-002", "2024-01-01", "", "Firma B", 2],
        ],
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(200)
      // Vertrag 1: heizung_gas (global) + brandschutz (contractLine=1)
      expect(capturedLeaseCreates[0].leases).toHaveLength(2)
      // Vertrag 2: heizung_gas (global) + klima (contractLine=2)
      expect(capturedLeaseCreates[1].leases).toHaveLength(2)
    })
  })

  describe("Erfolgreicher Import", () => {
    it("gibt 200 mit importedObjects und importedContracts zurück", async () => {
      const { POST } = await import(
        "@/app/api/wartung/contracts/import/excel/route"
      )
      const buf = await buildWorkbookBuffer({
        objects: [["Büro A", "Str. 1", "Hamburg", "20001", "Büro"]],
        leases: [["heizung_gas", 12, "", 2]],
        contracts: [["V-001", "2024-01-01", "", "Muster GmbH", 1]],
      })
      const req = await buildRequest(buf)
      const res = await POST(req as unknown as import("next/server").NextRequest)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.importedObjects).toBe(1)
      expect(body.importedContracts).toBe(1)
    })
  })
})
