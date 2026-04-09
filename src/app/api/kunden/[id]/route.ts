import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { kundeSchema } from "@/lib/validations/kunde";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const db = getTenantDb(session.user.tenantId);

  const kunde = await db.kunde.findFirst({
    where: { id },
    include: {
      _count: {
        select: {
          angebote: true,
          rechnungen: true,
        },
      },
    },
  });

  if (!kunde) {
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(kunde);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const db = getTenantDb(session.user.tenantId);

  const existing = await db.kunde.findFirst({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  }

  const body = await req.json();
  const result = kundeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const kunde = await db.kunde.update({
    where: { id },
    data: {
      name: result.data.name,
      adresse: result.data.adresse || null,
      email: result.data.email || null,
      telefon: result.data.telefon || null,
      notizen: result.data.notizen || null,
    },
  });

  return NextResponse.json(kunde);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const db = getTenantDb(session.user.tenantId);

  const kunde = await db.kunde.findFirst({
    where: { id },
    include: {
      _count: {
        select: {
          angebote: true,
          rechnungen: true,
        },
      },
    },
  });

  if (!kunde) {
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  }

  await db.kunde.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
