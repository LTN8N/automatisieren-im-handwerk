/**
 * POST /api/admin/mahnlaeufer/run — Mahnläufer manuell auslösen
 *
 * Verarbeitet alle fälligen Rechnungen und erstellt automatisch Mahnungen,
 * sofern die Mahnstufe noch nicht erreicht wurde.
 *
 * Spec: docs/specs/mahnwesen.md Abschnitt 6.4
 * Auth: Nur für Tenant-Admin
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  berechneVerzugstage,
  berechneVerzugszinsen,
  ermittleFaelligeMahnstufe,
  MAHNSTUFE_GEBUEHR,
  MAHNSTUFE_TAGE,
  mahnstufeZuRechnungStatus,
} from "@/lib/mahnwesen/mahnstufen";
import { erstelleMahnEmail, berechneNeueFrist } from "@/lib/mahnwesen/templates";
import { sendMail } from "@/lib/email/mailer";
import type { Mahnstufe } from "@prisma/client";

const MAHNSTUFE_REIHENFOLGE: Mahnstufe[] = ["ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2", "INKASSO"];

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Admins dürfen den Mahnläufer ausführen." }, { status: 403 });
  }

  const tenantId = session.user.tenantId;
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  const rechnungen = await prisma.rechnung.findMany({
    where: {
      tenantId,
      status: { in: ["GESENDET", "UEBERFAELLIG", "ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2"] },
      zahlungsziel: { lt: heute },
      bezahltAm: null,
    },
    include: {
      kunde: { select: { name: true, email: true } },
      mahnungen: {
        where: { storniert: false },
        orderBy: { gesendetAm: "desc" },
        take: 1,
      },
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, bankIban: true },
  });

  let verarbeitet = 0;
  let gesendet = 0;
  const fehler: string[] = [];

  for (const rechnung of rechnungen) {
    verarbeitet++;

    try {
      const verzugstage = berechneVerzugstage(rechnung.zahlungsziel!);
      const faelligeStufe = ermittleFaelligeMahnstufe(verzugstage);

      if (!faelligeStufe) continue;

      const letzteStufe = rechnung.mahnungen[0]?.mahnstufe ?? null;
      const faelligIndex = MAHNSTUFE_REIHENFOLGE.indexOf(faelligeStufe);
      const letzterIndex = letzteStufe ? MAHNSTUFE_REIHENFOLGE.indexOf(letzteStufe) : -1;

      // Nur nächste Stufe erstellen, keine Sprünge im automatischen Lauf
      const naechsteIndex = letzterIndex + 1;
      if (naechsteIndex > faelligIndex) continue;

      const stufe = MAHNSTUFE_REIHENFOLGE[naechsteIndex];
      const offenerBetrag = Number(rechnung.brutto);
      const mahngebuehr = MAHNSTUFE_GEBUEHR[stufe];
      const verzugszinsen = stufe !== "ERINNERUNG" ? berechneVerzugszinsen(offenerBetrag, verzugstage) : 0;

      await prisma.$transaction([
        prisma.mahnung.create({
          data: {
            rechnungId: rechnung.id,
            tenantId,
            mahnstufe: stufe,
            offenerBetrag,
            mahngebuehr,
            verzugszinsen,
            verzugstage,
            emailGesendetAn: rechnung.kunde.email ?? undefined,
          },
        }),
        prisma.rechnung.update({
          where: { id: rechnung.id },
          data: {
            status: mahnstufeZuRechnungStatus(stufe),
            historie: {
              create: {
                quelle: "mahnlaeufer",
                wasGeaendert: `Automatische Mahnstufe ${stufe}`,
                neuerWert: `Verzugstage: ${verzugstage}`,
              },
            },
          },
        }),
      ]);

      // E-Mail asynchron
      if (rechnung.kunde.email) {
        const zahlungsziel = rechnung.zahlungsziel!.toLocaleDateString("de-DE");
        const email = erstelleMahnEmail(stufe, {
          kundenname: rechnung.kunde.name,
          nummer: rechnung.nummer,
          rechnungsdatum: rechnung.createdAt.toLocaleDateString("de-DE"),
          zahlungsziel,
          brutto: offenerBetrag.toFixed(2).replace(".", ",") + " EUR",
          tenantname: tenant?.name ?? "",
          iban: tenant?.bankIban ?? undefined,
          neue_frist_datum: berechneNeueFrist(rechnung.zahlungsziel!, MAHNSTUFE_TAGE[stufe]),
          inkasso_datum: berechneNeueFrist(rechnung.zahlungsziel!, 42),
          mahngebuehr: mahngebuehr.toFixed(2).replace(".", ",") + " EUR",
          verzugszinsen: verzugszinsen.toFixed(2).replace(".", ",") + " EUR",
          gesamtbetrag: (offenerBetrag + mahngebuehr + verzugszinsen).toFixed(2).replace(".", ",") + " EUR",
        });

        sendMail({ to: rechnung.kunde.email, subject: email.betreff, html: email.html }).catch(
          (err: unknown) => console.error("[Mahnläufer] E-Mail-Versand fehlgeschlagen:", err)
        );
      }

      gesendet++;
    } catch (err) {
      fehler.push(`Rechnung ${rechnung.nummer}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ verarbeitet, gesendet, fehler });
}
