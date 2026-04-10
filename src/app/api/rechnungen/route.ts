import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantDb, prisma } from "@/lib/db";
import { naechsteNummer } from "@/lib/angebote/nummernkreis";
import { berechnePosition, berechneDokumentSummen } from "@/lib/angebote/berechnung";
import { z } from "zod";

const rechnungCreateSchema = z.object({
  kundeId: z.string().min(1, "Kunde ist erforderlich"),
  zahlungszielTage: z.number().int().min(1).max(365).default(14),
  positionen: z
    .array(
      z.object({
        beschreibung: z.string().min(1),
        menge: z.number().positive(),
        einheit: z.string().default("Stk"),
        einzelpreis: z.number().min(0),
        ustSatz: z.number().min(0).max(100).optional(),
      })
    )
    .min(1, "Mindestens eine Position erforderlich"),
});

/** GET /api/rechnungen — Liste mit Filter, Suche, Pagination */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Nicht angemeldet", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const db = getTenantDb(session.user.tenantId);
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const perPage = Math.min(50, Math.max(10, Number(searchParams.get("perPage") ?? "10")));

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { nummer: { contains: search, mode: "insensitive" } },
      { kunde: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status && status !== "ALLE") {
    where.status = status;
  }

  const [rechnungen, total] = await Promise.all([
    db.rechnung.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        kunde: { select: { id: true, name: true } },
        positionen: true,
      },
    }),
    db.rechnung.count({ where }),
  ]);

  return NextResponse.json({
    rechnungen,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
}

/** POST /api/rechnungen — Neue Rechnung erstellen */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Nicht angemeldet", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const tenantId = session.user.tenantId;
  const db = getTenantDb(tenantId);
  const body = await req.json();
  const result = rechnungCreateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validierungsfehler",
        code: "VALIDATION_ERROR",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { kundeId, zahlungszielTage, positionen } = result.data;

  const kunde = await db.kunde.findFirst({ where: { id: kundeId } });
  if (!kunde) {
    return NextResponse.json(
      { error: "Kunde nicht gefunden", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Tenant-USt-Satz als Default laden
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const defaultUstSatz = tenant?.ustSatz ?? 19;

  // Berechne Positionen mit korrektem USt-Satz (pro Position oder Tenant-Default)
  const berechnetePositionen = positionen.map((p, idx) => {
    const ustSatz = p.ustSatz ?? defaultUstSatz;
    const ergebnis = berechnePosition({ menge: p.menge, einzelpreis: p.einzelpreis, ustSatz });
    return {
      beschreibung: p.beschreibung,
      menge: p.menge,
      einheit: p.einheit,
      einzelpreis: p.einzelpreis,
      gesamtpreis: ergebnis.gesamtpreis,
      ustSatz,
      ustBetrag: ergebnis.ustBetrag,
      sortierung: idx,
    };
  });

  const summen = berechneDokumentSummen(berechnetePositionen);

  const zahlungsziel = new Date();
  zahlungsziel.setDate(zahlungsziel.getDate() + zahlungszielTage);

  const nummer = await naechsteNummer(tenantId, "RECHNUNG");

  // Tenant-scoped db.rechnung.create statt raw prisma
  const rechnung = await db.rechnung.create({
    data: {
      kundeId,
      nummer,
      netto: summen.netto,
      ust: summen.ust,
      brutto: summen.brutto,
      zahlungsziel,
      positionen: {
        create: berechnetePositionen,
      },
      historie: {
        create: {
          quelle: "system",
          wasGeaendert: "Rechnung erstellt",
          neuerWert: `Netto: ${summen.netto.toFixed(2)} EUR`,
        },
      },
    },
    include: {
      kunde: { select: { id: true, name: true } },
      positionen: true,
    },
  });

  return NextResponse.json(rechnung, { status: 201 });
}
