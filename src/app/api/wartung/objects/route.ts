import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

const objectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(200),
  address: z.string().min(1, "Adresse ist erforderlich").max(500),
  city: z.string().min(1, "Stadt ist erforderlich").max(100),
  postalCode: z.string().min(1, "PLZ ist erforderlich").max(10),
  buildingType: z.string().min(1, "Gebäudetyp ist erforderlich").max(50),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  accessNotes: z.string().max(1000).optional(),
})

const PAGE_SIZE = 20

/** GET /api/wartung/objects — Liste aller Objekte des Tenants mit Paginierung */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const db = getTenantDb(session.user.tenantId)
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const search = searchParams.get("search") ?? ""

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ]
  }

  const [total, objects] = await Promise.all([
    db.maintenanceObject.count({ where }),
    db.maintenanceObject.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        postalCode: true,
        buildingType: true,
        contactName: true,
        contactPhone: true,
        accessNotes: true,
        createdAt: true,
        _count: { select: { contracts: true } },
      },
    }),
  ])

  return NextResponse.json({ data: objects, total, page, pageSize: PAGE_SIZE })
}

/** POST /api/wartung/objects — Neues Objekt anlegen */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const body = await req.json()
  const result = objectSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const db = getTenantDb(session.user.tenantId)
  const object = await db.maintenanceObject.create({
    data: { tenantId: session.user.tenantId, ...result.data },
    select: {
      id: true, name: true, address: true, city: true, postalCode: true,
      buildingType: true, contactName: true, contactPhone: true, accessNotes: true, createdAt: true,
    },
  })

  return NextResponse.json(object, { status: 201 })
}
