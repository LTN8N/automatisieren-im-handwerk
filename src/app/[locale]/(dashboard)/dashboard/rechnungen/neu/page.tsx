import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantDb } from "@/lib/db";
import { RechnungForm } from "@/components/rechnungen/rechnung-form";

export default async function NeueRechnungPage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/de/login");
  }

  const db = getTenantDb(session.user.tenantId);

  const kunden = await db.kunde.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Neue Rechnung</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Erstelle eine neue Rechnung fuer einen Kunden.
        </p>
      </div>
      <RechnungForm kunden={JSON.parse(JSON.stringify(kunden))} />
    </div>
  );
}
