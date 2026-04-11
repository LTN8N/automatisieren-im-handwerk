"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

const BUNDESLAENDER = [
  { value: "BB", label: "Brandenburg" },
  { value: "BE", label: "Berlin" },
  { value: "BW", label: "Baden-Württemberg" },
  { value: "BY", label: "Bayern" },
  { value: "HB", label: "Bremen" },
  { value: "HE", label: "Hessen" },
  { value: "HH", label: "Hamburg" },
  { value: "MV", label: "Mecklenburg-Vorpommern" },
  { value: "NI", label: "Niedersachsen" },
  { value: "NW", label: "Nordrhein-Westfalen" },
  { value: "RP", label: "Rheinland-Pfalz" },
  { value: "SH", label: "Schleswig-Holstein" },
  { value: "SL", label: "Saarland" },
  { value: "SN", label: "Sachsen" },
  { value: "ST", label: "Sachsen-Anhalt" },
  { value: "TH", label: "Thüringen" },
];

export function PlanGenerierungForm() {
  const router = useLocaleRouter();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [bundesland, setBundesland] = useState("NW");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/wartung/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Generierung fehlgeschlagen.");
        return;
      }

      if (data.warnings?.length) {
        toast.warning(`Plan generiert mit ${data.warnings.length} Warnungen.`);
      } else {
        toast.success(
          `Plan für ${year} generiert — ${data.entriesCreated} Termine eingeplant.`
        );
      }

      router.push(`/dashboard/wartung/plaene/${data.planId}`);
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card className="max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
      <div className="space-y-5">
        {/* Jahr */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Jahr
          </label>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  year === y
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background hover:bg-muted"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Bundesland */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Bundesland (für Schulferien)
          </label>
          <select
            value={bundesland}
            onChange={(e) => setBundesland(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {BUNDESLAENDER.map((bl) => (
              <option key={bl.value} value={bl.value}>
                {bl.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Schulferien werden bei der Planung als Puffer berücksichtigt.
          </p>
        </div>

        {/* Hinweis */}
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <strong>Hinweis:</strong> Die KI plant alle aktiven Wartungsverträge automatisch
          ein. Bestehende Entwürfe für dieses Jahr werden überschrieben. Freigegebene
          Pläne können nicht überschrieben werden.
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="min-h-[48px] flex-1 rounded-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                KI plant...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Plan generieren
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/wartung")}
            disabled={isGenerating}
            className="min-h-[48px] rounded-xl"
          >
            Abbrechen
          </Button>
        </div>
      </div>
    </Card>
  );
}
