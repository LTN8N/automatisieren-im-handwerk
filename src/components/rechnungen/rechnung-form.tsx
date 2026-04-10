"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Kunde {
  id: string;
  name: string;
}

interface Position {
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
}

interface Props {
  kunden: Kunde[];
}

const EINHEITEN = ["Stk", "m", "m²", "m³", "h", "Std", "Psch", "kg", "l"];

export function RechnungForm({ kunden }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const [kundeId, setKundeId] = useState("");
  const [zahlungszielTage, setZahlungszielTage] = useState(14);
  const [positionen, setPositionen] = useState<Position[]>([
    { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  const netto = positionen.reduce((s, p) => s + p.menge * p.einzelpreis, 0);
  const ust = Math.round(netto * 0.19 * 100) / 100;
  const brutto = Math.round((netto + ust) * 100) / 100;

  function addPosition() {
    setPositionen((prev) => [
      ...prev,
      { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0 },
    ]);
  }

  function removePosition(idx: number) {
    setPositionen((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePosition(idx: number, field: keyof Position, value: string | number) {
    setPositionen((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kundeId) {
      toast.error("Bitte Kunde auswählen");
      return;
    }
    if (positionen.some((p) => !p.beschreibung.trim())) {
      toast.error("Alle Positionen benötigen eine Beschreibung");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/rechnungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kundeId, zahlungszielTage, positionen }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Fehler beim Erstellen");
        return;
      }

      const rechnung = await res.json();
      toast.success(`Rechnung ${rechnung.nummer} erstellt`);
      router.push(`/${locale}/dashboard/rechnungen/${rechnung.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Kopfdaten */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kunde">Kunde *</Label>
          <Select value={kundeId} onValueChange={(value) => setKundeId(value ?? "")}>
            <SelectTrigger id="kunde">
              <SelectValue placeholder="Kunde auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {kunden.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zahlungsziel">Zahlungsziel (Tage)</Label>
          <Input
            id="zahlungsziel"
            type="number"
            min={1}
            max={365}
            value={zahlungszielTage}
            onChange={(e) => setZahlungszielTage(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Positionen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Positionen</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPosition}>
            <Plus className="h-4 w-4 mr-1" />
            Position hinzufügen
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
            <span className="col-span-5">Beschreibung</span>
            <span className="col-span-2">Menge</span>
            <span className="col-span-2">Einheit</span>
            <span className="col-span-2">Einzelpreis</span>
            <span className="col-span-1"></span>
          </div>

          {positionen.map((p, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-5"
                placeholder="Beschreibung..."
                value={p.beschreibung}
                onChange={(e) => updatePosition(idx, "beschreibung", e.target.value)}
                required
              />
              <Input
                className="col-span-2"
                type="number"
                min={0.01}
                step={0.01}
                value={p.menge}
                onChange={(e) => updatePosition(idx, "menge", parseFloat(e.target.value) || 0)}
              />
              <Select
                value={p.einheit}
                onValueChange={(v) => updatePosition(idx, "einheit", v ?? "")}
              >
                <SelectTrigger className="col-span-2 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EINHEITEN.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="col-span-2"
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={p.einzelpreis}
                onChange={(e) => updatePosition(idx, "einzelpreis", parseFloat(e.target.value) || 0)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="col-span-1"
                onClick={() => removePosition(idx)}
                disabled={positionen.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Summen */}
      <div className="rounded-lg border p-4 space-y-1 ml-auto max-w-xs">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Netto</span>
          <span>{netto.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">MwSt. 19%</span>
          <span>{ust.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
        </div>
        <div className="flex justify-between font-bold border-t pt-1">
          <span>Brutto</span>
          <span>{brutto.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Rechnung erstellen
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${locale}/dashboard/rechnungen`)}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
