export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantDb } from "@/lib/db";
import { TechnikerTable } from "@/components/wartung/techniker-table";

export default async function TechnikerPage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  const tenantId = session.user.tenantId;
  const db = getTenantDb(tenantId);
  const t = await getTranslations("wartung");

  const techniker = await db.technician.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      qualifications: true,
      workHoursStart: true,
      workHoursEnd: true,
      maxDailyHours: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = techniker.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("technikerTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("technikerSubtitle", { count: total })}
        </p>
      </div>
      <TechnikerTable techniker={JSON.parse(JSON.stringify(techniker))} />
    </div>
  );
}
