import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getTenantDb, prisma } from "@/lib/db"
import { optimizeWartungsplan } from "@/lib/wartung/ai-optimizer"
import {
  generateEvents,
  filterConstraints,
  assignEvents,
  validatePlan,
  generateReport,
  loadSchoolHolidays,
  type MaintenanceLeaseWithRelations,
  type TechnicianInput,
} from "@/lib/wartung/planning-engine"
import type { PlanningOptimizerInput } from "@/lib/wartung/prompts/planning-optimizer"

const generateSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  bundesland: z.string().min(2).max(6).optional().default("HH"),
  skipAiOptimization: z.boolean().optional().default(false),
})

/**
 * POST /api/wartung/plans/generate — Jahresplan generieren.
 *
 * Body: { year: number, bundesland?: string, skipAiOptimization?: boolean }
 *
 * Wenn skipAiOptimization=true: deterministischer Pfad (Layer 1-2-4-5)
 * Wenn skipAiOptimization=false (Standard): KI-Optimierung (Layer 3)
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { year, bundesland, skipAiOptimization } = parsed.data

  const db = getTenantDb(session.user.tenantId)

  // Bestehenden DRAFT-Plan für das Jahr entfernen
  const existingDraft = await db.annualPlan.findFirst({
    where: { year, status: "DRAFT" },
  })
  if (existingDraft) {
    await db.annualPlan.delete({ where: { id: existingDraft.id } })
  }

  // Prüfen ob ein freigegebener Plan existiert
  const releasedPlan = await db.annualPlan.findFirst({
    where: { year, status: "RELEASED" },
  })
  if (releasedPlan) {
    return NextResponse.json(
      { error: `Es existiert bereits ein freigegebener Plan für ${year}.` },
      { status: 422 }
    )
  }

  // Neuen Plan anlegen
  const plan = await db.annualPlan.create({
    data: { tenantId: session.user.tenantId, year, status: "DRAFT" },
  })

  // Aktive Leistungen aus aktiven Verträgen laden
  // MaintenanceLease hat kein eigenes tenantId — Tenant-Filter läuft über contract.object
  const leases = await prisma.maintenanceLease.findMany({
    where: {
      contract: {
        object: { tenantId: session.user.tenantId },
        status: "ACTIVE",
        startDate: { lte: new Date(`${year}-12-31`) },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date(`${year}-01-01`) } },
        ],
      },
    },
    include: {
      contract: {
        include: {
          object: { select: { postalCode: true, id: true } },
        },
      },
    },
  })

  // Techniker laden
  const technicians = await db.technician.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      qualifications: true,
      workHoursStart: true,
      workHoursEnd: true,
      maxDailyHours: true,
    },
  })

  if (technicians.length === 0) {
    await db.annualPlan.delete({ where: { id: plan.id } })
    return NextResponse.json({ error: "Keine aktiven Techniker gefunden." }, { status: 422 })
  }

  if (leases.length === 0) {
    return NextResponse.json({
      planId: plan.id,
      year,
      entriesCreated: 0,
      message: "Keine aktiven Leistungen gefunden. Leerer Plan wurde angelegt.",
    })
  }

  // ── Deterministischer Pfad (skipAiOptimization=true) ──────────────────────
  if (skipAiOptimization) {
    const techInput: TechnicianInput[] = technicians.map((t) => ({
      id: t.id,
      name: t.name,
      qualifications: t.qualifications,
      maxDailyHours: t.maxDailyHours,
    }))

    const leasesWithRelations = leases as unknown as MaintenanceLeaseWithRelations[]

    const schoolHolidays = await loadSchoolHolidays(bundesland, year)

    const events = generateEvents(leasesWithRelations, year)
    const filtered = filterConstraints(events, techInput, schoolHolidays, [], year)
    const { entries: assignedEntries, unplannable } = assignEvents(filtered, techInput, year)
    const validation = validatePlan(assignedEntries)
    const report = generateReport(
      assignedEntries,
      techInput,
      year,
      unplannable.map((u) => ({ leaseId: u.event.leaseId, reason: u.reason }))
    )

    const dbEntries = assignedEntries.map((e) => ({
      planId: plan.id,
      leaseId: e.leaseId,
      technicianId: e.technicianId,
      scheduledDate: e.scheduledDate,
      estimatedHours: e.estimatedHours,
      status: "PLANNED" as const,
      conflictStatus: validation.errors.find((err) => err.leaseId === e.leaseId)
        ? "conflict"
        : null,
      conflictDetails:
        validation.errors.find((err) => err.leaseId === e.leaseId)?.message ?? null,
    }))

    if (dbEntries.length > 0) {
      await db.annualPlanEntry.createMany({ data: dbEntries })
    }

    return NextResponse.json({
      planId: plan.id,
      year,
      entriesCreated: dbEntries.length,
      message: `Deterministischer Plan für ${year} generiert.`,
      validation: {
        valid: validation.valid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      },
      report: {
        kpis: report.kpis,
        unplannableCount: unplannable.length,
      },
    })
  }

  // PLZ-Cluster aufbauen (erste 2 Stellen der PLZ)
  const clusters: Record<string, string[]> = {}
  for (const lease of leases) {
    const plz = lease.contract.object.postalCode
    const prefix = plz.slice(0, 2)
    if (!clusters[prefix]) clusters[prefix] = []
    if (!clusters[prefix].includes(lease.contract.object.id)) {
      clusters[prefix].push(lease.contract.object.id)
    }
  }

  const entries: Array<{
    planId: string
    leaseId: string
    technicianId: string
    scheduledDate: Date
    estimatedHours: number
    status: "PLANNED"
    aiReasoning: string
  }> = []
  const generationWarnings: string[] = []

  // Pro Monat: alle fälligen Leistungen bestimmen und per KI optimieren
  for (let month = 1; month <= 12; month++) {
    const dueLeases = leases.filter((lease) => {
      // Leistung ist in diesem Monat fällig wenn intervalMonths passt
      const contractStart = lease.contract.startDate
      const monthsSinceStart =
        (year - contractStart.getFullYear()) * 12 + (month - contractStart.getMonth() - 1)
      return monthsSinceStart >= 0 && monthsSinceStart % lease.intervalMonths === 0
    })

    if (dueLeases.length === 0) continue

    // Verfügbare Slots pro Techniker für diesen Monat berechnen
    const daysInMonth = new Date(year, month, 0).getDate()
    const techInput: PlanningOptimizerInput["technicians"] = technicians.map((t) => ({
      id: t.id,
      name: t.name,
      qualifications: t.qualifications,
      availableSlots: Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(year, month - 1, i + 1)
        const dayOfWeek = date.getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) return null // Wochenende
        return {
          date: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
          remainingHours: t.maxDailyHours,
        }
      }).filter((s): s is { date: string; remainingHours: number } => s !== null),
    }))

    const events: PlanningOptimizerInput["events"] = dueLeases.map((lease) => ({
      id: lease.id,
      serviceType: lease.serviceType,
      objectPostalCode: lease.contract.object.postalCode,
      estimatedHours: lease.estimatedHours,
      isHardDeadline: false,
      qualificationRequired: lease.qualificationRequired ?? undefined,
      seasonalPreference: lease.seasonalPreference ?? undefined,
    }))

    const input: PlanningOptimizerInput = {
      month,
      year,
      events,
      technicians: techInput,
      clusters,
    }

    let result
    try {
      result = await optimizeWartungsplan(input)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unbekannter Fehler"
      generationWarnings.push(`Monat ${month}: KI-Optimierung fehlgeschlagen (${errMsg}). Fallback: 15. des Monats, erster Techniker.`)
      // Bei KI-Fehler: Einträge ohne KI-Zuweisung anlegen (erster verfügbarer Techniker)
      for (const lease of dueLeases) {
        entries.push({
          planId: plan.id,
          leaseId: lease.id,
          technicianId: technicians[0].id,
          scheduledDate: new Date(year, month - 1, 15),
          estimatedHours: lease.estimatedHours,
          status: "PLANNED",
          aiReasoning: `KI-Optimierung fehlgeschlagen: ${errMsg}`,
        })
      }
      continue
    }

    for (const assignment of result.assignments) {
      const lease = dueLeases.find((l) => l.id === assignment.eventId)
      if (!lease) continue

      entries.push({
        planId: plan.id,
        leaseId: lease.id,
        technicianId: assignment.technicianId,
        scheduledDate: new Date(assignment.scheduledDate),
        estimatedHours: lease.estimatedHours,
        status: "PLANNED",
        aiReasoning: assignment.begruendung,
      })
    }
  }

  // Alle Einträge in die DB schreiben
  if (entries.length > 0) {
    await db.annualPlanEntry.createMany({ data: entries })
  }

  return NextResponse.json({
    planId: plan.id,
    year,
    entriesCreated: entries.length,
    message: `Plan für ${year} erfolgreich generiert.`,
    warnings: generationWarnings,
  })
}
