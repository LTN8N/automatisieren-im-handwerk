import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"

/** GET /api/kunden — Liste aller Kunden (für Dropdowns und Übersicht) */
export async function GET() {
  const session = await auth()
  const tenantId = (session?.user as { tenantId?: string })?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const db = getTenantDb(tenantId)
  const kunden = await db.kunde.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, adresse: true, email: true, telefon: true },
  })

  return NextResponse.json(kunden)
}
