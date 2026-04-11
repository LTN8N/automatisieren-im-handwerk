import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string }> }

const objectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  buildingType: z.string().min(1).optional(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
})

/** GET /api/wartung/objects/:id — Objekt-Detail mit Verträgen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const object = await db.maintenanceObject.findFirst({
    where: { id },
    include: {
      contracts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          contractNumber: true,
          customerName: true,
          startDate: true,
          endDate: true,
          status: true,
          _count: { select: { leases: true } },
        },
      },
    },
  })

  if (!object) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 })
  }

  return NextResponse.json(object)
}

/** PATCH /api/wartung/objects/:id — Objekt bearbeiten */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const existing = await db.maintenanceObject.findFirst({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 })
  }

  const body = await req.json()
  const result = objectUpdateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updated = await db.maintenanceObject.update({
    where: { id },
    data: result.data,
  })

  return NextResponse.json(updated)
}

/** DELETE /api/wartung/objects/:id — Objekt löschen */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const existing = await db.maintenanceObject.findFirst({
    where: { id },
    include: { contracts: { take: 1, select: { id: true } } },
  })

  if (!existing) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 })
  }

  if (existing.contracts.length > 0) {
    return NextResponse.json(
      { error: "Objekt hat noch aktive Verträge und kann nicht gelöscht werden." },
      { status: 422 }
    )
  }

  await db.maintenanceObject.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
