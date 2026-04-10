import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { naechsteNummer } from "@/lib/angebote/nummernkreis";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/rechnungen/[id]/aus-angebot
 * Konvertiert ein angenommenes Angebot in eine Rechnung.
 * id = angebotId
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id: angebotId } = await params;
  const body = await req.json().catch(() => ({}));
  const zahlungszielTage = Number(body.zahlungszielTage ?? 14);

  const angebot = await prisma.angebot.findFirst({
    where: { id: angebotId, tenantId: session.user.tenantId },
    include: {
      positionen: { orderBy: { sortierung: "asc" } },
      kunde: { select: { id: true, name: true } },
    },
  });

  if (!angebot) {
    return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 });
  }

  if (angebot.status !== "ANGENOMMEN") {
    return NextResponse.json(
      {
        error: `Nur angenommene Angebote koennen in Rechnungen umgewandelt werden. Aktueller Status: ${angebot.status}`,
        code: "INVALID_STATUS",
      },
      { status: 422 }
    );
  }

  const nummer = await naechsteNummer(session.user.tenantId, "RECHNUNG");

  const zahlungsziel = new Date();
  zahlungsziel.setDate(zahlungsziel.getDate() + zahlungszielTage);

  const rechnung = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const neueRechnung = await tx.rechnung.create({
      data: {
        tenantId: session.user.tenantId,
        kundeId: angebot.kundeId,
        angebotId: angebot.id,
        nummer,
        status: "ENTWURF",
        netto: angebot.netto,
        ust: angebot.ust,
        brutto: angebot.brutto,
        zahlungsziel,
        positionen: {
          create: angebot.positionen.map((p: { beschreibung: string; menge: number; einheit: string; einzelpreis: number; gesamtpreis: number; ustSatz: number; ustBetrag: number; sortierung: number }) => ({
            beschreibung: p.beschreibung,
            menge: p.menge,
            einheit: p.einheit,
            einzelpreis: p.einzelpreis,
            gesamtpreis: p.gesamtpreis,
            sortierung: p.sortierung,
          })),
        },
      },
      include: {
        positionen: true,
        kunde: { select: { id: true, name: true } },
        angebot: { select: { id: true, nummer: true } },
      },
    });

    // Historieneintraege
    await tx.rechnungHistorie.create({
      data: {
        rechnungId: neueRechnung.id,
        quelle: "manuell",
        wasGeaendert: "erstellt",
        neuerWert: `Aus Angebot ${angebot.nummer} konvertiert`,
      },
    });

    await tx.angebotHistorie.create({
      data: {
        angebotId: angebot.id,
        quelle: "manuell",
        wasGeaendert: "konvertierung",
        alterWert: angebot.status,
        neuerWert: `In Rechnung ${nummer} umgewandelt`,
      },
    });

    return neueRechnung;
  });

  return NextResponse.json(rechnung, { status: 201 });
}
