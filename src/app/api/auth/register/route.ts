import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  firmenname: z.string().min(2, "Firmenname muss mindestens 2 Zeichen haben"),
  land: z.enum(["DE", "AT", "CH"]).default("DE"),
});

const UST_SATZ_PRO_LAND: Record<string, number> = {
  DE: 19.0,
  AT: 20.0,
  CH: 8.1,
};

const WAEHRUNG_PRO_LAND: Record<string, string> = {
  DE: "EUR",
  AT: "EUR",
  CH: "CHF",
};

export async function POST(request: Request) {
  const body = await request.json();

  const result = registerSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Ungültige Eingabe." },
      { status: 400 },
    );
  }

  const { name, email, password, firmenname, land } = result.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Diese E-Mail wird bereits verwendet." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);

  // Tenant + User atomisch in einer Transaktion erstellen
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: firmenname,
        land,
        ustSatz: UST_SATZ_PRO_LAND[land] ?? 19.0,
        waehrung: WAEHRUNG_PRO_LAND[land] ?? "EUR",
        sprache: "de",
      },
    });

    await tx.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        name,
        role: "ADMIN",
      },
    });
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
