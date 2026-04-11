import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string; entryId: string }> }

const entryUpdateSchema = z.object({
  scheduledDate: z.string().date("Format: YYYY-MM-DD"),
  technicianId: z.string().min(1, "Techniker-ID ist erforderlich"),
})

/** Schwellenwert für Kapazitäts-Warnung (90 % der täglichen Maximalstunden) */
const CAPACITY_WARNING_THRESHOLD = 0.9

interface ConflictResult {
  status: "OK" | "WARNUNG" | "KONFLIKT"
  details: string[]
}

/**
 * Synchroner Conflict-Check (< 500ms):
 * - Fehlende Qualifikation
 * - Kapazitätsüberschreitung (maxDailyHours)
 * - Techniker inaktiv
 *
 * Alle Queries nutzen den tenant-scoped db-Client — kein Cross-Tenant-Zugriff möglich.
 */
async function checkEntryConflict(
  db: ReturnType<typeof getTenantDb>,
  entryId: string,
  planId: string,
  newDate: string,
  newTechnicianId: string
): Promise<ConflictResult> {
  const details: string[] = []

  // Leistungsdetails für diesen Eintrag laden (tenant-scoped via Plan-Beziehung)
  const entry = await db.annualPlanEntry.findFirst({
    where: { id: entryId, planId },
    include: {
      lease: { select: { estimatedHours: true, qualificationRequired: true } },
    },
  })

  if (!entry) {
    return { status: "KONFLIKT", details: ["Eintrag nicht gefunden."] }
  }

  // Techniker laden (tenant-scoped)
  const technician = await db.technician.findFirst({
    where: { id: newTechnicianId },
    select: { maxDailyHours: true, qualifications: true, name: true, isActive: true },
  })

  if (!technician) {
    return { status: "KONFLIKT", details: ["Techniker nicht gefunden."] }
  }

  if (!technician.isActive) {
    details.push("Techniker ist nicht aktiv.")
  }

  // Qualifikationsprüfung
  const requiredQual = entry.lease.qualificationRequired
  if (requiredQual && !technician.qualifications.includes(requiredQual)) {
    details.push(`Techniker hat nicht die erforderliche Qualifikation: ${requiredQual}.`)
  }

  // Bereits gebuchte Stunden dieses Technikers am neuen Datum (außer dem aktuellen Eintrag)
  // Tenant-Isolation erfolgt durch den tenant-scoped Client (plan.tenantId wird automatisch gefilert)
  const existingEntries = await db.annualPlanEntry.findMany({
    where: {
      technicianId: newTechnicianId,
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
    return { status: "OK", details: [] }
  }

  const hasHardConflict = details.some(
    (d) => d.includes("Qualifikation") || d.includes("Kapazität überschritten") || d.includes("nicht aktiv")
  )

  return {
    status: hasHardConflict ? "KONFLIKT" : "WARNUNG",
    details,
  }
}

/** PATCH /api/wartung/plans/:id/entries/:entryId — Eintrag manuell anpassen (mit Conflict-Check) */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id: planId, entryId } = await params
  const db = getTenantDb(session.user.tenantId)

  // Plan-Zugehörigkeit und Tenant prüfen (tenant-scoped)
  const plan = await db.annualPlan.findFirst({ where: { id: planId } })
  if (!plan) {
    return NextResponse.json({ error: "Plan nicht gefunden." }, { status: 404 })
  }

  if (plan.status === "RELEASED") {
    return NextResponse.json(
      { error: "Freigegebene Pläne können nicht mehr bearbeitet werden." },
      { status: 422 }
    )
  }

  const body = await req.json()
  const result = entryUpdateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { scheduledDate, technicianId } = result.data

  // Conflict-Check (tenant-scoped db)
  const conflict = await checkEntryConflict(db, entryId, planId, scheduledDate, technicianId)

  if (conflict.status === "KONFLIKT") {
    return NextResponse.json({ error: "Konflikt erkannt", conflict }, { status: 422 })
  }

  // Eintrag aktualisieren — tenant-scoped: planId-Filter stellt Zugehörigkeit sicher
  const updated = await db.annualPlanEntry.update({
    where: { id: entryId, planId },
    data: {
      scheduledDate: new Date(scheduledDate),
      technicianId,
      conflictStatus: conflict.status,
      conflictDetails: conflict.details.join("; ") || null,
    },
    include: {
      technician: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ entry: updated, conflict })
}
