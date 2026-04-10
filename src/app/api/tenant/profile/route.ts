import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  adresse: z.string().optional(),
  steuernummer: z.string().nullable().optional(),
  ustId: z.string().nullable().optional(),
  emailConfig: z
    .object({
      host: z.string(),
      port: z.number().int().positive(),
      user: z.string(),
      password: z.string(),
      from: z.string().email(),
    })
    .nullable()
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  if (!tenant) {
    return NextResponse.json({ error: "Betrieb nicht gefunden.", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const body = await request.json();

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Ungültige Eingabe.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const data = result.data;

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.adresse !== undefined && { adresse: data.adresse }),
      ...(data.steuernummer !== undefined && { steuernummer: data.steuernummer }),
      ...(data.ustId !== undefined && { ustId: data.ustId }),
      ...(data.emailConfig !== undefined && { emailConfig: data.emailConfig ?? undefined }),
    },
  });

  return NextResponse.json(updated);
}
