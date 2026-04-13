import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"

type RouteParams = { params: Promise<{ id: string }> }

/** GET /api/wartung/plans/:id — Plan mit allen Einträgen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  // getTenantDb injiziert tenantId in alle Queries — kein zusätzlicher Tenant-Check nötig
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

  return NextResponse.json(plan)
}

/** DELETE /api/wartung/plans/:id — Plan löschen (nur DRAFT) */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const plan = await db.annualPlan.findFirst({ where: { id } })
  if (!plan) {
    return NextResponse.json({ error: "Plan nicht gefunden." }, { status: 404 })
  }

  if (plan.status === "RELEASED") {
    return NextResponse.json(
      { error: "Freigegebene Pläne können nicht gelöscht werden." },
      { status: 422 }
    )
  }

  // Einträge zuerst löschen, dann den Plan
  await db.annualPlanEntry.deleteMany({ where: { planId: id } })
  await db.annualPlan.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
