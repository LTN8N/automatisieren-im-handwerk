import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"

/** GET /api/wartung/plans — Liste aller Jahrespläne */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const db = getTenantDb(session.user.tenantId)
  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined

  const where: Record<string, unknown> = {}
  if (year) {
    where.year = year
  }

  const plans = await db.annualPlan.findMany({
    where,
    orderBy: { year: "desc" },
    select: {
      id: true,
      year: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { entries: true } },
    },
  })

  return NextResponse.json(plans)
}
