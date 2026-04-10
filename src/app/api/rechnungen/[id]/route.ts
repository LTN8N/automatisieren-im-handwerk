import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

/** Erlaubte Statusuebergaenge nach RechnungStatus */
const ERLAUBTE_UEBERGAENGE: Record<string, string[]> = {
  ENTWURF: ["GESENDET"],
  GESENDET: ["BEZAHLT", "UEBERFAELLIG", "MAHNUNG"],
  UEBERFAELLIG: ["BEZAHLT", "MAHNUNG"],
  MAHNUNG: ["BEZAHLT"],
  BEZAHLT: [],
};

/** GET /api/rechnungen/[id] */
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
      historie: { orderBy: { createdAt: "desc" } },
      kunde: { select: { id: true, name: true, adresse: true, email: true } },
      angebot: { select: { id: true, nummer: true } },
    },
  });

  if (!rechnung) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(rechnung);
}

/** PATCH /api/rechnungen/[id] — Statusuebergang */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;
  const { status: neuerStatus } = await req.json();

  const rechnung = await prisma.rechnung.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!rechnung) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  // GoBD: Bezahlte Rechnungen koennen nicht mehr geaendert werden
  if (rechnung.status === "BEZAHLT") {
    return NextResponse.json(
      { error: "Bezahlte Rechnungen koennen nicht mehr geaendert werden (GoBD)." },
      { status: 422 }
    );
  }

  if (neuerStatus) {
    const erlaubt = ERLAUBTE_UEBERGAENGE[rechnung.status] ?? [];
    if (!erlaubt.includes(neuerStatus)) {
      return NextResponse.json(
        { error: `Statusuebergang von ${rechnung.status} nach ${neuerStatus} ist nicht erlaubt.` },
        { status: 400 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (neuerStatus) updateData.status = neuerStatus;
  if (neuerStatus === "BEZAHLT") updateData.bezahltAm = new Date();

  const aktualisiert = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (neuerStatus) {
      await tx.rechnungHistorie.create({
        data: {
          rechnungId: id,
          quelle: "manuell",
          wasGeaendert: "status",
          alterWert: rechnung.status,
          neuerWert: neuerStatus,
        },
      });
    }

    return tx.rechnung.update({
      where: { id },
      data: updateData,
      include: {
        positionen: { orderBy: { sortierung: "asc" } },
        kunde: { select: { id: true, name: true } },
      },
    });
  });

  return NextResponse.json(aktualisiert);
}

/** DELETE /api/rechnungen/[id] — Nur Entwuerfe koennen geloescht werden (GoBD) */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;

  const rechnung = await prisma.rechnung.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!rechnung) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  if (rechnung.status !== "ENTWURF") {
    return NextResponse.json(
      {
        error:
          "Nur Entwuerfe koennen geloescht werden. Gesendete Rechnungen muessen storniert werden (GoBD).",
        code: "GOBD_LOCKED",
      },
      { status: 422 }
    );
  }

  await prisma.rechnung.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
