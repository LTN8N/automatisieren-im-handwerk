export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTenantDb } from "@/lib/db";
import { notFound } from "next/navigation";
import { JahresplanDetail } from "@/components/wartung/jahresplan-detail";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function JahresplanDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
    return null;
  }

  const { id } = await params;
  const db = getTenantDb(session.user.tenantId);

  const plan = await db.annualPlan.findFirst({
    where: { id },
    include: {
      entries: {
        orderBy: { scheduledDate: "asc" },
        include: {
          technician: { select: { id: true, name: true, qualifications: true } },
          lease: {
            include: {
              contract: {
                include: {
                  object: {
                    select: {
                      id: true,
                      name: true,
                      address: true,
                      city: true,
                      postalCode: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) notFound();

  const technicians = await db.technician.findMany({
    where: { isActive: true },
    select: { id: true, name: true, qualifications: true, maxDailyHours: true },
    orderBy: { name: "asc" },
  });

  return (
    <JahresplanDetail
      plan={JSON.parse(JSON.stringify(plan))}
      technicians={JSON.parse(JSON.stringify(technicians))}
    />
  );
}
