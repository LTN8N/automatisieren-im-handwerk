/**
 * GET /api/rechnungen/faellig — Offene Rechnungen nach Fälligkeit gruppiert
 * Zeigt alle überfälligen Rechnungen mit aktueller Mahnstufe und Verzugstagen.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  berechneVerzugstage,
  ermittleFaelligeMahnstufe,
} from "@/lib/mahnwesen/mahnstufen";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  const rechnungen = await prisma.rechnung.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: {
        in: ["GESENDET", "UEBERFAELLIG", "ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2"],
      },
      zahlungsziel: { lt: heute },
      bezahltAm: null,
    },
    include: {
      kunde: { select: { id: true, name: true, email: true } },
      mahnungen: {
        where: { storniert: false },
        orderBy: { gesendetAm: "desc" },
        take: 1,
        select: { mahnstufe: true, gesendetAm: true },
      },
    },
    orderBy: { zahlungsziel: "asc" },
  });

  const angereichert = rechnungen.map((r) => {
    const verzugstage = berechneVerzugstage(r.zahlungsziel!);
    const faelligeStufe = ermittleFaelligeMahnstufe(verzugstage);
    const letzteMahnung = r.mahnungen[0] ?? null;

    return {
      id: r.id,
      nummer: r.nummer,
      status: r.status,
      brutto: r.brutto,
      zahlungsziel: r.zahlungsziel,
      verzugstage,
      faelligeStufe,
      letzteMahnungStufe: letzteMahnung?.mahnstufe ?? null,
      letzteMahnungAm: letzteMahnung?.gesendetAm ?? null,
      kunde: r.kunde,
    };
  });

  // Gruppierung nach Mahnstufe
  const gruppiert = {
    ohneErinnerung: angereichert.filter((r) => !r.letzteMahnungStufe && r.faelligeStufe !== null),
    erinnerung: angereichert.filter((r) => r.letzteMahnungStufe === "ERINNERUNG"),
    mahnung1: angereichert.filter((r) => r.letzteMahnungStufe === "MAHNUNG_1"),
    mahnung2: angereichert.filter((r) => r.letzteMahnungStufe === "MAHNUNG_2"),
    inkassoFaellig: angereichert.filter(
      (r) => r.faelligeStufe === "INKASSO" && r.letzteMahnungStufe !== "INKASSO"
    ),
  };

  return NextResponse.json({
    rechnungen: angereichert,
    gruppiert,
    gesamt: angereichert.length,
    gesamtbetrag: angereichert.reduce((sum, r) => sum + Number(r.brutto), 0),
  });
}
