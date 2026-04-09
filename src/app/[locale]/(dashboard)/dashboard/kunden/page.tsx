import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getTenantDb } from "@/lib/db";
import { KundenTable } from "@/components/kunden/kunden-table";

interface KundenPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    perPage?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function KundenPage({ searchParams }: KundenPageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/de/login");
  }

  const t = await getTranslations("kunden");
  const params = await searchParams;
  const db = getTenantDb(session.user.tenantId);

  const search = params.search ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));
  const perPage = Math.min(50, Math.max(10, Number(params.perPage ?? "10")));
  const sortBy = params.sortBy ?? "name";
  const sortOrder = params.sortOrder === "desc" ? "desc" : "asc";

  const allowedSortFields = ["name", "email", "telefon", "createdAt"];
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : "name";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [kunden, total] = await Promise.all([
    db.kunde.findMany({
      where,
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: {
          select: {
            angebote: true,
            rechnungen: true,
          },
        },
      },
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
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <KundenTable
        kunden={JSON.parse(JSON.stringify(kunden))}
        pagination={pagination}
        searchQuery={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </div>
  );
}
