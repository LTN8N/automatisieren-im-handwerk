import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/angebote/[id]/versenden — Angebot per E-Mail verschicken */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;

  const angebot = await prisma.angebot.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      positionen: { orderBy: { sortierung: "asc" } },
      kunde: { select: { id: true, name: true, adresse: true, email: true } },
    },
  });

  if (!angebot) {
    return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 });
  }

  if (!angebot.kunde.email) {
    return NextResponse.json({ error: "Kunde hat keine E-Mail-Adresse hinterlegt." }, { status: 422 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      name: true,
      adresse: true,
      steuernummer: true,
      ustId: true,
      bankName: true,
      bankIban: true,
      bankBic: true,
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  // PDF generieren
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { AngebotPdfDocument } = await import("@/components/angebote/pdf-template");

  const pdfBuffer = await renderToBuffer(
    AngebotPdfDocument({
      tenant,
      kunde: angebot.kunde,
      nummer: angebot.nummer,
      createdAt: angebot.createdAt.toISOString(),
      gueltigBis: angebot.gueltigBis?.toISOString() ?? null,
      netto: Number(angebot.netto),
      ust: Number(angebot.ust),
      brutto: Number(angebot.brutto),
      positionen: angebot.positionen.map((p) => ({ ...p, menge: Number(p.menge), einzelpreis: Number(p.einzelpreis), gesamtpreis: Number(p.gesamtpreis), ustSatz: Number(p.ustSatz), ustBetrag: Number(p.ustBetrag) })),
    })
  );

  // E-Mail versenden
  const { messageId } = await sendMail({
    to: angebot.kunde.email,
    subject: `Angebot ${angebot.nummer} von ${tenant.name}`,
    html: `
      <p>Sehr geehrte Damen und Herren,</p>
      <p>anbei erhalten Sie unser Angebot <strong>${angebot.nummer}</strong>.</p>
      ${angebot.gueltigBis ? `<p>Das Angebot ist gültig bis zum ${new Date(angebot.gueltigBis).toLocaleDateString("de-DE")}.</p>` : ""}
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      <p>Mit freundlichen Grüßen<br>${tenant.name}</p>
    `,
    attachments: [
      {
        filename: `Angebot-${angebot.nummer}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: "application/pdf",
      },
    ],
  });

  // Status auf GESENDET setzen (falls noch ENTWURF)
  if (angebot.status === "ENTWURF") {
    await prisma.angebot.update({
      where: { id },
      data: {
        status: "GESENDET",
        historie: {
          create: {
            quelle: "manuell",
            wasGeaendert: "status",
            alterWert: "ENTWURF",
            neuerWert: "GESENDET",
          },
        },
      },
    });
  }

  // Versand in Historie tracken
  await prisma.angebotHistorie.create({
    data: {
      angebotId: id,
      quelle: "manuell",
      wasGeaendert: "email_versandt",
      neuerWert: angebot.kunde.email,
    },
  });

  return NextResponse.json({ success: true, messageId, to: angebot.kunde.email });
}
