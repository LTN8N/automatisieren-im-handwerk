import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/** GET /api/health — Health-Check für Monitoring */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { status: "error", database: "disconnected", timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
