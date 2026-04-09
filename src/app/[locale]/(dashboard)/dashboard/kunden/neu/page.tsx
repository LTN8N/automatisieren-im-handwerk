import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KundeForm } from "@/components/kunden/kunde-form";

export default async function NeuerKundePage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/de/login");
  }

  return <KundeForm />;
}
