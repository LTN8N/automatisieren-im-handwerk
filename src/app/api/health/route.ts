import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime());

  let dbStatus: "connected" | "error" = "error";
  let dbLatencyMs: number | null = null;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "connected";
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "error",
        dbLatencyMs: null,
        version: process.env.npm_package_version ?? "unknown",
        uptimeSeconds,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    db: dbStatus,
    dbLatencyMs,
    version: process.env.npm_package_version ?? "unknown",
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  });
}
