/**
 * KI-Voice-Architect: Layer 3 — Wartungsplan-Optimierung
 *
 * System-Prompt + Input-Formatter für Claude (claude-sonnet-4-6)
 * Constraint-Prioritäten: HART-1 bis WEICH-4 (laut AUT-33 Plan 2.2)
 * Sprache: Deutsch, Handwerker-verständlich
 */

// ---------------------------------------------------------------------------
// Input / Output Schemas
// ---------------------------------------------------------------------------

export interface PlanningOptimizerInput {
  month: number; // 1–12
  year: number;
  events: Array<{
    id: string;
    serviceType: string;
    objectPostalCode: string;
    estimatedHours: number;
    isHardDeadline: boolean;
    deadlineDate?: string; // YYYY-MM-DD
    seasonalPreference?: string;
    qualificationRequired?: string;
  }>;
  technicians: Array<{
    id: string;
    name: string;
    qualifications: string[];
    availableSlots: Array<{ date: string; remainingHours: number }>;
  }>;
  clusters: Record<string, string[]>; // PLZ-Prefix → [objectIds]
}

export interface PlanningOptimizerOutput {
  assignments: Array<{
    eventId: string;
    technicianId: string;
    scheduledDate: string; // YYYY-MM-DD
    cluster: string; // PLZ-Gruppe
    begruendung: string;
    konfidenz: number; // 0.0 – 1.0
  }>;
  warnings: Array<{
    eventId: string;
    message: string;
    severity: "info" | "warning" | "critical";
  }>;
  kpis: {
    plannedEvents: number;
    unplannedEvents: number;
    avgDailyLoad: number;
  };
}

// ---------------------------------------------------------------------------
// System-Prompt
// ---------------------------------------------------------------------------

export const PLANNING_OPTIMIZER_SYSTEM_PROMPT = `Du bist ein erfahrener Wartungsleiter mit 20 Jahren Erfahrung im Facility Management.
Deine Aufgabe: Plane die Wartungsevents für einen bestimmten Monat optimal.

## Constraint-Prioritäten (bindend — höhere Nummer = weicher)

[HART-1] Gesetzliche Prüffristen (BetrSichV, DGUV, TrinkwV usw.) — deadlineDate NIEMALS überschreiten.
[HART-2] Techniker-Qualifikation muss passen (z. B. Gas-Konzession, DGUV V3).
[HART-3] Techniker darf nur in verfügbaren Slots eingesetzt werden.
[HART-4] Gebäude-Sperrzeiten einhalten (keine Buchung außerhalb der Slots).
[WEICH-1] Saisonale Präferenzen bevorzugen, wenn möglich.
[WEICH-2] Geografisches Clustering: Techniker pro Tag nur in einer PLZ-Zone.
[WEICH-3] Auslastung gleichmäßig verteilen — kein Techniker dauerhaft überbucht.
[WEICH-4] Mehrere Events desselben Kunden als Block planen.

## Planungsregeln

- Events mit isHardDeadline=true immer zuerst verplanen.
- Tagesauslastung: max. 8 Stunden (inkl. ~1 h Fahrzeit pro Cluster-Wechsel).
- Qualifikations-Prüfung: qualificationRequired muss in technicians.qualifications enthalten sein.
- Kann ein Event nicht geplant werden: in warnings mit severity "critical" melden.
- Konfidenz-Score: 1.0 = alle Constraints erfüllt, 0.8–0.99 = Weich-Constraint verletzt, < 0.8 = Risiko.

## Output-Format

Antworte NUR mit validem JSON — kein Text davor oder danach.
Exaktes Schema:

{
  "assignments": [
    {
      "eventId": "string",
      "technicianId": "string",
      "scheduledDate": "YYYY-MM-DD",
      "cluster": "PLZ-Prefix",
      "begruendung": "Kurze Begründung auf Deutsch",
      "konfidenz": 0.95
    }
  ],
  "warnings": [
    {
      "eventId": "string",
      "message": "Was nicht geklappt hat",
      "severity": "info | warning | critical"
    }
  ],
  "kpis": {
    "plannedEvents": 10,
    "unplannedEvents": 0,
    "avgDailyLoad": 6.5
  }
}`;

// ---------------------------------------------------------------------------
// formatInput — kompaktes JSON für den User-Turn
// ---------------------------------------------------------------------------

const MONAT_NAMEN = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function formatInput(input: PlanningOptimizerInput): string {
  const monatName = MONAT_NAMEN[input.month - 1] ?? `Monat ${input.month}`;

  // Harte Fristen zuerst sortieren
  const sortiertEvents = [...input.events].sort((a, b) => {
    if (a.isHardDeadline && !b.isHardDeadline) return -1;
    if (!a.isHardDeadline && b.isHardDeadline) return 1;
    if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
    return 0;
  });

  return JSON.stringify({
    planungsmonat: `${monatName} ${input.year}`,
    events: sortiertEvents,
    techniker: input.technicians,
    cluster: input.clusters,
  });
}

// ---------------------------------------------------------------------------
// buildRetryPrompt — fügt Fehler-Kontext für Retry-Runden hinzu
// ---------------------------------------------------------------------------

export function buildRetryPrompt(
  input: PlanningOptimizerInput,
  validationErrors: string[],
  retryRound: number
): string {
  return JSON.stringify({
    planungsmonat: `${MONAT_NAMEN[input.month - 1]} ${input.year}`,
    retryRunde: retryRound,
    validierungsfehler: validationErrors,
    anweisung:
      "Korrigiere die folgenden Validierungsfehler aus dem letzten Plan. Halte alle anderen Assignments bei.",
    events: [...input.events].sort((a, b) => {
      if (a.isHardDeadline && !b.isHardDeadline) return -1;
      if (!a.isHardDeadline && b.isHardDeadline) return 1;
      return 0;
    }),
    techniker: input.technicians,
    cluster: input.clusters,
  });
}
