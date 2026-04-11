"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

interface Objekt {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface Leistung {
  serviceType: string;
  intervalMonths: number;
  estimatedHours: number;
  qualificationRequired: string;
  seasonalPreference: string;
}

function emptyLeistung(): Leistung {
  return {
    serviceType: "",
    intervalMonths: 12,
    estimatedHours: 2,
    qualificationRequired: "",
    seasonalPreference: "",
  };
}

export default function VertragNeuPage() {
  const t = useTranslations("wartung");
  const router = useLocaleRouter();

  const [objekte, setObjekte] = useState<Objekt[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leistungen, setLeistungen] = useState<Leistung[]>([emptyLeistung()]);

  useEffect(() => {
    fetch("/api/wartung/objects")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setObjekte(data.data ?? []))
      .catch(() => {});
  }, []);

  function updateLeistung(index: number, field: keyof Leistung, value: string | number) {
    setLeistungen((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  function removeLeistung(index: number) {
    setLeistungen((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    const payload = {
      objectId: fd.get("objectId") as string,
      customerName: fd.get("customerName") as string,
      contractNumber: (fd.get("contractNumber") as string) || undefined,
      startDate: fd.get("startDate") as string,
      endDate: (fd.get("endDate") as string) || undefined,
      autoRenew: fd.get("autoRenew") === "on",
      notes: (fd.get("notes") as string) || undefined,
      leases: leistungen.map((l) => ({
        serviceType: l.serviceType,
        intervalMonths: Number(l.intervalMonths),
        estimatedHours: Number(l.estimatedHours),
        qualificationRequired: l.qualificationRequired || undefined,
        seasonalPreference: l.seasonalPreference || undefined,
      })),
    };

    const res = await fetch("/api/wartung/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.ok) {
      router.push("/dashboard/wartung/vertraege");
    } else {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern.");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/wartung/vertraege")}
          className="rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("vertragNeuTitle")}</h1>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basisdaten */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">{t("vertragNeu")}</h2>

          <div className="space-y-2">
            <Label htmlFor="objectId">{t("objektAuswaehlen")}</Label>
            <select
              id="objectId"
              name="objectId"
              required
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-[48px] bg-background"
            >
              <option value="">{t("objektAuswaehlenPlaceholder")}</option>
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.address}, {o.city}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">{t("kundenname")}</Label>
              <Input
                id="customerName"
                name="customerName"
                required
                placeholder={t("kundeSuchePlaceholder")}
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractNumber">{t("vertragsnummer")}</Label>
              <Input
                id="contractNumber"
                name="contractNumber"
                placeholder="z.B. WV-2024-001"
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">{t("laufzeitVon")}</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t("laufzeitBis")}</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                className="min-h-[48px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoRenew"
              name="autoRenew"
              className="h-5 w-5 rounded"
            />
            <Label htmlFor="autoRenew">{t("autoVerlaengerung")}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("notizen")}</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Leistungen */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("leistungen")}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeistungen((prev) => [...prev, emptyLeistung()])}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("leistungHinzufuegen")}
            </Button>
          </div>

          {leistungen.map((l, i) => (
            <div
              key={i}
              className="rounded-xl border bg-muted/30 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("leistungNr", { nr: i + 1 })}
                </span>
                {leistungen.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLeistung(i)}
                    className="rounded-lg p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("anlagentyp")}</Label>
                  <Input
                    value={l.serviceType}
                    onChange={(e) => updateLeistung(i, "serviceType", e.target.value)}
                    placeholder="z.B. Heizungsanlage"
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("qualifikation")}</Label>
                  <Input
                    value={l.qualificationRequired}
                    onChange={(e) => updateLeistung(i, "qualificationRequired", e.target.value)}
                    placeholder="z.B. Gas-Zertifikat"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("intervall")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={l.intervalMonths}
                    onChange={(e) => updateLeistung(i, "intervalMonths", Number(e.target.value))}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("dauer")}</Label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={l.estimatedHours}
                    onChange={(e) => updateLeistung(i, "estimatedHours", Number(e.target.value))}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">{t("saison")}</Label>
                  <Input
                    value={l.seasonalPreference}
                    onChange={(e) => updateLeistung(i, "seasonalPreference", e.target.value)}
                    placeholder="z.B. Frühjahr, Herbst"
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Aktionen */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="rounded-xl min-h-[48px]">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Speichern..." : t("speichern")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/wartung/vertraege")}
            className="rounded-xl min-h-[48px]"
          >
            {t("abbrechen")}
          </Button>
        </div>
      </form>
    </div>
  );
}
