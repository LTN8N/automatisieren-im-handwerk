"use client";

import { useState, useMemo } from "react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { AnnualPlan, PlanEntry, Technician, ANLAGENTYP_COLORS } from "./types";
import { WartungsKalender } from "./wartungs-kalender";
import { PlanStatusBanner } from "./plan-status-banner";
import { PlanKpiBox } from "./plan-kpi-box";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const ANLAGENTYPEN = [
  { value: "HEIZUNG", label: "Heizung" },
  { value: "KLIMA", label: "Klima" },
  { value: "ELEKTRO", label: "Elektro" },
  { value: "BRANDSCHUTZ", label: "Brandschutz" },
  { value: "SANITAER", label: "Sanitär" },
];

interface JahresplanDetailProps {
  plan: AnnualPlan;
  technicians: Technician[];
}

export function JahresplanDetail({ plan, technicians }: JahresplanDetailProps) {
  const router = useLocaleRouter();

  const [entries, setEntries] = useState<PlanEntry[]>(plan.entries);
  const [planStatus, setPlanStatus] = useState(plan.status);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [selectedAnlagentypen, setSelectedAnlagentypen] = useState<string[]>([]);

  const isReadOnly = planStatus !== "DRAFT";

  function toggleTechnician(id: string) {
    setSelectedTechnicianIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleAnlagentyp(value: string) {
    setSelectedAnlagentypen((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  }

  // Nicht-planbare Einträge (Konflikte im aktuellen Zustand)
  const conflictEntries = useMemo(
    () => entries.filter((e) => e.conflictStatus === "KONFLIKT" || e.conflictStatus === "WARNUNG"),
    [entries]
  );

  return (
    <div className="space-y-4">
      {/* Zurück-Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/dashboard/wartung")}
        className="-ml-2 rounded-xl"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Zurück
      </Button>

      {/* Plan-Status-Banner */}
      <PlanStatusBanner
        planId={plan.id}
        status={planStatus}
        year={plan.year}
        onStatusChange={setPlanStatus}
      />

      {/* Hauptlayout: Kalender + Sidebar */}
      <div className="flex gap-4">
        {/* Kalender (links, scrollbar) */}
        <div className="min-w-0 flex-1">
          <WartungsKalender
            planId={plan.id}
            entries={entries}
            year={plan.year}
            isReadOnly={isReadOnly}
            selectedTechnicianIds={selectedTechnicianIds}
            selectedAnlagentypen={selectedAnlagentypen}
            onEntriesChange={setEntries}
          />
        </div>

        {/* Sidebar (rechts, fixe Breite) */}
        <aside className="w-64 shrink-0 space-y-4">
          {/* Techniker-Filter */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Techniker</h3>
            <div className="space-y-2">
              {technicians.map((tech) => (
                <label key={tech.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-input accent-primary"
                    checked={selectedTechnicianIds.includes(tech.id)}
                    onChange={() => toggleTechnician(tech.id)}
                  />
                  <span className="text-sm">{tech.name}</span>
                </label>
              ))}
              {technicians.length === 0 && (
                <p className="text-xs text-muted-foreground">Keine Techniker vorhanden.</p>
              )}
            </div>
          </div>

          {/* Anlagentyp-Filter */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Anlagentyp</h3>
            <div className="space-y-2">
              {ANLAGENTYPEN.map((at) => {
                const color = ANLAGENTYP_COLORS[at.value];
                return (
                  <label key={at.value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-input accent-primary"
                      checked={selectedAnlagentypen.includes(at.value)}
                      onChange={() => toggleAnlagentyp(at.value)}
                    />
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}
                    >
                      {at.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Nicht-planbare Events (Warnungen/Konflikte) */}
          {conflictEntries.length > 0 && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                Konflikte ({conflictEntries.length})
              </h3>
              <div className="space-y-2">
                {conflictEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-white p-2 text-xs shadow-sm">
                    <div className="font-medium text-yellow-900">
                      {entry.lease?.contract?.object?.name ?? "—"}
                    </div>
                    <div className="mt-0.5 text-yellow-700">
                      {new Date(entry.scheduledDate).toLocaleDateString("de-DE")} —{" "}
                      {entry.conflictDetails ?? entry.conflictStatus}
                    </div>
                  </div>
                ))}
                {conflictEntries.length > 5 && (
                  <p className="text-xs text-yellow-700">+{conflictEntries.length - 5} weitere</p>
                )}
              </div>
            </div>
          )}

          {/* KPI-Box */}
          <PlanKpiBox entries={entries} technicians={technicians} year={plan.year} />
        </aside>
      </div>
    </div>
  );
}
