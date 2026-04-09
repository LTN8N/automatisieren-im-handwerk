import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, name, firmenname } = body;

  if (!email || !password || !name || !firmenname) {
    return NextResponse.json(
      { error: "Alle Felder sind erforderlich." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "E-Mail wird bereits verwendet." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: firmenname,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash,
      name,
      role: "ADMIN",
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
