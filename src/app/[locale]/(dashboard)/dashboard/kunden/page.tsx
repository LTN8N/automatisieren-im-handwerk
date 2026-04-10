export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantDb } from "@/lib/db";
import { KundenTable } from "@/components/kunden/kunden-table";

interface KundenPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    perPage?: string;
  }>;
}

export default async function KundenPage({ searchParams }: KundenPageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
  }

  const params = await searchParams;
  const t = await getTranslations("kunden");
  const db = getTenantDb(session.user.tenantId);

  const search = params.search ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));
  const perPage = Math.min(50, Math.max(10, Number(params.perPage ?? "10")));

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { telefon: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const [kunden, total] = await Promise.all([
    db.kunde.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.kunde.count({ where }),
  ]);

  const pagination = {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle", { count: total })}</p>
      </div>
      <KundenTable
        kunden={JSON.parse(JSON.stringify(kunden))}
        pagination={pagination}
        searchQuery={search}
      />
    </div>
  );
}
