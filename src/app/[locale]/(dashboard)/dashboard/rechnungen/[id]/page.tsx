import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTenantDb } from "@/lib/db";
import { RechnungDetail } from "@/components/rechnungen/rechnung-detail";

interface RechnungDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RechnungDetailPage({ params }: RechnungDetailPageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/de/login");
  }

  const { id } = await params;
  const db = getTenantDb(session.user.tenantId);

  const rechnung = await db.rechnung.findFirst({
    where: { id },
    include: {
      positionen: { orderBy: { sortierung: "asc" } },
      historie: { orderBy: { createdAt: "desc" } },
      kunde: { select: { id: true, name: true, adresse: true, email: true } },
      angebot: { select: { id: true, nummer: true } },
    },
  });

  if (!rechnung) {
    notFound();
  }

  return <RechnungDetail rechnung={JSON.parse(JSON.stringify(rechnung))} />;
}
