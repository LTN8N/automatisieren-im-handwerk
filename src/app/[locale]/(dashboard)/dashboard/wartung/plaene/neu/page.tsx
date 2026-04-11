export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { PlanGenerierungForm } from "@/components/wartung/plan-generierung-form";

export default async function JahresplanNeuPage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jahresplan erstellen</h1>
        <p className="text-sm text-muted-foreground">
          KI plant Ihre Wartungstermine automatisch für das gewählte Jahr.
        </p>
      </div>
      <PlanGenerierungForm />
    </div>
  );
}
