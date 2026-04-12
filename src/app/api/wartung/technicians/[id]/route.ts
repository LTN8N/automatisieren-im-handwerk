import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string }> }

const technicianUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  qualifications: z.array(z.string()).optional(),
  workHoursStart: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM").optional(),
  workHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM").optional(),
  maxDailyHours: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

/** PATCH /api/wartung/technicians/:id — Techniker bearbeiten (Qualifikationen, Arbeitszeiten) */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const existing = await db.technician.findFirst({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Techniker nicht gefunden." }, { status: 404 })
  }

  const body = await req.json()
  const result = technicianUpdateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updated = await db.technician.update({
    where: { id },
    data: result.data,
  })

  return NextResponse.json(updated)
}

/** DELETE /api/wartung/technicians/:id — Techniker löschen */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const existing = await db.technician.findFirst({
    where: { id },
    include: { planEntries: { take: 1, select: { id: true } } },
  })

  if (!existing) {
    return NextResponse.json({ error: "Techniker nicht gefunden." }, { status: 404 })
  }

  if (existing.planEntries.length > 0) {
    return NextResponse.json(
      { error: "Techniker hat noch Planeinträge und kann nicht gelöscht werden. Setze ihn stattdessen auf inaktiv." },
      { status: 422 }
    )
  }

  await db.technician.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
