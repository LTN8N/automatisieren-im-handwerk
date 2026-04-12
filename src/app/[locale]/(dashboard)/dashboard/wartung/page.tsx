export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantDb } from "@/lib/db";
import { WartungOverview } from "@/components/wartung/wartung-overview";

export default async function WartungPage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  const tenantId = session.user.tenantId;
  const db = getTenantDb(tenantId);
  const t = await getTranslations("wartung");

  const [objekteCount, vertraegeCount, technikerCount, jahresplaene] =
    await Promise.all([
      db.maintenanceObject.count(),
      db.maintenanceContract.count({ where: { status: "ACTIVE" } }),
      db.technician.count({ where: { isActive: true } }),
      db.annualPlan.findMany({
        orderBy: { year: "desc" },
        take: 5,
        select: { id: true, year: true, status: true, createdAt: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <WartungOverview
        objekteCount={objekteCount}
        vertraegeCount={vertraegeCount}
        technikerCount={technikerCount}
        jahresplaene={JSON.parse(JSON.stringify(jahresplaene))}
      />
    </div>
  );
}
