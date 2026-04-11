import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { prisma } from "@/lib/db"

type RouteParams = { params: Promise<{ id: string }> }

/** GET /api/wartung/plans/:id — Plan mit allen Einträgen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const plan = await db.annualPlan.findFirst({
    where: { id },
    include: {
      entries: {
        orderBy: { scheduledDate: "asc" },
        include: {
          technician: { select: { id: true, name: true, qualifications: true } },
          lease: {
            include: {
              contract: {
                include: {
                  object: { select: { id: true, name: true, address: true, city: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!plan) {
    return NextResponse.json({ error: "Plan nicht gefunden." }, { status: 404 })
  }

  // Tenant-Check: plan.tenantId muss passen
  const rawPlan = await prisma.annualPlan.findUnique({ where: { id }, select: { tenantId: true } })
  if (!rawPlan || rawPlan.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Plan nicht gefunden." }, { status: 404 })
  }

  return NextResponse.json(plan)
}
