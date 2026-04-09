import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { kundeSchema } from "@/lib/validations/kunde";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const db = getTenantDb(session.user.tenantId);
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const perPage = Math.min(50, Math.max(10, Number(searchParams.get("perPage") ?? "10")));
  const sortBy = searchParams.get("sortBy") ?? "name";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const allowedSortFields = ["name", "email", "telefon", "createdAt"];
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : "name";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [kunden, total] = await Promise.all([
    db.kunde.findMany({
      where,
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: {
          select: {
            angebote: true,
            rechnungen: true,
          },
        },
      },
    }),
    db.kunde.count({ where }),
  ]);

  return NextResponse.json({
    kunden,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const db = getTenantDb(session.user.tenantId);
  const body = await req.json();
  const result = kundeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // tenantId wird automatisch durch getTenantDb() injiziert
  const kunde = await db.kunde.create({
    data: {
      name: result.data.name,
      adresse: result.data.adresse || null,
      email: result.data.email || null,
      telefon: result.data.telefon || null,
      notizen: result.data.notizen || null,
    } as Parameters<typeof db.kunde.create>[0]["data"],
  });

  return NextResponse.json(kunde, { status: 201 });
}
