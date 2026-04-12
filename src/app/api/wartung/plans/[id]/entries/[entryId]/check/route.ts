import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"

type RouteParams = { params: Promise<{ id: string; entryId: string }> }

const CAPACITY_WARNING_THRESHOLD = 0.9

/**
 * GET /api/wartung/plans/:id/entries/:entryId/check?date=YYYY-MM-DD&technicianId=...
 *
 * Vorab-Conflict-Check für Drag & Drop.
 * Gibt { status: "OK" | "WARNUNG" | "KONFLIKT", details: string[] } zurück.
 * Kein Schreiben — nur Lesen (< 500ms).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id: planId, entryId } = await params
  const url = new URL(req.url)
  const newDate = url.searchParams.get("date")
  const newTechnicianId = url.searchParams.get("technicianId")

  if (!newDate) {
    return NextResponse.json({ error: "Parameter 'date' fehlt." }, { status: 400 })
  }

  const db = getTenantDb(session.user.tenantId)

  // Plan-Zugehörigkeit prüfen (tenant-scoped)
  const plan = await db.annualPlan.findFirst({ where: { id: planId } })
  if (!plan) {
    return NextResponse.json({ error: "Plan nicht gefunden." }, { status: 404 })
  }

  // Eintrag laden
  const entry = await db.annualPlanEntry.findFirst({
    where: { id: entryId, planId },
    include: {
      lease: { select: { estimatedHours: true, qualificationRequired: true } },
    },
  })

  if (!entry) {
    return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 })
  }

  const technicianId = newTechnicianId ?? entry.technicianId
  const details: string[] = []

  // Techniker laden
  const technician = await db.technician.findFirst({
    where: { id: technicianId },
    select: { maxDailyHours: true, qualifications: true, name: true, isActive: true },
  })

  if (!technician) {
    return NextResponse.json({ status: "KONFLIKT", details: ["Techniker nicht gefunden."] })
  }

  if (!technician.isActive) {
    details.push("Techniker ist nicht aktiv.")
  }

  // Qualifikationsprüfung
  const requiredQual = entry.lease.qualificationRequired
  if (requiredQual && !technician.qualifications.includes(requiredQual)) {
    details.push(`Techniker hat nicht die erforderliche Qualifikation: ${requiredQual}.`)
  }

  // Kapazitätsprüfung
  const existingEntries = await db.annualPlanEntry.findMany({
    where: {
      technicianId,
      scheduledDate: new Date(newDate),
      id: { not: entryId },
    },
    select: { estimatedHours: true },
  })

  const bookedHours = existingEntries.reduce((sum, e) => sum + e.estimatedHours, 0)
  const afterBooking = bookedHours + entry.lease.estimatedHours

  if (afterBooking > technician.maxDailyHours) {
    details.push(
      `Kapazität überschritten: ${afterBooking.toFixed(1)}h geplant, Max. ${technician.maxDailyHours}h/Tag.`
    )
  } else if (afterBooking > technician.maxDailyHours * CAPACITY_WARNING_THRESHOLD) {
    details.push(
      `Kapazität fast erreicht: ${afterBooking.toFixed(1)}h von ${technician.maxDailyHours}h.`
    )
  }

  if (details.length === 0) {
    return NextResponse.json({ status: "OK", details: [] })
  }

  const hasHardConflict = details.some(
    (d) =>
      d.includes("Qualifikation") ||
      d.includes("Kapazität überschritten") ||
      d.includes("nicht aktiv")
  )

  return NextResponse.json({
    status: hasHardConflict ? "KONFLIKT" : "WARNUNG",
    details,
  })
}
