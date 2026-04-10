import { prisma } from "@/lib/db"

/**
 * Vergibt die nächste fortlaufende Nummer für ein Dokument (Angebot oder Rechnung).
 * Transaktionssicher via atomarem upsert — keine Lücken (GoBD §146 AO).
 */
export async function naechsteNummer(
  tenantId: string,
  typ: "ANGEBOT" | "RECHNUNG"
): Promise<string> {
  const jahr = new Date().getFullYear()
  const prefix = typ === "ANGEBOT" ? "AG" : "RE"

  const result = await prisma.$transaction(async (tx) => {
    const kreis = await tx.nummernkreis.upsert({
      where: { tenantId_typ_jahr: { tenantId, typ, jahr } },
      create: { tenantId, typ, jahr, letzteNummer: 1 },
      update: { letzteNummer: { increment: 1 } },
    })
    return kreis.letzteNummer
  })

  return `${prefix}-${jahr}-${String(result).padStart(4, "0")}`
}
