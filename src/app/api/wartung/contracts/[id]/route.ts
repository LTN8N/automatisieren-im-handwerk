import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string }> }

const contractUpdateSchema = z.object({
  contractNumber: z.string().optional().nullable(),
  customerName: z.string().min(1).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable(),
  autoRenew: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
})

/** GET /api/wartung/contracts/:id — Detail mit Leistungen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const contract = await db.maintenanceContract.findFirst({
    where: { id },
    include: {
      leases: true,
      object: { select: { id: true, name: true, address: true, city: true, buildingType: true } },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 })
  }

  return NextResponse.json(contract)
}

/** PATCH /api/wartung/contracts/:id — Vertrag bearbeiten */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const existing = await db.maintenanceContract.findFirst({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 })
  }

  const body = await req.json()
  const result = contractUpdateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { startDate, endDate, ...rest } = result.data
  const updated = await db.maintenanceContract.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
    include: { leases: true },
  })

  return NextResponse.json(updated)
}

/** DELETE /api/wartung/contracts/:id — Vertrag löschen */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const existing = await db.maintenanceContract.findFirst({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 })
  }

  await db.maintenanceContract.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
