import { prisma } from "@/lib/db"

/**
 * Vergibt die naechste fortlaufende Nummer fuer ein Dokument (Angebot oder Rechnung).
 * Format: AG-YYYY-NNNN / RE-YYYY-NNNN
 *
 * Nutzt das Nummernkreis-Modell mit atomarem UPDATE für race-condition-sichere
 * Nummernvergabe (GoBD-konform: lückenlose, sequentielle Nummern).
 */
export async function naechsteNummer(
  tenantId: string,
  typ: "ANGEBOT" | "RECHNUNG"
): Promise<string> {
  const jahr = new Date().getFullYear()
  const prefix = typ === "ANGEBOT" ? "AG" : "RE"

  // Atomarer Upsert + Increment: verhindert Race Conditions bei gleichzeitigen Requests
  const nummernkreis = await prisma.$transaction(async (tx) => {
    // Upsert den Nummernkreis-Eintrag (erstellt ihn beim ersten Aufruf pro Jahr)
    await tx.nummernkreis.upsert({
      where: {
        tenantId_typ_jahr: { tenantId, typ, jahr },
      },
      create: {
        tenantId,
        typ,
        jahr,
        letzteNummer: 0,
      },
      update: {},
    })

    // Atomarer Increment via raw SQL um Row-Level-Locking zu garantieren
    const result = await tx.$queryRaw<Array<{ letzte_nummer: number }>>`
      UPDATE nummernkreise
      SET letzte_nummer = letzte_nummer + 1, updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND typ = ${typ} AND jahr = ${jahr}
      RETURNING letzte_nummer
    `

    return result[0].letzte_nummer
  })

  return `${prefix}-${jahr}-${String(nummernkreis).padStart(4, "0")}`
}
