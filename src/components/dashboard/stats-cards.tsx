import { getTranslations } from "next-intl/server";
import { getTenantDb } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsData {
  offeneAngebote: number;
  offeneRechnungen: number;
  kundenAnzahl: number;
  umsatzMonat: number;
  umsatzVormonat: number;
}

async function getStats(tenantId: string): Promise<StatsData> {
  const db = getTenantDb(tenantId);

  const now = new Date();
  const ersterDesMonats = new Date(now.getFullYear(), now.getMonth(), 1);
  const ersterVormonat = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    offeneAngebote,
    offeneRechnungen,
    kundenAnzahl,
    bezahlteRechnungenMonat,
    bezahlteRechnungenVormonat,
  ] = await Promise.all([
    db.angebot.count({
      where: { status: { in: ["ENTWURF", "GESENDET"] } },
    }),
    db.rechnung.count({
      where: { status: "GESENDET" },
    }),
    db.kunde.count(),
    db.rechnung.findMany({
      where: {
        status: "BEZAHLT",
        bezahltAm: { gte: ersterDesMonats },
      },
      select: { brutto: true },
    }),
    db.rechnung.findMany({
      where: {
        status: "BEZAHLT",
        bezahltAm: { gte: ersterVormonat, lt: ersterDesMonats },
      },
      select: { brutto: true },
    }),
  ]);

  const umsatzMonat = bezahlteRechnungenMonat.reduce(
    (sum: number, r: { brutto: number }) => sum + r.brutto,
    0
  );
  const umsatzVormonat = bezahlteRechnungenVormonat.reduce(
    (sum: number, r: { brutto: number }) => sum + r.brutto,
    0
  );

  return {
    offeneAngebote,
    offeneRechnungen,
    kundenAnzahl,
    umsatzMonat,
    umsatzVormonat,
  };
}

function TrendIndicator({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }

  if (previous === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" />
        Neu
      </span>
    );
  }

  const change = ((current - previous) / previous) * 100;
  const isPositive = change >= 0;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs",
        isPositive ? "text-green-600" : "text-red-600"
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? "+" : ""}
      {change.toFixed(0)}%
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export async function StatsCards({ tenantId }: { tenantId: string }) {
  const [t, stats] = await Promise.all([
    getTranslations("dashboard"),
    getStats(tenantId),
  ]);

  const cards = [
    {
      title: t("openAngebote"),
      value: stats.offeneAngebote.toString(),
      icon: FileText,
    },
    {
      title: t("openRechnungen"),
      value: stats.offeneRechnungen.toString(),
      icon: Receipt,
    },
    {
      title: t("kunden"),
      value: stats.kundenAnzahl.toString(),
      icon: Users,
    },
    {
      title: t("umsatzMonat"),
      value: formatCurrency(stats.umsatzMonat),
      icon: TrendingUp,
      trend: {
        current: stats.umsatzMonat,
        previous: stats.umsatzVormonat,
      },
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.trend && (
                <TrendIndicator
                  current={card.trend.current}
                  previous={card.trend.previous}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
