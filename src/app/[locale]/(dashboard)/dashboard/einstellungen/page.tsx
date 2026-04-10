export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { EinstellungenTabs } from "@/components/einstellungen/einstellungen-tabs";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export default async function EinstellungenPage() {
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale: "de" });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const t = await getTranslations("einstellungen");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    redirect({ href: "/login", locale: "de" });
  }

  const [angeboteCount, rechnungenCount, letzteAngebotNr, letzteRechnungNr] = await Promise.all([
    prisma.angebot.count({ where: { tenantId } }),
    prisma.rechnung.count({ where: { tenantId } }),
    prisma.angebot.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { nummer: true },
    }),
    prisma.rechnung.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { nummer: true },
    }),
  ]);

  const initialData = {
    id: tenant.id,
    name: tenant.name,
    adresse: tenant.adresse,
    steuernummer: tenant.steuernummer,
    ustId: tenant.ustId,
    logo: tenant.logo,
    bankName: tenant.bankName,
    bankIban: tenant.bankIban,
    bankBic: tenant.bankBic,
    emailConfig: tenant.emailConfig as {
      host: string;
      port: number;
      user: string;
      password: string;
      from: string;
      secure: boolean;
    } | null,
    ustSatz: tenant.ustSatz,
    land: (tenant.land ?? "DE") as "DE" | "AT" | "CH",
    waehrung: tenant.waehrung,
    sprache: tenant.sprache,
    _nummernkreise: {
      angebote: { anzahl: angeboteCount, letzteNummer: letzteAngebotNr?.nummer ?? null },
      rechnungen: { anzahl: rechnungenCount, letzteNummer: letzteRechnungNr?.nummer ?? null },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
      </div>
      <EinstellungenTabs initialData={initialData} />
    </div>
  );
}
