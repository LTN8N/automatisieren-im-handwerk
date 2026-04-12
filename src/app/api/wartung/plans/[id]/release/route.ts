import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"

type RouteParams = { params: Promise<{ id: string }> }

/** POST /api/wartung/plans/:id/release — Plan freigeben */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const db = getTenantDb(session.user.tenantId)

  const plan = await db.annualPlan.findFirst({
    where: { id },
    include: { _count: { select: { entries: true } } },
  })

  if (!plan) {
    return NextResponse.json({ error: "Plan nicht gefunden." }, { status: 404 })
  }

  if (plan.status === "RELEASED") {
    return NextResponse.json({ error: "Plan ist bereits freigegeben." }, { status: 422 })
  }

  if (plan._count.entries === 0) {
    return NextResponse.json(
      { error: "Ein Plan ohne Einträge kann nicht freigegeben werden." },
      { status: 422 }
    )
  }

  const released = await db.annualPlan.update({
    where: { id },
    data: { status: "RELEASED" },
  })

  return NextResponse.json(released)
}
