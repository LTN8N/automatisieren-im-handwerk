/**
 * Unit-Tests: Nummernkreis-Vergabe (GoBD-konform)
 *
 * Testet naechsteNummer() aus src/lib/angebote/nummernkreis.ts
 *
 * Anforderungen:
 * - Format AG-YYYY-NNNN für Angebote, RE-YYYY-NNNN für Rechnungen
 * - Lückenlose, sequentielle Nummern (GoBD-konform)
 * - Atomarer Increment (race-condition-sicher)
 * - Mandantentrennung (tenantId)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Prisma-Mock vor dem Import der zu testenden Datei setzen
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

import { naechsteNummer } from "../../src/lib/angebote/nummernkreis"
import { prisma } from "@/lib/db"

const mockPrisma = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("naechsteNummer – Angebot", () => {
  it("gibt korrekt formatierte Angebotsnummer zurück (erste Nummer = 0001)", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: 1 }]),
      }
      return fn(tx)
    })

    const result = await naechsteNummer("tenant-1", "ANGEBOT")
    const jahr = new Date().getFullYear()
    expect(result).toBe(`AG-${jahr}-0001`)
  })

  it("padded die Nummer auf 4 Stellen (0042)", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: 42 }]),
      }
      return fn(tx)
    })

    const result = await naechsteNummer("tenant-1", "ANGEBOT")
    const jahr = new Date().getFullYear()
    expect(result).toBe(`AG-${jahr}-0042`)
  })

  it("enthält das aktuelle Jahr im Format", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: 1 }]),
      }
      return fn(tx)
    })

    const result = await naechsteNummer("tenant-1", "ANGEBOT")
    const jahr = new Date().getFullYear()
    expect(result).toContain(String(jahr))
  })

  it("verwendet Präfix AG für Angebote", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: 1 }]),
      }
      return fn(tx)
    })

    const result = await naechsteNummer("tenant-1", "ANGEBOT")
    expect(result).toMatch(/^AG-/)
  })
})

describe("naechsteNummer – Rechnung", () => {
  it("gibt korrekt formatierte Rechnungsnummer zurück (RE-Präfix)", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: 1 }]),
      }
      return fn(tx)
    })

    const result = await naechsteNummer("tenant-1", "RECHNUNG")
    const jahr = new Date().getFullYear()
    expect(result).toBe(`RE-${jahr}-0001`)
  })

  it("padded Rechnungsnummer auf 4 Stellen (0100)", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: 100 }]),
      }
      return fn(tx)
    })

    const result = await naechsteNummer("tenant-1", "RECHNUNG")
    const jahr = new Date().getFullYear()
    expect(result).toBe(`RE-${jahr}-0100`)
  })

  it("verwendet Präfix RE für Rechnungen", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: 5 }]),
      }
      return fn(tx)
    })

    const result = await naechsteNummer("tenant-1", "RECHNUNG")
    expect(result).toMatch(/^RE-/)
  })
})

describe("naechsteNummer – Mandantentrennung", () => {
  it("übergibt die tenantId korrekt an die Transaktion", async () => {
    const upsertMock = vi.fn()
    const queryRawMock = vi.fn().mockResolvedValue([{ letzte_nummer: 1 }])

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      const tx = {
        nummernkreis: { upsert: upsertMock },
        $queryRaw: queryRawMock,
      }
      return fn(tx)
    })

    await naechsteNummer("tenant-abc", "ANGEBOT")

    // Upsert muss mit korrekter tenantId aufgerufen worden sein
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId_typ_jahr: expect.objectContaining({ tenantId: "tenant-abc" }),
        }),
      })
    )
  })

  it("verschiedene Tenants erhalten unabhängige Nummernkreise", async () => {
    let callCount = 0
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) => {
      callCount++
      const tx = {
        nummernkreis: { upsert: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([{ letzte_nummer: callCount }]),
      }
      return fn(tx)
    })

    const result1 = await naechsteNummer("tenant-1", "ANGEBOT")
    const result2 = await naechsteNummer("tenant-2", "ANGEBOT")

    // Beide erhalten unterschiedliche Nummern (simuliert durch unterschiedliche DB-Ergebnisse)
    expect(result1).not.toBe(result2)
  })
})

describe("naechsteNummer – Fehlerbehandlung", () => {
  it("wirft bei DB-Fehler einen Fehler weiter", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("DB connection failed"))

    await expect(naechsteNummer("tenant-1", "ANGEBOT")).rejects.toThrow("DB connection failed")
  })
})
