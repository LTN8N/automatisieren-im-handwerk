import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/rechnungen/[id]/pdf — Rechnung als PDF herunterladen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
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

  const uint8 = new Uint8Array(pdfBuffer);
  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Rechnung-${rechnung.nummer}.pdf"`,
      "Content-Length": String(uint8.byteLength),
    },
  });
}
