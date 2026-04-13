"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Wrench, Trash2, Building2 } from "lucide-react";

interface Lease {
  id: string;
  serviceType: string;
  intervalMonths: number;
  estimatedHours: number;
  qualificationRequired: string | null;
  seasonalPreference: string | null;
  legalBasis: string | null;
  legalDeadline: string | null;
}

interface ContractObject {
  id: string;
  name: string;
  address: string;
  city: string;
  buildingType: string;
}

interface Contract {
  id: string;
  contractNumber: string | null;
  customerName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  leases: Lease[];
  object: ContractObject;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const INTERVAL_LABELS: Record<number, string> = {
  1: "Monatlich",
  3: "Quartalsweise",
  6: "Halbjährlich",
  12: "Jährlich",
  24: "Alle 2 Jahre",
  36: "Alle 3 Jahre",
};

export default function VertragDetailPage() {
  const router = useLocaleRouter();
  const params = useParams();
  const vertragId = params?.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch(`/api/wartung/contracts/${vertragId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Nicht gefunden")))
      .then(setContract)
      .catch(() => setError("Vertrag nicht gefunden."))
      .finally(() => setLoading(false));
  }, [vertragId]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/wartung/contracts/${vertragId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractNumber: fd.get("contractNumber") || null,
        customerName: fd.get("customerName"),
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate") || null,
        autoRenew: fd.get("autoRenew") === "on",
        status: fd.get("status"),
      }),
    });

    setSaving(false);

    if (res.ok) {
      const updated = await res.json();
      setContract({ ...contract!, ...updated });
      setEditMode(false);
    } else {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern.");
    }
  }

  async function handleDelete() {
    if (!confirm("Vertrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    const res = await fetch(`/api/wartung/contracts/${vertragId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/wartung/vertraege");
    } else {
      const data = await res.json();
      setError(data.error || "Fehler beim Löschen.");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Laden...</div>;
  }

  if (error && !contract) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/wartung/vertraege")} className="rounded-xl">
          <ArrowLeft className="mr-2 h-5 w-5" /> Zurück
        </Button>
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!contract) return null;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/wartung/vertraege")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{contract.contractNumber || "Vertrag"}</h1>
            <p className="text-sm text-muted-foreground">{contract.customerName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode && (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)} className="rounded-xl min-h-[48px]">
                Bearbeiten
              </Button>
              <Button variant="outline" onClick={handleDelete} className="rounded-xl min-h-[48px] text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Objekt-Link */}
      <div
        onClick={() => router.push(`/dashboard/wartung/objekte/${contract.object.id}`)}
        className="rounded-2xl border bg-card p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-4"
      >
        <Building2 className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">{contract.object.name}</p>
          <p className="text-sm text-muted-foreground">
            {contract.object.address}, {contract.object.city} · {contract.object.buildingType}
          </p>
        </div>
      </div>

      {/* Vertragsdaten */}
      {editMode ? (
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractNumber">Vertragsnummer</Label>
              <Input id="contractNumber" name="contractNumber" defaultValue={contract.contractNumber ?? ""} className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">Kunde</Label>
              <Input id="customerName" name="customerName" defaultValue={contract.customerName} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Vertragsbeginn</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={contract.startDate.slice(0, 10)} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Vertragsende</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={contract.endDate?.slice(0, 10) ?? ""} className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={contract.status} className="w-full rounded-xl border px-3 py-2 min-h-[48px] text-sm">
                <option value="ACTIVE">Aktiv</option>
                <option value="EXPIRED">Abgelaufen</option>
                <option value="CANCELLED">Gekündigt</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input id="autoRenew" name="autoRenew" type="checkbox" defaultChecked={contract.autoRenew} className="h-5 w-5" />
              <Label htmlFor="autoRenew">Automatische Verlängerung</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="rounded-xl min-h-[48px]">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Speichern..." : "Speichern"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="rounded-xl min-h-[48px]">
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[contract.status] ?? "bg-gray-100"}`}>
                {contract.status}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Vertragsnummer:</span>{" "}
              {contract.contractNumber || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Vertragsbeginn:</span>{" "}
              {formatDate(contract.startDate)}
            </div>
            <div>
              <span className="text-muted-foreground">Vertragsende:</span>{" "}
              {formatDate(contract.endDate)}
            </div>
            <div>
              <span className="text-muted-foreground">Auto-Verlängerung:</span>{" "}
              {contract.autoRenew ? "Ja" : "Nein"}
            </div>
          </div>
        </div>
      )}

      {/* Leistungen */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Wartungsleistungen ({contract.leases.length})
          </h2>
        </div>
        {contract.leases.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Keine Leistungen hinterlegt.</p>
        ) : (
          <div className="divide-y">
            {contract.leases.map((l) => (
              <div key={l.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{l.serviceType}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {l.estimatedHours}h
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">
                    {INTERVAL_LABELS[l.intervalMonths] ?? `Alle ${l.intervalMonths} Monate`}
                  </span>
                  {l.qualificationRequired && (
                    <span className="rounded-full bg-orange-50 text-orange-700 px-2 py-0.5">
                      {l.qualificationRequired}
                    </span>
                  )}
                  {l.seasonalPreference && l.seasonalPreference !== "KEINE" && (
                    <span className="rounded-full bg-green-50 text-green-700 px-2 py-0.5">
                      Saison: {l.seasonalPreference}
                    </span>
                  )}
                  {l.legalBasis && (
                    <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5">
                      {l.legalBasis}
                    </span>
                  )}
                  {l.legalDeadline && (
                    <span className="rounded-full bg-yellow-50 text-yellow-700 px-2 py-0.5">
                      Frist: {formatDate(l.legalDeadline)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
