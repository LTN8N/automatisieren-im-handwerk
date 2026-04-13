"use client";

import { useState, useMemo } from "react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { AnnualPlan, PlanEntry, Technician, ANLAGENTYP_COLORS, MONTH_NAMES } from "./types";
import { WartungsKalender } from "./wartungs-kalender";
import { PlanStatusBanner } from "./plan-status-banner";
import { PlanKpiBox } from "./plan-kpi-box";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";

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

// ─── Mobile: Monatsliste mit aufklappbaren Karten ─────────────────────────────

interface MobileMonatsListeProps {
  entries: PlanEntry[];
  year: number;
}

function MobileMonatsListe({ entries, year }: MobileMonatsListeProps) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const entriesByMonth = useMemo(() => {
    const map: Record<number, PlanEntry[]> = {};
    for (let m = 0; m < 12; m++) map[m] = [];
    for (const e of entries) {
      const d = new Date(e.scheduledDate);
      if (d.getFullYear() === year) {
        map[d.getMonth()].push(e);
      }
    }
    return map;
  }, [entries, year]);

  return (
    <div className="space-y-2">
      {Array.from({ length: 12 }, (_, month) => {
        const monthEntries = entriesByMonth[month] ?? [];
        const isExpanded = expandedMonth === month;
        const conflictCount = monthEntries.filter(
          (e) => e.conflictStatus === "KONFLIKT" || e.conflictStatus === "WARNUNG"
        ).length;

        return (
          <div
            key={month}
            className="rounded-2xl border bg-card shadow-sm overflow-hidden"
          >
            {/* Monatskopf – immer sichtbar */}
            <button
              onClick={() => setExpandedMonth(isExpanded ? null : month)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/40 min-h-[56px]"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm w-8">{MONTH_NAMES[month]}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {monthEntries.length} Wartung{monthEntries.length !== 1 ? "en" : ""}
                </span>
                {conflictCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                    <AlertTriangle className="h-3 w-3" />
                    {conflictCount}
                  </span>
                )}
              </div>
              {monthEntries.length > 0 && (
                isExpanded
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Aufgeklappte Einträge */}
            {isExpanded && monthEntries.length > 0 && (
              <div className="divide-y border-t">
                {monthEntries.map((entry) => {
                  const serviceType = entry.lease?.serviceType ?? "DEFAULT";
                  const color = ANLAGENTYP_COLORS[serviceType] ?? ANLAGENTYP_COLORS.DEFAULT;
                  const date = new Date(entry.scheduledDate);

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      {/* Datum */}
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-muted text-center">
                        <span className="text-[10px] text-muted-foreground leading-none">
                          {MONTH_NAMES[date.getMonth()]}
                        </span>
                        <span className="text-sm font-bold leading-tight">
                          {date.getDate()}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {entry.lease?.contract?.object?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.technician?.name ?? "—"} · {entry.estimatedHours}h
                        </p>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${color.bg} ${color.text} ${color.border}`}
                        >
                          {serviceType}
                        </span>
                        {entry.conflictStatus === "KONFLIKT" && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
                            Konflikt
                          </span>
                        )}
                        {entry.conflictStatus === "WARNUNG" && (
                          <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800">
                            Warnung
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function JahresplanDetail({ plan, technicians }: JahresplanDetailProps) {
  const router = useLocaleRouter();

  const [entries, setEntries] = useState<PlanEntry[]>(plan.entries);
  const [planStatus, setPlanStatus] = useState(plan.status);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [selectedAnlagentypen, setSelectedAnlagentypen] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  const conflictEntries = useMemo(
    () => entries.filter((e) => e.conflictStatus === "KONFLIKT" || e.conflictStatus === "WARNUNG"),
    [entries]
  );

  // Gefilterte Einträge für mobile Ansicht
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedTechnicianIds.length > 0 && !selectedTechnicianIds.includes(e.technicianId)) {
        return false;
      }
      if (selectedAnlagentypen.length > 0 && !selectedAnlagentypen.includes(e.lease?.serviceType ?? "")) {
        return false;
      }
      return true;
    });
  }, [entries, selectedTechnicianIds, selectedAnlagentypen]);

  const activeFilterCount = selectedTechnicianIds.length + selectedAnlagentypen.length;

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

      {/* ── MOBILE-ANSICHT (< md) ─────────────────────────────────────────── */}
      <div className="md:hidden space-y-4">
        {/* Filter-Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="rounded-xl min-h-[44px] flex-1 sm:flex-none"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-2 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTechnicianIds([]);
                setSelectedAnlagentypen([]);
              }}
              className="rounded-xl min-h-[44px]"
            >
              <X className="mr-1.5 h-4 w-4" />
              Zurücksetzen
            </Button>
          )}
        </div>

        {/* Mobile Filter-Panel */}
        {mobileFiltersOpen && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
            {/* Techniker */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Techniker</h3>
              <div className="flex flex-wrap gap-2">
                {technicians.map((tech) => (
                  <button
                    key={tech.id}
                    onClick={() => toggleTechnician(tech.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                      selectedTechnicianIds.includes(tech.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tech.name}
                  </button>
                ))}
                {technicians.length === 0 && (
                  <p className="text-xs text-muted-foreground">Keine Techniker vorhanden.</p>
                )}
              </div>
            </div>

            {/* Anlagentypen */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Anlagentyp</h3>
              <div className="flex flex-wrap gap-2">
                {ANLAGENTYPEN.map((at) => {
                  const color = ANLAGENTYP_COLORS[at.value];
                  const active = selectedAnlagentypen.includes(at.value);
                  return (
                    <button
                      key={at.value}
                      onClick={() => toggleAnlagentyp(at.value)}
                      className={`rounded px-3 py-1.5 text-xs font-medium border transition-all min-h-[36px] ${
                        active
                          ? `${color.bg} ${color.text} ${color.border} opacity-100`
                          : `bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30`
                      }`}
                    >
                      {at.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Konflikte-Hinweis auf Mobile */}
        {conflictEntries.length > 0 && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 shadow-sm">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-yellow-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {conflictEntries.length} Konflikt{conflictEntries.length !== 1 ? "e" : ""} vorhanden
            </p>
          </div>
        )}

        {/* Mobile Monatsliste */}
        <MobileMonatsListe entries={filteredEntries} year={plan.year} />
      </div>

      {/* ── DESKTOP-ANSICHT (≥ md) ────────────────────────────────────────── */}
      <div className="hidden md:flex gap-4">
        {/* Kalender (links) */}
        <div className="min-w-0 flex-1">
          <WartungsKalender
            planId={plan.id}
            entries={entries}
            year={plan.year}
            isReadOnly={isReadOnly}
            selectedTechnicianIds={selectedTechnicianIds}
            selectedAnlagentypen={selectedAnlagentypen}
            technicians={technicians}
            onEntriesChange={setEntries}
          />
        </div>

        {/* Sidebar (rechts) */}
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

          {/* Konflikte */}
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
