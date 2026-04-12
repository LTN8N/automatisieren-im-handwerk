/**
 * Wartungsmanager: Deterministische Planungs-Engine (AUT-36)
 *
 * Layer 1: Event-Generierung     — generateEvents()
 * Layer 2: Constraint-Filterung  — filterConstraints()
 * Layer 4: Validierung           — validatePlan()
 * Layer 5: KPI-Reporting         — generateReport()
 *
 * Layer 3 (KI-Optimierung) liegt in ai-optimizer.ts
 */

import fs from "fs"
import path from "path"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaintenanceLeaseWithRelations {
  id: string
  contractId: string
  serviceType: string
  intervalMonths: number
  estimatedHours: number
  qualificationRequired: string | null
  seasonalPreference: string | null
  legalBasis: string | null
  legalDeadline: string | null
  contract: {
    id: string
    startDate: Date
    object: {
      id: string
      postalCode: string
    }
  }
}

export interface PlanningEvent {
  leaseId: string
  contractId: string
  objectId: string
  postalCode: string
  serviceType: string
  estimatedHours: number
  qualificationRequired: string | null
  seasonalPreference: string | null
  isHardDeadline: boolean
  legalBasis: string | null
  legalDeadline: string | null
  dueMonth: Date
}

export interface SchoolHolidayPeriod {
  startDate: string
  endDate: string
  name: string
}

export interface SchoolHolidayData {
  bundesland: string
  year: number
  periods: SchoolHolidayPeriod[]
}

export interface TechnicianInput {
  id: string
  name: string
  qualifications: string[]
  maxDailyHours: number
}

export interface ExistingBooking {
  technicianId: string
  scheduledDate: Date
  estimatedHours: number
}

export interface FilteredEvents {
  feasible: PlanningEvent[]
  infeasible: Array<{ event: PlanningEvent; reason: string }>
  /** technicianId → ISO date string (YYYY-MM-DD) → remaining hours */
  technicianCapacity: Map<string, Map<string, number>>
  /** "YYYY-Www" strings of school holiday ISO weeks */
  schoolHolidayWeeks: Set<string>
  /** PLZ prefix (first 2 chars) → objectIds */
  plzClusters: Map<string, string[]>
}

export interface PlanEntry {
  id?: string
  leaseId: string
  technicianId: string
  scheduledDate: Date
  estimatedHours: number
  postalCode: string
  isHardDeadline: boolean
}

export interface ValidationError {
  entryId?: string
  leaseId?: string
  type: "double_booking" | "hard_deadline_missed" | "capacity_exceeded" | "buffer_violation"
  message: string
}

export interface ValidationWarning {
  type: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface PlanReport {
  totalMaintenancesByTechnician: Record<string, { count: number; hours: number }>
  monthlyUtilization: Array<{
    month: number
    technicianId: string
    plannedHours: number
    availableHours: number
    utilizationPercent: number
  }>
  unplannableEvents: Array<{ leaseId: string; reason: string }>
  kpis: {
    totalHours: number
    avgHoursPerDay: number
    bufferWeeks: number
    totalEntries: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO week number (ISO 8601) */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function toISODateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** All Monday–Friday dates within a given month */
export function getWorkingDaysOfMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    if (!isWeekend(date)) days.push(date)
  }
  return days
}

// ─── Schulferien ──────────────────────────────────────────────────────────────

const SCHULFERIEN_CACHE_DIR = path.join(process.cwd(), "data", "schulferien")

function getBundeslandCode(bundesland: string): string {
  if (bundesland.startsWith("DE-")) return bundesland
  return `DE-${bundesland.toUpperCase()}`
}

type OpenHolidaysApiItem = {
  startDate: string
  endDate: string
  name: Array<{ language: string; text: string }>
}

/**
 * Lädt Schulferien für ein Bundesland und Jahr von openholidaysapi.org.
 * Ergebnis wird in data/schulferien/{bundesland}-{year}.json gecacht.
 */
export async function loadSchoolHolidays(
  bundesland: string,
  year: number
): Promise<SchoolHolidayData> {
  const code = getBundeslandCode(bundesland)
  const shortCode = code.replace("DE-", "").toUpperCase()
  const cacheFile = path.join(SCHULFERIEN_CACHE_DIR, `${shortCode}-${year}.json`)

  try {
    const cached = fs.readFileSync(cacheFile, "utf8")
    return JSON.parse(cached) as SchoolHolidayData
  } catch {
    // cache miss
  }

  const url =
    `https://openholidaysapi.org/SchoolHolidays` +
    `?countryIsoCode=DE&languageIsoCode=DE` +
    `&validFrom=${year}-01-01&validTo=${year}-12-31` +
    `&subdivisionCode=${code}`

  let apiData: OpenHolidaysApiItem[] = []
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    apiData = (await resp.json()) as OpenHolidaysApiItem[]
  } catch {
    return { bundesland: shortCode, year, periods: [] }
  }

  const data: SchoolHolidayData = {
    bundesland: shortCode,
    year,
    periods: apiData.map((item) => ({
      startDate: item.startDate.slice(0, 10),
      endDate: item.endDate.slice(0, 10),
      name: item.name.find((n) => n.language === "DE")?.text ?? item.name[0]?.text ?? "",
    })),
  }

  try {
    fs.mkdirSync(SCHULFERIEN_CACHE_DIR, { recursive: true })
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), "utf8")
  } catch {
    // cache write failure is non-fatal
  }

  return data
}

// ─── Layer 1: Event-Generierung ───────────────────────────────────────────────

/**
 * Berechnet alle Fälligkeitstermine für ein Jahr aus den Leistungen.
 *
 * Sortierung: gesetzliche Fristen (isHardDeadline) zuerst, dann chronologisch.
 */
export function generateEvents(
  leases: MaintenanceLeaseWithRelations[],
  year: number
): PlanningEvent[] {
  const events: PlanningEvent[] = []

  for (const lease of leases) {
    const start = lease.contract.startDate

    for (let month = 1; month <= 12; month++) {
      const monthsSinceStart =
        (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth())

      if (monthsSinceStart >= 0 && monthsSinceStart % lease.intervalMonths === 0) {
        events.push({
          leaseId: lease.id,
          contractId: lease.contractId,
          objectId: lease.contract.object.id,
          postalCode: lease.contract.object.postalCode,
          serviceType: lease.serviceType,
          estimatedHours: lease.estimatedHours,
          qualificationRequired: lease.qualificationRequired,
          seasonalPreference: lease.seasonalPreference,
          isHardDeadline: Boolean(lease.legalBasis),
          legalBasis: lease.legalBasis,
          legalDeadline: lease.legalDeadline,
          dueMonth: new Date(year, month - 1, 1),
        })
      }
    }
  }

  return events.sort((a, b) => {
    if (a.isHardDeadline !== b.isHardDeadline) return a.isHardDeadline ? -1 : 1
    return a.dueMonth.getTime() - b.dueMonth.getTime()
  })
}

// ─── Layer 2: Constraint-Filterung ───────────────────────────────────────────

/**
 * Filtert Events nach Qualifikations-Constraints und berechnet:
 * - verfügbare Kapazität pro Techniker/Tag (abzüglich bestehender Buchungen)
 * - Schulferienwochen
 * - PLZ-Cluster für Tagesrouten-Clustering
 */
export function filterConstraints(
  events: PlanningEvent[],
  technicians: TechnicianInput[],
  schoolHolidays: SchoolHolidayData,
  existingBookings: ExistingBooking[],
  year: number
): FilteredEvents {
  // PLZ clusters (first 2 digits)
  const plzClusters = new Map<string, string[]>()
  for (const event of events) {
    const prefix = event.postalCode.slice(0, 2)
    if (!plzClusters.has(prefix)) plzClusters.set(prefix, [])
    const cluster = plzClusters.get(prefix)!
    if (!cluster.includes(event.objectId)) cluster.push(event.objectId)
  }

  // School holiday ISO weeks
  const schoolHolidayWeeks = new Set<string>()
  for (const period of schoolHolidays.periods) {
    let cursor = new Date(period.startDate)
    const end = new Date(period.endDate)
    while (cursor <= end) {
      const week = getISOWeek(cursor)
      schoolHolidayWeeks.add(`${cursor.getFullYear()}-W${String(week).padStart(2, "0")}`)
      cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  // Initialize capacity for all working days in the year
  const technicianCapacity = new Map<string, Map<string, number>>()
  for (const tech of technicians) {
    const byDate = new Map<string, number>()
    for (let month = 1; month <= 12; month++) {
      for (const day of getWorkingDaysOfMonth(year, month)) {
        byDate.set(toISODateString(day), tech.maxDailyHours)
      }
    }
    technicianCapacity.set(tech.id, byDate)
  }

  // Subtract existing bookings
  for (const booking of existingBookings) {
    const dateStr = toISODateString(booking.scheduledDate)
    const cap = technicianCapacity.get(booking.technicianId)
    if (cap?.has(dateStr)) {
      cap.set(dateStr, Math.max(0, (cap.get(dateStr) ?? 0) - booking.estimatedHours))
    }
  }

  // Filter events: qualification constraint
  const feasible: PlanningEvent[] = []
  const infeasible: Array<{ event: PlanningEvent; reason: string }> = []

  for (const event of events) {
    if (!event.qualificationRequired) {
      feasible.push(event)
      continue
    }
    const qualified = technicians.some((t) =>
      t.qualifications.includes(event.qualificationRequired!)
    )
    if (qualified) {
      feasible.push(event)
    } else {
      infeasible.push({
        event,
        reason: `Keine qualifizierten Techniker für "${event.qualificationRequired}"`,
      })
    }
  }

  return { feasible, infeasible, technicianCapacity, schoolHolidayWeeks, plzClusters }
}

// ─── Deterministische Zuweisung ───────────────────────────────────────────────

/**
 * Weist feasible Events deterministisch Technikern zu.
 *
 * Strategie:
 * 1. Harte Fristen zuerst, dann absteigend nach estimatedHours
 * 2. Für jeden Event: bevorzuge Tage, an denen der Techniker bereits in derselben
 *    PLZ-Zone arbeitet (Clustering); fallback: jeder freie Tag
 */
export function assignEvents(
  filtered: FilteredEvents,
  technicians: TechnicianInput[],
  year: number
): { entries: PlanEntry[]; unplannable: Array<{ event: PlanningEvent; reason: string }> } {
  const entries: PlanEntry[] = []
  const unplannable: Array<{ event: PlanningEvent; reason: string }> = [
    ...filtered.infeasible,
  ]

  // Deep-copy capacity map so we can mutate safely
  const capacity = new Map(
    [...filtered.technicianCapacity.entries()].map(([k, v]) => [k, new Map(v)])
  )

  // Track PLZ cluster committed per technician+day for routing efficiency
  // technicianId → dateStr → PLZ prefix
  const techDayCluster = new Map<string, Map<string, string>>()
  for (const tech of technicians) {
    techDayCluster.set(tech.id, new Map())
  }

  const sorted = [...filtered.feasible].sort((a, b) => {
    if (a.isHardDeadline !== b.isHardDeadline) return a.isHardDeadline ? -1 : 1
    return b.estimatedHours - a.estimatedHours
  })

  for (const event of sorted) {
    const month = event.dueMonth.getMonth() + 1
    const workingDays = getWorkingDaysOfMonth(year, month)
    const plzPrefix = event.postalCode.slice(0, 2)

    const qualifiedTechs = event.qualificationRequired
      ? technicians.filter((t) => t.qualifications.includes(event.qualificationRequired!))
      : technicians

    let assigned = false

    // Two passes: first prefer same-cluster days, then any available day
    for (const clusterPass of [true, false]) {
      if (assigned) break
      for (const day of workingDays) {
        if (assigned) break
        const dateStr = toISODateString(day)
        for (const tech of qualifiedTechs) {
          const cap = capacity.get(tech.id)
          if (!cap) continue
          const remaining = cap.get(dateStr) ?? 0
          if (remaining < event.estimatedHours) continue

          const existingCluster = techDayCluster.get(tech.id)?.get(dateStr)
          if (clusterPass && existingCluster !== undefined && existingCluster !== plzPrefix) {
            continue
          }

          // Book
          cap.set(dateStr, remaining - event.estimatedHours)
          techDayCluster.get(tech.id)!.set(dateStr, plzPrefix)
          entries.push({
            leaseId: event.leaseId,
            technicianId: tech.id,
            scheduledDate: day,
            estimatedHours: event.estimatedHours,
            postalCode: event.postalCode,
            isHardDeadline: event.isHardDeadline,
          })
          assigned = true
          break
        }
      }
    }

    if (!assigned) {
      unplannable.push({
        event,
        reason: `Kein freier Slot in Monat ${month}/${year} für "${event.serviceType}"`,
      })
    }
  }

  return { entries, unplannable }
}

// ─── Layer 4: Validierung ─────────────────────────────────────────────────────

/**
 * Validiert einen deterministisch generierten Plan.
 *
 * Prüft:
 * - Kapazitätsüberschreitungen (> 8h/Techniker/Tag)
 * - 20%-Puffer-Wochen-Quote (mind. 1 von 5 Wochen ≤ 80% ausgelastet)
 */
export function validatePlan(entries: PlanEntry[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Group by technician + date
  const techDayMap = new Map<string, { totalHours: number; leaseIds: string[] }>()
  for (const entry of entries) {
    const key = `${entry.technicianId}__${toISODateString(entry.scheduledDate)}`
    if (!techDayMap.has(key)) {
      techDayMap.set(key, { totalHours: 0, leaseIds: [] })
    }
    const slot = techDayMap.get(key)!
    slot.totalHours += entry.estimatedHours
    slot.leaseIds.push(entry.leaseId)
  }

  // Capacity violations
  for (const [key, slot] of techDayMap.entries()) {
    if (slot.totalHours > 8) {
      const [techId, date] = key.split("__")
      errors.push({
        type: "capacity_exceeded",
        leaseId: slot.leaseIds[0],
        message:
          `Techniker ${techId} am ${date}: ${slot.totalHours}h geplant (max 8h). ` +
          `Betroffene Leistungen: ${slot.leaseIds.join(", ")}`,
      })
    }
  }

  // 20% buffer weeks check
  const techWeekHours = new Map<string, number>()
  for (const entry of entries) {
    const week = getISOWeek(entry.scheduledDate)
    const key = `${entry.technicianId}__${entry.scheduledDate.getFullYear()}-W${String(week).padStart(2, "0")}`
    techWeekHours.set(key, (techWeekHours.get(key) ?? 0) + entry.estimatedHours)
  }

  const techWeekStats = new Map<string, { total: number; overloaded: number }>()
  for (const [key, hours] of techWeekHours.entries()) {
    const [techId] = key.split("__")
    if (!techWeekStats.has(techId)) techWeekStats.set(techId, { total: 0, overloaded: 0 })
    const stats = techWeekStats.get(techId)!
    stats.total++
    // 5 days × 8h × 80% = 32h threshold
    if (hours > 32) stats.overloaded++
  }

  for (const [techId, stats] of techWeekStats.entries()) {
    if (stats.total >= 5) {
      const bufferRatio = (stats.total - stats.overloaded) / stats.total
      if (bufferRatio < 0.2) {
        warnings.push({
          type: "buffer_violation",
          message:
            `Techniker ${techId}: Nur ${Math.round(bufferRatio * 100)}% Puffer-Wochen ` +
            `(mind. 20% empfohlen — 1 von 5 Wochen max. 80% ausgelastet).`,
        })
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ─── Layer 5: KPI-Reporting ───────────────────────────────────────────────────

/**
 * Erstellt einen KPI-Bericht über einen generierten Jahresplan.
 */
export function generateReport(
  entries: PlanEntry[],
  technicians: TechnicianInput[],
  year: number,
  unplannableEvents: Array<{ leaseId: string; reason: string }>
): PlanReport {
  // Total maintenances per technician
  const totalByTech: Record<string, { count: number; hours: number }> = {}
  for (const entry of entries) {
    if (!totalByTech[entry.technicianId]) {
      totalByTech[entry.technicianId] = { count: 0, hours: 0 }
    }
    totalByTech[entry.technicianId].count++
    totalByTech[entry.technicianId].hours += entry.estimatedHours
  }

  // Monthly utilization per technician
  const monthlyUtilization: PlanReport["monthlyUtilization"] = []
  for (let month = 1; month <= 12; month++) {
    const workingDays = getWorkingDaysOfMonth(year, month)
    const availableHours = workingDays.length * 8
    for (const tech of technicians) {
      const plannedHours = entries
        .filter(
          (e) =>
            e.technicianId === tech.id &&
            e.scheduledDate.getMonth() + 1 === month &&
            e.scheduledDate.getFullYear() === year
        )
        .reduce((sum, e) => sum + e.estimatedHours, 0)
      monthlyUtilization.push({
        month,
        technicianId: tech.id,
        plannedHours,
        availableHours,
        utilizationPercent: availableHours > 0 ? (plannedHours / availableHours) * 100 : 0,
      })
    }
  }

  // Buffer weeks (≤ 32h/week per technician)
  const techWeekHours = new Map<string, number>()
  for (const entry of entries) {
    const week = getISOWeek(entry.scheduledDate)
    const key = `${entry.technicianId}__${entry.scheduledDate.getFullYear()}-W${String(week).padStart(2, "0")}`
    techWeekHours.set(key, (techWeekHours.get(key) ?? 0) + entry.estimatedHours)
  }
  let bufferWeeks = 0
  for (const hours of techWeekHours.values()) {
    if (hours <= 32) bufferWeeks++
  }

  const totalHours = entries.reduce((sum, e) => sum + e.estimatedHours, 0)
  const allWorkingDays = Array.from({ length: 12 }, (_, i) =>
    getWorkingDaysOfMonth(year, i + 1)
  ).flat()
  const avgHoursPerDay = allWorkingDays.length > 0 ? totalHours / allWorkingDays.length : 0

  return {
    totalMaintenancesByTechnician: totalByTech,
    monthlyUtilization,
    unplannableEvents,
    kpis: {
      totalHours,
      avgHoursPerDay,
      bufferWeeks,
      totalEntries: entries.length,
    },
  }
}
