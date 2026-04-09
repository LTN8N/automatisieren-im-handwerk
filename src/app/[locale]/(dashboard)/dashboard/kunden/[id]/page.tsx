import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTenantDb } from "@/lib/db";
import { KundeForm } from "@/components/kunden/kunde-form";

interface KundeEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function KundeEditPage({ params }: KundeEditPageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/de/login");
  }

  const { id } = await params;
  const db = getTenantDb(session.user.tenantId);

  const kunde = await db.kunde.findFirst({
    where: { id },
  });

  if (!kunde) {
    notFound();
  }

  return (
    <KundeForm
      kunde={{
        id: kunde.id,
        name: kunde.name,
        adresse: kunde.adresse,
        email: kunde.email,
        telefon: kunde.telefon,
        notizen: kunde.notizen,
      }}
    />
  );
}
