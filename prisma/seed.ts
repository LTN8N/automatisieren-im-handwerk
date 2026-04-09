import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Demo-Tenant erstellen
  const tenant = await prisma.tenant.create({
    data: {
      name: "Mustermann Sanitaer GmbH",
      adresse: "Musterstrasse 1, 22045 Hamburg",
      steuernummer: "12/345/67890",
      ustId: "DE123456789",
      bankName: "Sparkasse Hamburg",
      bankIban: "DE89370400440532013000",
      bankBic: "COBADEFFXXX",
    },
  });

  // Demo-Benutzer erstellen
  const passwordHash = await hash("demo1234", 12);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "demo@handwerk.de",
      passwordHash,
      name: "Max Mustermann",
      role: "ADMIN",
    },
  });

  // Demo-Kunde erstellen
  await prisma.kunde.create({
    data: {
      tenantId: tenant.id,
      name: "Herr Mueller",
      adresse: "Beispielweg 5, 22041 Hamburg",
      email: "mueller@example.de",
      telefon: "040 1234567",
    },
  });

  console.log("Seed-Daten erfolgreich erstellt.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
