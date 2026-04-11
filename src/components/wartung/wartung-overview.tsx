"use client";

import { useTranslations } from "next-intl";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, FileText, Users, CalendarDays, Plus, Sparkles } from "lucide-react";

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
      value: jahresplaene.length,
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
            onClick={() => router.push("/dashboard/wartung/vertraege")}
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
        {jahresplaene.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("keinePlaene")}</p>
        ) : (
          <div className="divide-y">
            {jahresplaene.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="font-medium text-sm">
                  {t("planJahr", { year: plan.year })}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    PLAN_STATUS_COLORS[plan.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {t(`planStatus${plan.status}` as Parameters<typeof t>[0])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
