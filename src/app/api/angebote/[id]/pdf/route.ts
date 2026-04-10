import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { AngebotPdfDocument } from "@/components/angebote/pdf-template";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/angebote/[id]/pdf — Angebot als PDF herunterladen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
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

  const pdfBuffer = await renderToBuffer(
    AngebotPdfDocument({
      tenant,
      kunde: angebot.kunde,
      nummer: angebot.nummer,
      createdAt: angebot.createdAt.toISOString(),
      gueltigBis: angebot.gueltigBis?.toISOString() ?? null,
      netto: angebot.netto,
      ust: angebot.ust,
      brutto: angebot.brutto,
      positionen: angebot.positionen,
    })
  );

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Angebot-${angebot.nummer}.pdf"`,
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
