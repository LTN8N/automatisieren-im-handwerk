/**
 * KI-Voice-Architect: Layer 3 — AI-Optimizer
 *
 * Claude API Call + Retry-Logik + Batching
 * Modell: claude-sonnet-4-6 (Qualität), Fallback: claude-haiku-4-5-20251001
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  PLANNING_OPTIMIZER_SYSTEM_PROMPT,
  formatInput,
  buildRetryPrompt,
  type PlanningOptimizerInput,
  type PlanningOptimizerOutput,
} from "./prompts/planning-optimizer";

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

const MAX_EVENTS_PER_BATCH = 50;
const MAX_RETRIES = 3;
const MODEL_PRIMARY = "claude-sonnet-4-6";
const MODEL_FALLBACK = "claude-haiku-4-5-20251001";

// ---------------------------------------------------------------------------
// Interner Claude-Call
// ---------------------------------------------------------------------------

async function callClaude(
  client: Anthropic,
  userContent: string,
  model: string
): Promise<PlanningOptimizerOutput> {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: PLANNING_OPTIMIZER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude hat keinen Text geliefert.");
  }

  const raw = textBlock.text.trim();

  // JSON-Extraktion: manchmal umgibt Claude den Block mit ```json...```
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Claude-Antwort ist kein gültiges JSON: ${jsonStr.slice(0, 200)}`);
  }

  return parsed as PlanningOptimizerOutput;
}

// ---------------------------------------------------------------------------
// Retry-Logik für einen einzelnen Batch
// ---------------------------------------------------------------------------

type ValidationFn = (output: PlanningOptimizerOutput) => string[];

async function optimizeBatchWithRetry(
  client: Anthropic,
  input: PlanningOptimizerInput,
  validate: ValidationFn,
  model: string
): Promise<PlanningOptimizerOutput> {
  let lastOutput: PlanningOptimizerOutput | null = null;
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const userContent =
      attempt === 0
        ? formatInput(input)
        : buildRetryPrompt(input, lastErrors, attempt);

    let output: PlanningOptimizerOutput;
    try {
      output = await callClaude(client, userContent, model);
    } catch (err) {
      // Bei Parse-Fehler mit Fallback-Modell nochmal versuchen
      if (model === MODEL_PRIMARY) {
        output = await callClaude(client, userContent, MODEL_FALLBACK);
      } else {
        throw err;
      }
    }

    lastOutput = output;
    lastErrors = validate(output);

    if (lastErrors.length === 0) {
      return output;
    }
  }

  // Nach MAX_RETRIES: nicht planbare Events als critical markieren
  const unplannedEvents = lastErrors
    .map((e) => e.match(/eventId[:\s]+(\S+)/i)?.[1])
    .filter((id): id is string => !!id);

  const criticalWarnings: PlanningOptimizerOutput["warnings"] = unplannedEvents.map((id) => ({
    eventId: id,
    message: `Nach ${MAX_RETRIES} Versuchen nicht planbar: ${lastErrors.filter((e) => e.includes(id)).join("; ")}`,
    severity: "critical",
  }));

  // Assignments für nicht planbare Events entfernen
  const cleanAssignments = (lastOutput?.assignments ?? []).filter(
    (a) => !unplannedEvents.includes(a.eventId)
  );

  return {
    assignments: cleanAssignments,
    warnings: [...(lastOutput?.warnings ?? []), ...criticalWarnings],
    kpis: {
      plannedEvents: cleanAssignments.length,
      unplannedEvents: unplannedEvents.length,
      avgDailyLoad: lastOutput?.kpis?.avgDailyLoad ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Merge zweier Batches zu einem Output
// ---------------------------------------------------------------------------

function mergeOutputs(
  a: PlanningOptimizerOutput,
  b: PlanningOptimizerOutput
): PlanningOptimizerOutput {
  const assignments = [...a.assignments, ...b.assignments];
  const warnings = [...a.warnings, ...b.warnings];
  const plannedEvents = assignments.length;
  const unplannedEvents = a.kpis.unplannedEvents + b.kpis.unplannedEvents;

  // Durchschnittliche Tagesauslastung als Mittelwert beider Batches
  const avgDailyLoad =
    (a.kpis.avgDailyLoad + b.kpis.avgDailyLoad) / 2;

  return {
    assignments,
    warnings,
    kpis: { plannedEvents, unplannedEvents, avgDailyLoad },
  };
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

export interface OptimizeOptions {
  /** Validierungsfunktion von Layer 4 — gibt Fehlerliste zurück (leer = OK) */
  validate?: ValidationFn;
  /** Optionaler API-Key (Standard: ANTHROPIC_API_KEY aus Umgebung) */
  apiKey?: string;
}

/**
 * Optimiert den Wartungsplan für einen Monat via Claude.
 *
 * - Batching: > 50 Events → 2 Batches (erste/zweite Monatshälfte)
 * - Retry: bis zu 3 Versuche pro Batch bei Validierungsfehlern
 * - Fallback: claude-haiku-4-5-20251001 bei Parse-Fehlern
 */
export async function optimizeWartungsplan(
  input: PlanningOptimizerInput,
  options: OptimizeOptions = {}
): Promise<PlanningOptimizerOutput> {
  const { validate = () => [], apiKey } = options;

  const client = new Anthropic({ apiKey });

  if (input.events.length <= MAX_EVENTS_PER_BATCH) {
    return optimizeBatchWithRetry(client, input, validate, MODEL_PRIMARY);
  }

  // Batching: erste/zweite Monatshälfte
  const firstHalf = input.events.filter((e) => {
    const day = e.deadlineDate ? parseInt(e.deadlineDate.slice(8, 10), 10) : 15;
    return day <= 15;
  });
  const secondHalf = input.events.filter((e) => {
    const day = e.deadlineDate ? parseInt(e.deadlineDate.slice(8, 10), 10) : 16;
    return day > 15;
  });

  // Sicherstellen dass jedes Event in genau einem Batch landet
  const firstHalfIds = new Set(firstHalf.map((e) => e.id));
  const secondHalfSafe = input.events.filter((e) => !firstHalfIds.has(e.id));

  const batchA: PlanningOptimizerInput = { ...input, events: firstHalf };
  const batchB: PlanningOptimizerInput = { ...input, events: secondHalfSafe };

  const [outputA, outputB] = await Promise.all([
    optimizeBatchWithRetry(client, batchA, validate, MODEL_PRIMARY),
    optimizeBatchWithRetry(client, batchB, validate, MODEL_PRIMARY),
  ]);

  return mergeOutputs(outputA, outputB);
}
