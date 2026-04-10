import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const einstellungenSchema = z.object({
  // Firmendaten
  name: z.string().min(1).optional(),
  adresse: z.string().optional(),
  steuernummer: z.string().nullable().optional(),
  ustId: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankIban: z.string().nullable().optional(),
  bankBic: z.string().nullable().optional(),
  // E-Mail
  emailConfig: z
    .object({
      host: z.string().min(1, "SMTP-Host ist erforderlich"),
      port: z.number().int().min(1).max(65535),
      user: z.string().min(1, "Benutzername ist erforderlich"),
      password: z.string(),
      from: z.string().email("Bitte eine gültige Absender-E-Mail angeben"),
      secure: z.boolean().optional().default(true),
    })
    .nullable()
    .optional(),
  // Steuern
  ustSatz: z.number().min(0).max(100).optional(),
  land: z.enum(["DE", "AT", "CH"]).optional(),
  waehrung: z.string().optional(),
  sprache: z.string().optional(),
  // Nummernkreise
  angebotPraefix: z.string().max(10).optional(),
  rechnungPraefix: z.string().max(10).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  if (!tenant) {
    return NextResponse.json({ error: "Betrieb nicht gefunden." }, { status: 404 });
  }

  // Count current numbers for Nummernkreise display
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

  return NextResponse.json({
    ...tenant,
    _nummernkreise: {
      angebote: { anzahl: angeboteCount, letzteNummer: letzteAngebotNr?.nummer ?? null },
      rechnungen: { anzahl: rechnungenCount, letzteNummer: letzteRechnungNr?.nummer ?? null },
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = einstellungenSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Ungültige Eingabe.", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { angebotPraefix: _angebotPraefix, rechnungPraefix: _rechnungPraefix, ...tenantData } = result.data;

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(tenantData.name !== undefined && { name: tenantData.name }),
      ...(tenantData.adresse !== undefined && { adresse: tenantData.adresse }),
      ...(tenantData.steuernummer !== undefined && { steuernummer: tenantData.steuernummer }),
      ...(tenantData.ustId !== undefined && { ustId: tenantData.ustId }),
      ...(tenantData.logo !== undefined && { logo: tenantData.logo }),
      ...(tenantData.bankName !== undefined && { bankName: tenantData.bankName }),
      ...(tenantData.bankIban !== undefined && { bankIban: tenantData.bankIban }),
      ...(tenantData.bankBic !== undefined && { bankBic: tenantData.bankBic }),
      ...(tenantData.emailConfig !== undefined && {
        emailConfig: tenantData.emailConfig ?? undefined,
      }),
      ...(tenantData.ustSatz !== undefined && { ustSatz: tenantData.ustSatz }),
      ...(tenantData.land !== undefined && { land: tenantData.land }),
      ...(tenantData.waehrung !== undefined && { waehrung: tenantData.waehrung }),
      ...(tenantData.sprache !== undefined && { sprache: tenantData.sprache }),
    },
  });

  return NextResponse.json(updated);
}
