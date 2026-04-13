export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTenantDb } from "@/lib/db";
import { PlaeneList } from "./plaene-list";

export default async function PlaenePage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  const db = getTenantDb(session.user.tenantId);

  const plaene = await db.annualPlan.findMany({
    orderBy: { year: "desc" },
    include: {
      _count: { select: { entries: true } },
    },
  });

  return (
    <PlaeneList plaene={JSON.parse(JSON.stringify(plaene))} />
  );
}
