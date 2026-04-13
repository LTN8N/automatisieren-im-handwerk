"use client";

import { useTranslations } from "next-intl";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Building2, FileText, Users, CalendarDays, Plus, Sparkles, Trash2 } from "lucide-react";

interface AnnualPlan {
  id: string;
  year: number;
  status: string;
  createdAt: string;
}

interface WartungOverviewProps {
  objekteCount: number;
  vertraegeCount: number;
  technikerCount: number;
  jahresplaene: AnnualPlan[];
}

const PLAN_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  RELEASED: "bg-blue-100 text-blue-800",
  EXECUTING: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-700",
};

export function WartungOverview({
  objekteCount,
  vertraegeCount,
  technikerCount,
  jahresplaene,
}: WartungOverviewProps) {
  const t = useTranslations("wartung");
  const router = useLocaleRouter();
  const [plaene, setPlaene] = useState(jahresplaene);

  async function handleDeletePlan(e: React.MouseEvent, planId: string) {
    e.stopPropagation();
    if (!confirm("Plan wirklich löschen? Alle Einträge werden entfernt.")) return;
    const res = await fetch(`/api/wartung/plans/${planId}`, { method: "DELETE" });
    if (res.ok) {
      setPlaene(plaene.filter((p) => p.id !== planId));
    } else {
      const data = await res.json();
      alert(data.error || "Fehler beim Löschen.");
    }
  }

  const kpis = [
    {
      label: t("kpiAktiveVertraege"),
      value: vertraegeCount,
      icon: FileText,
      href: "/dashboard/wartung/vertraege",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: t("kpiObjekte"),
      value: objekteCount,
      icon: Building2,
      href: "/dashboard/wartung/objekte",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: t("kpiTechniker"),
      value: technikerCount,
      icon: Users,
      href: "/dashboard/wartung/techniker",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: t("kpiJahresplaene"),
      value: plaene.length,
      icon: CalendarDays,
      href: "/dashboard/wartung",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI-Kacheln */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="cursor-pointer rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => router.push(kpi.href)}
            >
              <div className={`mb-3 inline-flex rounded-xl p-2 ${kpi.bg}`}>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-sm text-muted-foreground">{kpi.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Schnellaktionen */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">{t("schnellaktionen")}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => router.push("/dashboard/wartung/vertraege/neu")}
            className="rounded-xl min-h-[48px] flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t("neuerVertrag")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/wartung/plaene/neu")}
            className="rounded-xl min-h-[48px] flex-1 sm:flex-none"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {t("planGenerieren")}
          </Button>
        </div>
      </div>

      {/* Letzte Jahrespläne */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {t("letzteJahresplaene")}
          </h2>
        </div>
        {plaene.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("keinePlaene")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Erstellen Sie jetzt Ihren ersten Jahresplan.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/wartung/vertraege")}
              className="rounded-xl min-h-[44px]"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Plan generieren
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {plaene.map((plan) => (
              <div
                key={plan.id}
                className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-muted/40"
                onClick={() => router.push(`/dashboard/wartung/plaene/${plan.id}`)}
              >
                <span className="font-medium text-sm">
                  {t("planJahr", { year: plan.year })}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      PLAN_STATUS_COLORS[plan.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {t(`planStatus${plan.status}` as Parameters<typeof t>[0])}
                  </span>
                  {plan.status !== "RELEASED" && (
                    <button
                      onClick={(e) => handleDeletePlan(e, plan.id)}
                      className="rounded-lg p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Plan löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
