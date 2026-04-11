import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

const leaseSchema = z.object({
  serviceType: z.string().min(1, "Anlagentyp ist erforderlich"),
  intervalMonths: z.number().int().positive("Intervall muss positiv sein"),
  estimatedHours: z.number().positive("Dauer muss positiv sein"),
  qualificationRequired: z.string().optional(),
  seasonalPreference: z.string().optional(),
  legalBasis: z.string().optional(),
  legalDeadline: z.string().optional(),
})

const contractSchema = z.object({
  objectId: z.string().min(1, "Objekt-ID ist erforderlich"),
  contractNumber: z.string().optional(),
  customerName: z.string().min(1, "Kundenname ist erforderlich"),
  startDate: z.string().datetime({ offset: true }).or(z.string().date()),
  endDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  autoRenew: z.boolean().optional().default(false),
  notes: z.string().optional(),
  leases: z.array(leaseSchema).optional().default([]),
})

const PAGE_SIZE = 20

/** GET /api/wartung/contracts — Liste aller Verträge (optional ?objectId=) */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const db = getTenantDb(session.user.tenantId)
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const objectId = searchParams.get("objectId")

  const where: Record<string, unknown> = {}
  if (objectId) {
    where.objectId = objectId
  }

  const [total, contracts] = await Promise.all([
    db.maintenanceContract.count({ where }),
    db.maintenanceContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        object: { select: { id: true, name: true, address: true, city: true } },
        _count: { select: { leases: true } },
      },
    }),
  ])

  return NextResponse.json({ data: contracts, total, page, pageSize: PAGE_SIZE })
}

/** POST /api/wartung/contracts — Neuen Vertrag anlegen (inkl. Leistungen) */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const body = await req.json()
  const result = contractSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const db = getTenantDb(session.user.tenantId)

  // Prüfe ob Objekt zum Tenant gehört
  const object = await db.maintenanceObject.findFirst({ where: { id: result.data.objectId } })
  if (!object) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 })
  }

  const { leases, startDate, endDate, ...contractData } = result.data

  const contract = await db.maintenanceContract.create({
    data: {
      tenantId: session.user.tenantId,
      ...contractData,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      leases: {
        create: leases,
      },
    },
    include: {
      leases: true,
      object: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(contract, { status: 201 })
}
