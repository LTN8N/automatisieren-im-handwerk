"use client";

import { useState } from "react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";

export default function NeuerKundePage() {
  const router = useLocaleRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      email: fd.get("email"),
      telefon: fd.get("telefon"),
      adresse: fd.get("adresse"),
      notizen: fd.get("notizen"),
    };

    const res = await fetch("/api/kunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Erstellen.");
      return;
    }

    const kunde = await res.json();
    router.push(`/dashboard/kunden/${kunde.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/kunden")} className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Neuer Kunde</h1>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required placeholder="Max Mustermann" className="min-h-[48px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" placeholder="kunde@firma.de" className="min-h-[48px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input id="telefon" name="telefon" placeholder="040 1234567" className="min-h-[48px]" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" name="adresse" placeholder="Musterstr. 1, 22041 Hamburg" className="min-h-[48px]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notizen">Notizen</Label>
          <textarea id="notizen" name="notizen" rows={3} className="w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]" placeholder="Optionale Notizen..." />
        </div>
        <Button type="submit" disabled={loading} className="rounded-xl min-h-[48px]">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Wird gespeichert..." : "Kunde anlegen"}
        </Button>
      </form>
    </div>
  );
}
