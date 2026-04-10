export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTenantDb } from "@/lib/db";
import { RechnungenTable } from "@/components/rechnungen/rechnungen-table";

interface RechnungenPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    perPage?: string;
  }>;
}

export default async function RechnungenPage({ searchParams }: RechnungenPageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  const params = await searchParams;
  const db = getTenantDb(session.user.tenantId);

  const search = params.search ?? "";
  const statusFilter = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));
  const perPage = Math.min(50, Math.max(10, Number(params.perPage ?? "10")));

  const where: Record<string, unknown> = {};

  if (statusFilter && statusFilter !== "ALLE") {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      { nummer: { contains: search, mode: "insensitive" as const } },
      { kunde: { name: { contains: search, mode: "insensitive" as const } } },
    ];
  }

  const [rechnungen, total] = await Promise.all([
    db.rechnung.findMany({
      where,
      include: { kunde: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.rechnung.count({ where }),
  ]);

  const pagination = {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rechnungen</h1>
      <RechnungenTable
        rechnungen={JSON.parse(JSON.stringify(rechnungen))}
        pagination={pagination}
        searchQuery={search}
        statusFilter={statusFilter}
      />
    </div>
  );
}
