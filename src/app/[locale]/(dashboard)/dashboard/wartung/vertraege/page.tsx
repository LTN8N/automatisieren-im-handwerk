export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantDb } from "@/lib/db";
import { VertraegeTable } from "@/components/wartung/vertraege-table";

interface VertraegePageProps {
  searchParams: Promise<{ status?: string; objectId?: string; page?: string }>;
}

export default async function VertraegePage({ searchParams }: VertraegePageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  const tenantId = session.user.tenantId;
  const params = await searchParams;
  const db = getTenantDb(tenantId);
  const t = await getTranslations("wartung");

  const page = Math.max(1, Number(params.page ?? "1"));
  const perPage = 20;

  const where: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }
  if (params.objectId) {
    where.objectId = params.objectId;
  }

  const [vertraege, total] = await Promise.all([
    db.maintenanceContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        object: { select: { id: true, name: true } },
        _count: { select: { leases: true } },
      },
    }),
    db.maintenanceContract.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("vertraegeTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("vertraegeSubtitle", { count: total })}
        </p>
      </div>
      <VertraegeTable
        vertraege={JSON.parse(JSON.stringify(vertraege))}
        pagination={{ page, perPage, total, totalPages: Math.ceil(total / perPage) }}
        currentStatus={params.status ?? "ALL"}
      />
    </div>
  );
}
