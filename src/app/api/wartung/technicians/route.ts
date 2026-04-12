import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

const technicianSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  qualifications: z.array(z.string()).optional().default([]),
  workHoursStart: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM").optional().default("07:00"),
  workHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM").optional().default("16:00"),
  maxDailyHours: z.number().positive().optional().default(8.0),
  isActive: z.boolean().optional().default(true),
})

/** GET /api/wartung/technicians — Liste aller Techniker */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const db = getTenantDb(session.user.tenantId)
  const { searchParams } = new URL(req.url)
  const onlyActive = searchParams.get("active") !== "false"

  const where: Record<string, unknown> = {}
  if (onlyActive) {
    where.isActive = true
  }

  const technicians = await db.technician.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      qualifications: true,
      workHoursStart: true,
      workHoursEnd: true,
      maxDailyHours: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { planEntries: true } },
    },
  })

  return NextResponse.json(technicians)
}

/** POST /api/wartung/technicians — Neuen Techniker anlegen */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const body = await req.json()
  const result = technicianSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const db = getTenantDb(session.user.tenantId)
  const technician = await db.technician.create({
    data: { tenantId: session.user.tenantId, ...result.data },
  })

  return NextResponse.json(technician, { status: 201 })
}
