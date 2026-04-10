export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations("dashboard");
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: session?.user?.name ?? "" })}
      </h1>
      {tenantId && <StatsCards tenantId={tenantId} />}
      <QuickActions />
    </div>
  );
}
