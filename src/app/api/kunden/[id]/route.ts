import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string }> }

const kundeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  adresse: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefon: z.string().optional(),
  ustId: z.string().optional(),
  steuernummer: z.string().optional(),
  notizen: z.string().optional(),
})

/** GET /api/kunden/[id] — Einzelner Kunde mit Angeboten/Rechnungen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const kunde = await db.kunde.findFirst({
    where: { id },
    include: {
      angebote: {
        where: { archiviertAm: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, nummer: true, status: true, brutto: true, createdAt: true },
      },
      rechnungen: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, nummer: true, status: true, brutto: true, createdAt: true },
      },
    },
  })

  if (!kunde) {
    return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 })
  }

  return NextResponse.json(kunde)
}

/** PUT /api/kunden/[id] — Kunde aktualisieren */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const kunde = await db.kunde.findFirst({ where: { id } })
  if (!kunde) {
    return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 })
  }

  const body = await req.json()
  const result = kundeUpdateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updated = await db.kunde.update({
    where: { id },
    data: result.data,
  })

  return NextResponse.json(updated)
}

/** DELETE /api/kunden/[id] — Kunde loeschen */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const kunde = await db.kunde.findFirst({
    where: { id },
    include: { angebote: { take: 1 }, rechnungen: { take: 1 } },
  })

  if (!kunde) {
    return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 })
  }

  if (kunde.angebote.length > 0 || kunde.rechnungen.length > 0) {
    return NextResponse.json(
      { error: "Kunde hat noch Angebote oder Rechnungen und kann nicht geloescht werden." },
      { status: 422 }
    )
  }

  await db.kunde.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
