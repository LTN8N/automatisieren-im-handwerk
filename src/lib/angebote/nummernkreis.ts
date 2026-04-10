import { prisma } from "@/lib/db"

/**
 * Vergibt die naechste fortlaufende Nummer fuer ein Dokument (Angebot oder Rechnung).
 * Format: AG-YYYY-NNNN / RE-YYYY-NNNN
 */
export async function naechsteNummer(
  tenantId: string,
  typ: "ANGEBOT" | "RECHNUNG"
): Promise<string> {
  const jahr = new Date().getFullYear()
  const prefix = typ === "ANGEBOT" ? "AG" : "RE"
  const startsWith = `${prefix}-${jahr}-`

  if (typ === "RECHNUNG") {
    const letzte = await prisma.rechnung.findFirst({
      where: { tenantId, nummer: { startsWith } },
      orderBy: { nummer: "desc" },
      select: { nummer: true },
    })
    const nr = letzte ? parseInt(letzte.nummer.split("-")[2] ?? "0", 10) + 1 : 1
    return `${startsWith}${String(nr).padStart(4, "0")}`
  }

  // ANGEBOT
  const letzte = await prisma.angebot.findFirst({
    where: { tenantId, nummer: { startsWith } },
    orderBy: { nummer: "desc" },
    select: { nummer: true },
  })
  const nr = letzte ? parseInt(letzte.nummer.split("-")[2] ?? "0", 10) + 1 : 1
  return `${startsWith}${String(nr).padStart(4, "0")}`
}
