"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, FileText, Receipt } from "lucide-react";

interface Kunde {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;
  adresse: string | null;
  notizen: string | null;
  angebote: Array<{ id: string; nummer: string; status: string; brutto: string; createdAt: string }>;
  rechnungen: Array<{ id: string; nummer: string; status: string; brutto: string; createdAt: string }>;
}

function formatEuro(betrag: string | number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(betrag));
}

function formatDatum(datum: string): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(datum));
}

export default function KundeDetailPage() {
  const router = useLocaleRouter();
  const params = useParams();
  const kundeId = params?.id as string;

  const [kunde, setKunde] = useState<Kunde | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch(`/api/kunden/${kundeId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Nicht gefunden")))
      .then(setKunde)
      .catch(() => setError("Kunde nicht gefunden."))
      .finally(() => setLoading(false));
  }, [kundeId]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/kunden/${kundeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        telefon: fd.get("telefon"),
        adresse: fd.get("adresse"),
        notizen: fd.get("notizen"),
      }),
    });

    setSaving(false);

    if (res.ok) {
      const updated = await res.json();
      setKunde({ ...kunde!, ...updated });
      setEditMode(false);
    } else {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern.");
    }
  }

  if (loading) return <div className="flex justify-center py-20 text-muted-foreground">Laden...</div>;
  if (error && !kunde) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/kunden")} className="rounded-xl">
          <ArrowLeft className="mr-2 h-5 w-5" /> Zurueck
        </Button>
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!kunde) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/kunden")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{kunde.name}</h1>
        </div>
        {!editMode && (
          <Button variant="outline" onClick={() => setEditMode(true)} className="rounded-xl min-h-[48px]">
            Bearbeiten
          </Button>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      {/* Stammdaten */}
      {editMode ? (
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={kunde.name} className="min-h-[48px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" defaultValue={kunde.email ?? ""} className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefon">Telefon</Label>
              <Input id="telefon" name="telefon" defaultValue={kunde.telefon ?? ""} className="min-h-[48px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" name="adresse" defaultValue={kunde.adresse ?? ""} className="min-h-[48px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <textarea id="notizen" name="notizen" defaultValue={kunde.notizen ?? ""} rows={3} className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="rounded-xl min-h-[48px]">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Speichern..." : "Speichern"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="rounded-xl min-h-[48px]">
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">E-Mail:</span> {kunde.email || "—"}</div>
            <div><span className="text-muted-foreground">Telefon:</span> {kunde.telefon || "—"}</div>
            <div className="sm:col-span-2"><span className="text-muted-foreground">Adresse:</span> {kunde.adresse || "—"}</div>
            {kunde.notizen && <div className="sm:col-span-2"><span className="text-muted-foreground">Notizen:</span> {kunde.notizen}</div>}
          </div>
        </div>
      )}

      {/* Angebote */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Angebote</h2>
          <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/angebote/neu")} className="rounded-xl">
            Neues Angebot
          </Button>
        </div>
        {kunde.angebote.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Keine Angebote vorhanden.</p>
        ) : (
          <div className="divide-y">
            {kunde.angebote.map((a) => (
              <div key={a.id} onClick={() => router.push(`/dashboard/angebote/${a.id}`)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div>
                  <span className="font-mono text-sm font-medium">{a.nummer}</span>
                  <span className="ml-3 text-xs text-muted-foreground">{formatDatum(a.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatEuro(a.brutto)}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rechnungen */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Rechnungen</h2>
          <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/rechnungen/neu")} className="rounded-xl">
            Neue Rechnung
          </Button>
        </div>
        {kunde.rechnungen.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Keine Rechnungen vorhanden.</p>
        ) : (
          <div className="divide-y">
            {kunde.rechnungen.map((r) => (
              <div key={r.id} onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div>
                  <span className="font-mono text-sm font-medium">{r.nummer}</span>
                  <span className="ml-3 text-xs text-muted-foreground">{formatDatum(r.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatEuro(r.brutto)}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
