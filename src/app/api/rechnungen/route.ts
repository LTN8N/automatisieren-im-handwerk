import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantDb, prisma } from "@/lib/db";
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
      })
    )
    .min(1, "Mindestens eine Position erforderlich"),
});

/** Generiert die naechste Rechnungsnummer fuer den Tenant (RE-YYYY-NNNN) */
async function naechsteRechnungsnummer(tenantId: string): Promise<string> {
  const jahr = new Date().getFullYear();
  const prefix = `RE-${jahr}-`;

  const letzte = await prisma.rechnung.findFirst({
    where: { tenantId, nummer: { startsWith: prefix } },
    orderBy: { nummer: "desc" },
    select: { nummer: true },
  });

  const naechsteNr = letzte
    ? parseInt(letzte.nummer.split("-")[2] ?? "0", 10) + 1
    : 1;

  return `${prefix}${String(naechsteNr).padStart(4, "0")}`;
}

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

  const db = getTenantDb(session.user.tenantId);
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

  const positionenMitPreis = positionen.map((p, idx) => ({
    beschreibung: p.beschreibung,
    menge: p.menge,
    einheit: p.einheit,
    einzelpreis: p.einzelpreis,
    gesamtpreis: Math.round(p.menge * p.einzelpreis * 100) / 100,
    sortierung: idx,
  }));

  const netto = positionenMitPreis.reduce((s, p) => s + p.gesamtpreis, 0);
  const ust = Math.round(netto * 0.19 * 100) / 100;
  const brutto = Math.round((netto + ust) * 100) / 100;

  const zahlungsziel = new Date();
  zahlungsziel.setDate(zahlungsziel.getDate() + zahlungszielTage);

  const nummer = await naechsteRechnungsnummer(session.user.tenantId);

  const rechnung = await prisma.rechnung.create({
    data: {
      tenantId: session.user.tenantId,
      kundeId,
      nummer,
      netto,
      ust,
      brutto,
      zahlungsziel,
      positionen: {
        create: positionenMitPreis,
      },
      historie: {
        create: {
          quelle: "system",
          wasGeaendert: "Rechnung erstellt",
          neuerWert: `Netto: ${netto.toFixed(2)} EUR`,
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
