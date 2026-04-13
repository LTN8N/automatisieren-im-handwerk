"use client";

import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Calendar, CheckCircle, Clock, FileText } from "lucide-react";

interface Plan {
  id: string;
  year: number;
  status: string;
  createdAt: string;
  _count: { entries: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: "Entwurf", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  RELEASED: { label: "Freigegeben", color: "bg-green-100 text-green-800", icon: CheckCircle },
  EXECUTING: { label: "In Ausführung", color: "bg-blue-100 text-blue-800", icon: Calendar },
  COMPLETED: { label: "Abgeschlossen", color: "bg-gray-100 text-gray-700", icon: FileText },
};

export function PlaeneList({ plaene }: { plaene: Plan[] }) {
  const router = useLocaleRouter();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/wartung")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Jahrespläne</h1>
            <p className="text-sm text-muted-foreground">Wartungspläne erstellen und verwalten</p>
          </div>
        </div>
        <Button onClick={() => router.push("/dashboard/wartung/plaene/neu")} className="rounded-xl min-h-[48px]">
          <Plus className="mr-2 h-4 w-4" />
          Neuer Plan
        </Button>
      </div>

      {plaene.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 shadow-sm text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Noch keine Pläne</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Erstellen Sie Ihren ersten Jahresplan — das System berechnet optimale Termine für alle Wartungen.
          </p>
          <Button onClick={() => router.push("/dashboard/wartung/plaene/neu")} className="rounded-xl min-h-[48px]">
            <Plus className="mr-2 h-4 w-4" />
            Ersten Plan erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plaene.map((p) => {
            const config = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT;
            const Icon = config.icon;
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/wartung/plaene/${p.id}`)}
                className="rounded-2xl border bg-card p-5 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Wartungsplan {p.year}</h3>
                    <p className="text-sm text-muted-foreground">
                      {p._count.entries} Wartungstermine · Erstellt am{" "}
                      {new Date(p.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
