"use client";

import { PlanEntry, Technician } from "./types";

interface PlanKpiBoxProps {
  entries: PlanEntry[];
  technicians: Technician[];
  year: number;
}

export function PlanKpiBox({ entries, technicians, year }: PlanKpiBoxProps) {
  const totalEntries = entries.length;
  const conflicts = entries.filter((e) => e.conflictStatus === "KONFLIKT").length;
  const warnings = entries.filter((e) => e.conflictStatus === "WARNUNG").length;

  return (
    <div className="space-y-4">
      {/* Gesamt KPIs */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Jahresübersicht {year}</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalEntries}</div>
            <div className="text-xs text-muted-foreground">Wartungen</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{warnings}</div>
            <div className="text-xs text-muted-foreground">Warnungen</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{conflicts}</div>
            <div className="text-xs text-muted-foreground">Konflikte</div>
          </div>
        </div>
      </div>

      {/* Auslastung pro Techniker */}
      {technicians.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Auslastung Techniker</h3>
          <div className="space-y-3">
            {technicians.map((tech) => {
              const techEntries = entries.filter((e) => e.technicianId === tech.id);
              const totalHours = techEntries.reduce((s, e) => s + e.estimatedHours, 0);
              // ~230 Arbeitstage/Jahr × maxDailyHours
              const maxHours = (tech.maxDailyHours ?? 8) * 230;
              const pct = Math.min(100, Math.round((totalHours / maxHours) * 100));

              return (
                <div key={tech.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{tech.name}</span>
                    <span className="text-muted-foreground">{Math.round(totalHours)}h</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 90
                          ? "bg-red-500"
                          : pct > 75
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-right text-xs text-muted-foreground">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
