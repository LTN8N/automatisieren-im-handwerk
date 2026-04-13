import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"

const PAGE_SIZE = 20

/** GET /api/wartung/plans — Liste aller Jahrespläne mit optionalem Jahr-Filter */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const db = getTenantDb(session.user.tenantId)
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined

  const where: Record<string, unknown> = {}
  if (year) {
    where.year = year
  }

  const [total, plans] = await Promise.all([
    db.annualPlan.count({ where }),
    db.annualPlan.findMany({
      where,
      orderBy: { year: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        year: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { entries: true } },
      },
    }),
  ])

  return NextResponse.json({ data: plans, total, page, pageSize: PAGE_SIZE })
}
