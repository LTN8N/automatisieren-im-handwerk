import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/rechnungen/[id]/versenden — Rechnung per E-Mail verschicken */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;

  const rechnung = await prisma.rechnung.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      positionen: { orderBy: { sortierung: "asc" } },
      kunde: { select: { id: true, name: true, adresse: true, email: true } },
      angebot: { select: { id: true, nummer: true } },
    },
  });

  if (!rechnung) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  if (!rechnung.kunde.email) {
    return NextResponse.json({ error: "Kunde hat keine E-Mail-Adresse hinterlegt." }, { status: 422 });
  }

  // GoBD: Gesperrte (bereits gesendete) Rechnungen dürfen nochmals gesendet werden,
  // aber der Status darf nicht zurückgesetzt werden.
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
  const { RechnungPdfDocument } = await import("@/components/rechnungen/pdf-template");

  const pdfBuffer = await renderToBuffer(
    RechnungPdfDocument({
      tenant,
      kunde: rechnung.kunde,
      nummer: rechnung.nummer,
      createdAt: rechnung.createdAt.toISOString(),
      zahlungsziel: rechnung.zahlungsziel?.toISOString() ?? null,
      netto: Number(rechnung.netto),
      ust: Number(rechnung.ust),
      brutto: Number(rechnung.brutto),
      positionen: rechnung.positionen.map((p) => ({ ...p, menge: Number(p.menge), einzelpreis: Number(p.einzelpreis), gesamtpreis: Number(p.gesamtpreis), ustSatz: Number(p.ustSatz), ustBetrag: Number(p.ustBetrag) })),
      angebotNummer: rechnung.angebot?.nummer ?? null,
    })
  );

  const zahlungszielText = rechnung.zahlungsziel
    ? `<p>Bitte überweisen Sie den Betrag bis zum <strong>${new Date(rechnung.zahlungsziel).toLocaleDateString("de-DE")}</strong> auf unser Konto.</p>`
    : "<p>Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.</p>";

  // E-Mail versenden
  const { messageId } = await sendMail({
    to: rechnung.kunde.email,
    subject: `Rechnung ${rechnung.nummer} von ${tenant.name}`,
    html: `
      <p>Sehr geehrte Damen und Herren,</p>
      <p>anbei erhalten Sie unsere Rechnung <strong>${rechnung.nummer}</strong> über <strong>${Number(rechnung.brutto).toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR</strong>.</p>
      ${zahlungszielText}
      ${tenant.bankIban ? `<p>IBAN: ${tenant.bankIban}${tenant.bankBic ? ` | BIC: ${tenant.bankBic}` : ""}${tenant.bankName ? ` | Bank: ${tenant.bankName}` : ""}</p>` : ""}
      <p>Verwendungszweck: ${rechnung.nummer}</p>
      <p>Mit freundlichen Grüßen<br>${tenant.name}</p>
    `,
    attachments: [
      {
        filename: `Rechnung-${rechnung.nummer}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: "application/pdf",
      },
    ],
  });

  // Status auf GESENDET setzen und Rechnung sperren (GoBD)
  if (rechnung.status === "ENTWURF") {
    await prisma.rechnung.update({
      where: { id },
      data: {
        status: "GESENDET",
        gesperrt: true,
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
  await prisma.rechnungHistorie.create({
    data: {
      rechnungId: id,
      quelle: "manuell",
      wasGeaendert: "email_versandt",
      neuerWert: rechnung.kunde.email,
    },
  });

  return NextResponse.json({ success: true, messageId, to: rechnung.kunde.email });
}
