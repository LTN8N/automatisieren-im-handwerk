export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantDb } from "@/lib/db";
import { ObjekteTable } from "@/components/wartung/objekte-table";

interface ObjektePageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function ObjektePage({ searchParams }: ObjektePageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  const tenantId = session.user.tenantId;
  const params = await searchParams;
  const db = getTenantDb(tenantId);
  const t = await getTranslations("wartung");

  const search = params.search ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));
  const perPage = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { postalCode: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const [objekte, total] = await Promise.all([
    db.maintenanceObject.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { _count: { select: { contracts: true } } },
    }),
    db.maintenanceObject.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("objekteTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("objekteSubtitle", { count: total })}
        </p>
      </div>
      <ObjekteTable
        objekte={JSON.parse(JSON.stringify(objekte))}
        pagination={{ page, perPage, total, totalPages: Math.ceil(total / perPage) }}
        searchQuery={search}
      />
    </div>
  );
}
