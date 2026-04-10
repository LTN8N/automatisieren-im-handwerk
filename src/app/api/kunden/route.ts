import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

const kundeSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  adresse: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefon: z.string().optional(),
  ustId: z.string().optional(),
  steuernummer: z.string().optional(),
  notizen: z.string().optional(),
})

/** GET /api/kunden — Liste aller Kunden mit optionaler Suche */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const db = getTenantDb(session.user.tenantId)
  const search = new URL(req.url).searchParams.get("search") ?? ""

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { telefon: { contains: search, mode: "insensitive" } },
    ]
  }

  const kunden = await db.kunde.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, adresse: true, email: true, telefon: true, notizen: true, createdAt: true },
  })

  return NextResponse.json(kunden)
}

/** POST /api/kunden — Neuen Kunden erstellen */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const body = await req.json()
  const result = kundeSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const db = getTenantDb(session.user.tenantId)
  const kunde = await db.kunde.create({
    data: { tenantId: session.user.tenantId, ...result.data },
  })

  return NextResponse.json(kunde, { status: 201 })
}
