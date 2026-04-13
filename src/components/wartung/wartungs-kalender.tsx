"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ConflictDialog } from "./conflict-dialog";
import { EntryDetailModal } from "./entry-detail-modal";
import { ANLAGENTYP_COLORS, MONTH_NAMES, PlanEntry, Technician, ConflictStatus } from "./types";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface WartungsKalenderProps {
  planId: string;
  entries: PlanEntry[];
  year: number;
  isReadOnly: boolean;
  selectedTechnicianIds: string[];
  selectedAnlagentypen: string[];
  technicians: Technician[];
  onEntriesChange: (entries: PlanEntry[]) => void;
}

// ─── Kalender-Hilfsfunktionen ────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getServiceType(entry: PlanEntry): string {
  return entry.lease?.serviceType ?? "DEFAULT";
}

// ─── Einzelner Wartungs-Chip ─────────────────────────────────────────────────

interface EntryChipProps {
  entry: PlanEntry;
  isReadOnly: boolean;
  dragOverStatus: ConflictStatus | null;
  onEntryClick?: (entry: PlanEntry) => void;
}

function EntryChip({ entry, isReadOnly, dragOverStatus, onEntryClick }: EntryChipProps) {
  const serviceType = getServiceType(entry);
  const color = ANLAGENTYP_COLORS[serviceType] ?? ANLAGENTYP_COLORS.DEFAULT;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: entry.id,
    disabled: isReadOnly,
    data: { entry },
  });

  const conflictColor = dragOverStatus
    ? dragOverStatus === "OK"
      ? "border-green-500 bg-green-50"
      : dragOverStatus === "WARNUNG"
      ? "border-yellow-500 bg-yellow-50"
      : "border-red-500 bg-red-50"
    : entry.conflictStatus === "KONFLIKT"
    ? "border-red-400"
    : entry.conflictStatus === "WARNUNG"
    ? "border-yellow-400"
    : "";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group relative mb-0.5 cursor-grab rounded px-1.5 py-0.5 text-xs border transition-all
        ${color.bg} ${color.text} ${color.border} ${conflictColor}
        ${isDragging ? "opacity-30" : "opacity-100"}
        ${isReadOnly ? "cursor-default" : "hover:opacity-90 active:cursor-grabbing"}
      `}
      title={`${entry.lease?.contract?.object?.name ?? ""} — ${entry.estimatedHours}h\n${entry.technician?.name ?? ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onEntryClick?.(entry);
      }}
    >
      <span className="truncate block max-w-[80px]">
        {entry.lease?.contract?.object?.postalCode ?? "—"} {entry.lease?.contract?.object?.name?.slice(0, 8) ?? ""}
      </span>
      {entry.conflictStatus === "KONFLIKT" && !dragOverStatus && (
        <AlertCircle className="absolute -right-1 -top-1 h-3 w-3 text-red-500" />
      )}
      {entry.conflictStatus === "WARNUNG" && !dragOverStatus && (
        <AlertTriangle className="absolute -right-1 -top-1 h-3 w-3 text-yellow-500" />
      )}
    </div>
  );
}

// ─── Tages-Zelle (Droppable) ─────────────────────────────────────────────────

interface DayCellProps {
  date: Date;
  entries: PlanEntry[];
  isReadOnly: boolean;
  dragOverStatus: ConflictStatus | null;
  draggedEntryId: string | null;
  onEntryClick?: (entry: PlanEntry) => void;
}

function DayCell({ date, entries, isReadOnly, dragOverStatus, draggedEntryId, onEntryClick }: DayCellProps) {
  const dateStr = toDateString(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateStr}`,
    disabled: isReadOnly,
    data: { date: dateStr },
  });

  const dropHighlight = isOver
    ? dragOverStatus === "OK"
      ? "bg-green-50 ring-2 ring-green-400"
      : dragOverStatus === "WARNUNG"
      ? "bg-yellow-50 ring-2 ring-yellow-400"
      : dragOverStatus === "KONFLIKT"
      ? "bg-red-50 ring-2 ring-red-400"
      : "bg-muted/50 ring-2 ring-ring"
    : "";

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[52px] min-w-[90px] border-r border-b p-1 transition-colors
        ${isWeekend ? "bg-muted/30" : "bg-background"}
        ${dropHighlight}
      `}
    >
      <div className={`mb-0.5 text-[10px] font-medium ${isWeekend ? "text-muted-foreground" : ""}`}>
        {date.getDate()}
      </div>
      {entries.map((entry) => (
        <EntryChip
          key={entry.id}
          entry={entry}
          isReadOnly={isReadOnly}
          dragOverStatus={draggedEntryId === entry.id && isOver ? dragOverStatus : null}
          onEntryClick={onEntryClick}
        />
      ))}
    </div>
  );
}

// ─── Kalender-Monats-Spalte ──────────────────────────────────────────────────

interface MonthColumnProps {
  year: number;
  month: number;
  entries: PlanEntry[];
  isReadOnly: boolean;
  dragOverStatus: ConflictStatus | null;
  draggedEntryId: string | null;
  dragOverDate: string | null;
  onEntryClick?: (entry: PlanEntry) => void;
}

function MonthColumn({
  year,
  month,
  entries,
  isReadOnly,
  dragOverStatus,
  draggedEntryId,
  dragOverDate,
  onEntryClick,
}: MonthColumnProps) {
  const days = getDaysInMonth(year, month);

  const entriesByDay = useMemo(() => {
    const map: Record<string, PlanEntry[]> = {};
    for (const day of days) {
      const ds = toDateString(day);
      map[ds] = entries.filter((e) => {
        const ed = new Date(e.scheduledDate);
        return toDateString(ed) === ds;
      });
    }
    return map;
  }, [entries, days]);

  return (
    <div className="shrink-0">
      <div className="sticky top-0 z-10 border-b border-r bg-card px-2 py-1.5 text-xs font-semibold text-muted-foreground">
        {MONTH_NAMES[month]}
      </div>
      <div>
        {days.map((day) => {
          const ds = toDateString(day);
          return (
            <DayCell
              key={ds}
              date={day}
              entries={entriesByDay[ds] ?? []}
              isReadOnly={isReadOnly}
              dragOverStatus={dragOverDate === ds ? dragOverStatus : null}
              draggedEntryId={draggedEntryId}
              onEntryClick={onEntryClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Drag Overlay Chip ────────────────────────────────────────────────────────

function DragChip({ entry }: { entry: PlanEntry }) {
  const serviceType = getServiceType(entry);
  const color = ANLAGENTYP_COLORS[serviceType] ?? ANLAGENTYP_COLORS.DEFAULT;
  return (
    <div
      className={`rounded px-2 py-1 text-xs font-medium shadow-lg border
        ${color.bg} ${color.text} ${color.border} opacity-90`}
    >
      {entry.lease?.contract?.object?.postalCode ?? "—"}{" "}
      {entry.lease?.contract?.object?.name?.slice(0, 12) ?? ""}
    </div>
  );
}

// ─── Haupt-Kalender-Komponente ───────────────────────────────────────────────

export function WartungsKalender({
  planId,
  entries,
  year,
  isReadOnly,
  selectedTechnicianIds,
  selectedAnlagentypen,
  technicians,
  onEntriesChange,
}: WartungsKalenderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [draggedEntry, setDraggedEntry] = useState<PlanEntry | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ConflictStatus | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    entryId: string;
    newDate: string;
    details: string[];
  } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(null);

  function handleEntryClick(entry: PlanEntry) {
    if (draggedEntry) return; // Don't open modal during drag
    setSelectedEntry(entry);
  }

  function handleEntryUpdate(updated: PlanEntry) {
    onEntriesChange(entries.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleEntryDelete(entryId: string) {
    onEntriesChange(entries.filter((e) => e.id !== entryId));
  }

  // Gefilterte Einträge
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedTechnicianIds.length > 0 && !selectedTechnicianIds.includes(e.technicianId)) {
        return false;
      }
      if (
        selectedAnlagentypen.length > 0 &&
        !selectedAnlagentypen.includes(getServiceType(e))
      ) {
        return false;
      }
      return true;
    });
  }, [entries, selectedTechnicianIds, selectedAnlagentypen]);

  function handleDragStart(event: DragStartEvent) {
    const entry = entries.find((e) => e.id === event.active.id);
    if (entry) setDraggedEntry(entry);
  }

  async function handleDragOver(event: DragOverEvent) {
    if (!event.over) {
      setDragOverDate(null);
      setDragOverStatus(null);
      return;
    }
    const dateStr = event.over.data.current?.date as string | undefined;
    if (!dateStr || !draggedEntry) return;

    setDragOverDate(dateStr);

    // Conflict-Check
    try {
      const res = await fetch(
        `/api/wartung/plans/${planId}/entries/${draggedEntry.id}/check?date=${dateStr}`
      );
      if (res.ok) {
        const data = await res.json();
        setDragOverStatus(data.status as ConflictStatus);
      }
    } catch {
      setDragOverStatus("OK");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggedEntry(null);
    setDragOverDate(null);

    if (!over) {
      setDragOverStatus(null);
      return;
    }

    const entry = entries.find((e) => e.id === active.id);
    const newDate = over.data.current?.date as string | undefined;

    if (!entry || !newDate) {
      setDragOverStatus(null);
      return;
    }

    // Keine Änderung wenn gleiches Datum
    if (toDateString(new Date(entry.scheduledDate)) === newDate) {
      setDragOverStatus(null);
      return;
    }

    if (dragOverStatus === "KONFLIKT") {
      toast.error("Verschieben nicht möglich: Konflikt erkannt.");
      setDragOverStatus(null);
      return;
    }

    if (dragOverStatus === "WARNUNG") {
      // Dialog anzeigen
      setPendingMove({ entryId: entry.id, newDate, details: [] });
      // Nochmal Details laden
      try {
        const res = await fetch(
          `/api/wartung/plans/${planId}/entries/${entry.id}/check?date=${newDate}`
        );
        if (res.ok) {
          const data = await res.json();
          setPendingMove({ entryId: entry.id, newDate, details: data.details ?? [] });
        }
      } catch {
        // ignore
      }
      setDragOverStatus(null);
      return;
    }

    // Status OK — direkt speichern
    await saveEntryMove(entry.id, newDate);
    setDragOverStatus(null);
  }

  async function saveEntryMove(entryId: string, newDate: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    try {
      const res = await fetch(
        `/api/wartung/plans/${planId}/entries/${entryId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledDate: newDate,
            technicianId: entry.technicianId,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      const { entry: updated } = await res.json();
      onEntriesChange(
        entries.map((e) => (e.id === entryId ? { ...e, ...updated, scheduledDate: newDate } : e))
      );
      toast.success("Termin verschoben.");
    } catch {
      toast.error("Netzwerkfehler beim Speichern.");
    }
  }

  async function handleConflictConfirm() {
    if (!pendingMove) return;
    await saveEntryMove(pendingMove.entryId, pendingMove.newDate);
    setPendingMove(null);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        modifiers={[restrictToWindowEdges]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Horizontaler Kalender */}
        <div className="overflow-x-auto rounded-xl border">
          <div className="flex">
            {Array.from({ length: 12 }, (_, i) => i).map((month) => {
              const monthEntries = filteredEntries.filter((e) => {
                const d = new Date(e.scheduledDate);
                return d.getFullYear() === year && d.getMonth() === month;
              });
              return (
                <MonthColumn
                  key={month}
                  year={year}
                  month={month}
                  entries={monthEntries}
                  isReadOnly={isReadOnly}
                  dragOverStatus={dragOverStatus}
                  draggedEntryId={draggedEntry?.id ?? null}
                  dragOverDate={dragOverDate}
                  onEntryClick={handleEntryClick}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {draggedEntry ? <DragChip entry={draggedEntry} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Conflict-Dialog bei WARNUNG */}
      {pendingMove && (
        <ConflictDialog
          details={pendingMove.details}
          onConfirm={handleConflictConfirm}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {/* Entry-Detail-Modal */}
      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          planId={planId}
          technicians={technicians}
          isReadOnly={isReadOnly}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleEntryUpdate}
          onDelete={handleEntryDelete}
        />
      )}
    </>
  );
}
