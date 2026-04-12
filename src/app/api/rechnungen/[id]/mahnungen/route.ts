/**
 * POST /api/rechnungen/[id]/mahnungen — Mahnung für eine Rechnung erstellen
 * GET  /api/rechnungen/[id]/mahnungen — Mahnhistorie abrufen
 *
 * GoBD-konform: Mahnungen können nicht gelöscht oder geändert werden.
 * Spec: docs/specs/mahnwesen.md
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  berechneVerzugstage,
  berechneVerzugszinsen,
  istMahnstufeZulaessig,
  MAHNSTUFE_GEBUEHR,
  MAHNSTUFE_TAGE,
  mahnstufeZuRechnungStatus,
} from "@/lib/mahnwesen/mahnstufen";
import { erstelleMahnEmail, berechneNeueFrist } from "@/lib/mahnwesen/templates";
import { sendMail } from "@/lib/email/mailer";
import type { Mahnstufe } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

const ERLAUBTE_QUELL_STATI = new Set([
  "GESENDET",
  "UEBERFAELLIG",
  "ERINNERUNG",
  "MAHNUNG_1",
  "MAHNUNG_2",
]);

const mahnungCreateSchema = z.object({
  stufe: z.enum(["ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2", "INKASSO"]),
  notizen: z.string().optional(),
  emailVersenden: z.boolean().default(true),
});

/** GET /api/rechnungen/[id]/mahnungen */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;

  const rechnung = await prisma.rechnung.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!rechnung) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  const mahnungen = await prisma.mahnung.findMany({
    where: { rechnungId: id, tenantId: session.user.tenantId },
    orderBy: { gesendetAm: "asc" },
  });

  return NextResponse.json(mahnungen);
}

/** POST /api/rechnungen/[id]/mahnungen */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = session.user.tenantId;

  const body = await req.json();
  const result = mahnungCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { stufe, notizen, emailVersenden } = result.data;

  const rechnung = await prisma.rechnung.findFirst({
    where: { id, tenantId },
    include: {
      kunde: { select: { name: true, email: true } },
      mahnungen: { where: { storniert: false }, orderBy: { gesendetAm: "desc" }, take: 1 },
    },
  });

  if (!rechnung) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  // Statusprüfung: Nur bei offenen, überfälligen oder bereits gemahnten Rechnungen
  if (!ERLAUBTE_QUELL_STATI.has(rechnung.status)) {
    return NextResponse.json(
      {
        error: `Mahnung nicht möglich. Rechnungsstatus '${rechnung.status}' erlaubt keine Mahnung.`,
        code: "INVALID_STATUS",
      },
      { status: 422 }
    );
  }

  // Stufenprüfung: Keine Rückstufung erlaubt
  const hoechsteBisherigeStufe = rechnung.mahnungen[0]?.mahnstufe ?? null;
  if (!istMahnstufeZulaessig(stufe as Mahnstufe, hoechsteBisherigeStufe)) {
    return NextResponse.json(
      {
        error: `Rückstufung von '${hoechsteBisherigeStufe}' auf '${stufe}' ist nicht zulässig.`,
        code: "INVALID_STUFE",
      },
      { status: 422 }
    );
  }

  // Fälligkeitsprüfung
  if (!rechnung.zahlungsziel) {
    return NextResponse.json(
      { error: "Rechnung hat kein Zahlungsziel.", code: "NO_ZAHLUNGSZIEL" },
      { status: 422 }
    );
  }

  const verzugstage = berechneVerzugstage(rechnung.zahlungsziel);
  const mindestVerzugstage = MAHNSTUFE_TAGE[stufe as Mahnstufe];

  if (verzugstage < mindestVerzugstage) {
    return NextResponse.json(
      {
        error: `Mahnstufe '${stufe}' erst ab ${mindestVerzugstage} Verzugstagen möglich. Aktuell: ${verzugstage} Tage.`,
        code: "TOO_EARLY",
        verzugstage,
        mindestVerzugstage,
      },
      { status: 422 }
    );
  }

  const offenerBetrag = Number(rechnung.brutto);
  const mahngebuehr = MAHNSTUFE_GEBUEHR[stufe as Mahnstufe];
  const verzugszinsen = stufe !== "ERINNERUNG" ? berechneVerzugszinsen(offenerBetrag, verzugstage) : 0;

  // Tenant-Daten für E-Mail
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, bankIban: true },
  });

  // Mahnung erstellen + Rechnungsstatus aktualisieren (atomare Transaktion)
  const [mahnung] = await prisma.$transaction([
    prisma.mahnung.create({
      data: {
        rechnungId: id,
        tenantId,
        mahnstufe: stufe as Mahnstufe,
        offenerBetrag,
        mahngebuehr,
        verzugszinsen,
        verzugstage,
        emailGesendetAn: emailVersenden ? (rechnung.kunde.email ?? undefined) : undefined,
        notizen,
      },
    }),
    prisma.rechnung.update({
      where: { id },
      data: {
        status: mahnstufeZuRechnungStatus(stufe as Mahnstufe),
        historie: {
          create: {
            quelle: "system",
            wasGeaendert: `Mahnstufe ${stufe} erstellt`,
            neuerWert: `Verzugstage: ${verzugstage}, Mahngebühr: ${mahngebuehr.toFixed(2)} EUR`,
          },
        },
      },
    }),
  ]);

  // E-Mail versenden (nicht-blockierend für die Response)
  if (emailVersenden && rechnung.kunde.email) {
    const rechnungsdatum = rechnung.createdAt.toLocaleDateString("de-DE");
    const zahlungsziel = rechnung.zahlungsziel.toLocaleDateString("de-DE");
    const neueFrist = berechneNeueFrist(rechnung.zahlungsziel, MAHNSTUFE_TAGE[stufe as Mahnstufe]);
    const gesamtbetrag = (offenerBetrag + mahngebuehr + verzugszinsen).toFixed(2).replace(".", ",") + " EUR";

    const email = erstelleMahnEmail(stufe as Mahnstufe, {
      kundenname: rechnung.kunde.name,
      nummer: rechnung.nummer,
      rechnungsdatum,
      zahlungsziel,
      brutto: offenerBetrag.toFixed(2).replace(".", ",") + " EUR",
      tenantname: tenant?.name ?? "Ihr Auftragnehmer",
      iban: tenant?.bankIban ?? undefined,
      neue_frist_datum: neueFrist,
      inkasso_datum: berechneNeueFrist(rechnung.zahlungsziel, MAHNSTUFE_TAGE.INKASSO),
      mahngebuehr: mahngebuehr.toFixed(2).replace(".", ",") + " EUR",
      verzugszinsen: verzugszinsen.toFixed(2).replace(".", ",") + " EUR",
      schadenspauschale: "40,00 EUR",
      gesamtbetrag,
    });

    sendMail({
      to: rechnung.kunde.email,
      subject: email.betreff,
      html: email.html,
    }).catch((err: unknown) => {
      console.error("[Mahnwesen] E-Mail-Versand fehlgeschlagen:", err);
    });
  }

  return NextResponse.json(mahnung, { status: 201 });
}
