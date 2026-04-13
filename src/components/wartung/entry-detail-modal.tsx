"use client";

import { useState } from "react";
import { PlanEntry, Technician, ANLAGENTYP_COLORS } from "./types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  X,
  Calendar,
  User,
  Building2,
  Wrench,
  Clock,
  Trash2,
  Save,
  Scale,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface EntryDetailModalProps {
  entry: PlanEntry;
  planId: string;
  technicians: Technician[];
  isReadOnly: boolean;
  onClose: () => void;
  onUpdate: (updated: PlanEntry) => void;
  onDelete: (entryId: string) => void;
}

export function EntryDetailModal({
  entry,
  planId,
  technicians,
  isReadOnly,
  onClose,
  onUpdate,
  onDelete,
}: EntryDetailModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newDate, setNewDate] = useState(entry.scheduledDate.slice(0, 10));
  const [newTechId, setNewTechId] = useState(entry.technicianId);
  const [conflictInfo, setConflictInfo] = useState<{
    status: string;
    details: string[];
  } | null>(null);

  const obj = entry.lease.contract.object;
  const serviceType = entry.lease.serviceType;
  const anlagenKey = Object.keys(ANLAGENTYP_COLORS).find((k) =>
    serviceType.toUpperCase().includes(k)
  ) ?? "DEFAULT";
  const colors = ANLAGENTYP_COLORS[anlagenKey];

  async function checkConflict(date: string, techId: string) {
    if (date === entry.scheduledDate.slice(0, 10) && techId === entry.technicianId) {
      setConflictInfo(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/wartung/plans/${planId}/entries/${entry.id}/check?date=${date}&technicianId=${techId}`
      );
      if (res.ok) {
        const data = await res.json();
        setConflictInfo(data);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/wartung/plans/${planId}/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate: newDate, technicianId: newTechId }),
    });

    if (res.ok) {
      const data = await res.json();
      onUpdate(data.entry);
      toast.success("Termin aktualisiert");
      onClose();
    } else {
      const data = await res.json();
      toast.error(data.error || "Fehler beim Speichern");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Termin wirklich aus dem Plan entfernen?")) return;
    setDeleting(true);
    const res = await fetch(`/api/wartung/plans/${planId}/entries/${entry.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      onDelete(entry.id);
      toast.success("Termin entfernt");
      onClose();
    } else {
      const data = await res.json();
      toast.error(data.error || "Fehler beim Löschen");
    }
    setDeleting(false);
  }

  function handleDateChange(date: string) {
    setNewDate(date);
    checkConflict(date, newTechId);
  }

  function handleTechChange(techId: string) {
    setNewTechId(techId);
    checkConflict(newDate, techId);
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${colors.bg} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Wrench className={`h-5 w-5 ${colors.text}`} />
            <div>
              <h3 className={`font-semibold ${colors.text}`}>{serviceType}</h3>
              <p className="text-xs opacity-75">{obj.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Objekt-Info */}
          <div className="flex items-start gap-3 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{obj.name}</p>
              <p className="text-muted-foreground">{obj.address}, {obj.city}</p>
              <p className="text-muted-foreground font-mono text-xs">PLZ {obj.postalCode}</p>
            </div>
          </div>

          {/* Termin & Techniker */}
          {editMode && !isReadOnly ? (
            <div className="space-y-3 rounded-xl border p-4 bg-muted/30">
              <div className="space-y-1.5">
                <Label htmlFor="entry-date" className="text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Termin
                </Label>
                <input
                  id="entry-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-tech" className="text-xs font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Techniker
                </Label>
                <select
                  id="entry-tech"
                  value={newTechId}
                  onChange={(e) => handleTechChange(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm min-h-[44px]"
                >
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.qualifications.join(", ")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Konfliktprüfung */}
              {conflictInfo && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    conflictInfo.status === "OK"
                      ? "bg-green-50 text-green-800"
                      : conflictInfo.status === "WARNUNG"
                      ? "bg-yellow-50 text-yellow-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  <p className="font-medium">
                    {conflictInfo.status === "OK"
                      ? "Keine Konflikte"
                      : conflictInfo.status === "WARNUNG"
                      ? "Warnung"
                      : "Konflikt"}
                  </p>
                  {conflictInfo.details.map((d, i) => (
                    <p key={i} className="text-xs mt-1">
                      {d}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{formatDate(entry.scheduledDate)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{entry.technician.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({entry.technician.qualifications.join(", ")})
                </span>
              </div>
            </>
          )}

          {/* Geschätzte Dauer */}
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{entry.estimatedHours}h geschätzte Dauer</span>
          </div>

          {/* Status */}
          {entry.conflictStatus && (
            <div className="flex items-center gap-3 text-sm">
              <Scale className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  entry.conflictStatus === "conflict"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {entry.conflictStatus}
              </span>
              {entry.conflictDetails && (
                <span className="text-xs text-muted-foreground">{entry.conflictDetails}</span>
              )}
            </div>
          )}

          {/* KI-Begründung */}
          {entry.aiReasoning && (
            <div className="flex items-start gap-3 text-sm">
              <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground italic">{entry.aiReasoning}</p>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
          {!isReadOnly && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-500 hover:text-red-700 rounded-xl min-h-[44px]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Löschen..." : "Entfernen"}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {editMode && !isReadOnly ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(false);
                    setNewDate(entry.scheduledDate.slice(0, 10));
                    setNewTechId(entry.technicianId);
                    setConflictInfo(null);
                  }}
                  className="rounded-xl min-h-[44px]"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || conflictInfo?.status === "KONFLIKT"}
                  className="rounded-xl min-h-[44px]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Speichern..." : "Speichern"}
                </Button>
              </>
            ) : !isReadOnly ? (
              <Button onClick={() => setEditMode(true)} className="rounded-xl min-h-[44px]">
                Bearbeiten
              </Button>
            ) : (
              <Button variant="outline" onClick={onClose} className="rounded-xl min-h-[44px]">
                Schließen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
