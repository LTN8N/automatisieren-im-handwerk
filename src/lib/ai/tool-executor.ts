import { prisma } from "@/lib/db";
import { getTenantDb } from "@/lib/db";
import { naechsteNummer } from "@/lib/angebote/nummernkreis";
import { berechnePosition, berechneDokumentSummen } from "@/lib/angebote/berechnung";
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

/**
 * Fuehrt ein Tool gegen die Datenbank aus und gibt das Ergebnis als String zurueck.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  tenantId: string
): Promise<string> {
  const db = getTenantDb(tenantId);

  switch (toolName) {
    case "kunde_suchen": {
      const suchbegriff = args.suchbegriff as string;
      const kunden = await db.kunde.findMany({
        where: { name: { contains: suchbegriff, mode: "insensitive" } },
        take: 5,
        select: { id: true, name: true, email: true, telefon: true, adresse: true },
      });
      if (kunden.length === 0) return `Kein Kunde mit "${suchbegriff}" gefunden.`;
      return JSON.stringify(kunden);
    }

    case "angebot_erstellen": {
      const kundeId = args.kundeId as string;
      const positionen = (args.positionen as Array<{
        beschreibung: string; menge: number; einheit: string; einzelpreis: number; ustSatz?: number;
      }>) || [];

      const kunde = await db.kunde.findFirst({ where: { id: kundeId } });
      if (!kunde) return "Fehler: Kunde nicht gefunden.";

      if (positionen.length === 0) {
        return "Fehler: Mindestens eine Position wird benoetigt. Frage den Nutzer nach Beschreibung, Menge, Einheit und Preis.";
      }

      // Tenant USt-Satz als Default
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const defaultUstSatz = Number(tenant?.ustSatz ?? 19);

      const berechnete = positionen.map((p, idx) => {
        const ustSatz = p.ustSatz ?? defaultUstSatz;
        const ergebnis = berechnePosition({ menge: p.menge, einzelpreis: p.einzelpreis, ustSatz });
        return {
          beschreibung: p.beschreibung,
          menge: p.menge,
          einheit: p.einheit || "Stk",
          einzelpreis: p.einzelpreis,
          gesamtpreis: ergebnis.gesamtpreis,
          ustSatz,
          ustBetrag: ergebnis.ustBetrag,
          sortierung: idx,
        };
      });

      const summen = berechneDokumentSummen(berechnete);
      const nummer = await naechsteNummer(tenantId, "ANGEBOT");
      const gueltigBis = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const angebot = await db.angebot.create({
        data: {
          tenantId,
          kundeId,
          nummer,
          status: "ENTWURF",
          netto: summen.netto,
          ust: summen.ust,
          brutto: summen.brutto,
          gueltigBis,
          positionen: { create: berechnete },
        },
        include: { kunde: { select: { name: true } } },
      });

      return `Angebot ${angebot.nummer} fuer ${angebot.kunde.name} erstellt. Netto: ${summen.netto.toFixed(2)} EUR, Brutto: ${summen.brutto.toFixed(2)} EUR. Status: Entwurf.`;
    }

    case "uebersicht_abrufen": {
      const typ = args.typ as string;
      const limit = Math.min((args.limit as number) || 10, 20);

      if (typ === "kunden") {
        const kunden = await db.kunde.findMany({ take: limit, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } });
        return kunden.length === 0 ? "Keine Kunden vorhanden." : JSON.stringify(kunden);
      }
      if (typ === "angebote") {
        const status = args.status as string | undefined;
        const where: Record<string, unknown> = { archiviertAm: null };
        if (status) where.status = status;
        const angebote = await db.angebot.findMany({
          where, take: limit, orderBy: { createdAt: "desc" },
          include: { kunde: { select: { name: true } } },
        });
        return angebote.length === 0 ? "Keine Angebote gefunden." : JSON.stringify(angebote.map(a => ({
          id: a.id, nummer: a.nummer, status: a.status, kunde: a.kunde.name, brutto: Number(a.brutto),
        })));
      }
      if (typ === "rechnungen") {
        const status = args.status as string | undefined;
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        const rechnungen = await db.rechnung.findMany({
          where, take: limit, orderBy: { createdAt: "desc" },
          include: { kunde: { select: { name: true } } },
        });
        return rechnungen.length === 0 ? "Keine Rechnungen gefunden." : JSON.stringify(rechnungen.map(r => ({
          id: r.id, nummer: r.nummer, status: r.status, kunde: r.kunde.name, brutto: Number(r.brutto),
        })));
      }
      return "Unbekannter Typ. Verwende: angebote, rechnungen oder kunden.";
    }

    case "status_abfragen": {
      const typ = args.typ as string;
      const dokumentId = args.dokumentId as string;

      if (typ === "angebot") {
        const a = await db.angebot.findFirst({
          where: { id: dokumentId },
          include: { kunde: { select: { name: true } }, positionen: true },
        });
        if (!a) return "Angebot nicht gefunden.";
        return `Angebot ${a.nummer} fuer ${a.kunde.name}: Status ${a.status}, Brutto ${Number(a.brutto).toFixed(2)} EUR, ${a.positionen.length} Positionen.`;
      }
      if (typ === "rechnung") {
        const r = await db.rechnung.findFirst({
          where: { id: dokumentId },
          include: { kunde: { select: { name: true } } },
        });
        if (!r) return "Rechnung nicht gefunden.";
        return `Rechnung ${r.nummer} fuer ${r.kunde.name}: Status ${r.status}, Brutto ${Number(r.brutto).toFixed(2)} EUR.`;
      }
      return "Unbekannter Typ.";
    }

    case "rechnung_erstellen": {
      const kundeId = args.kundeId as string;
      const angebotId = args.angebotId as string | undefined;
      const faelligkeitTage = (args.faelligkeitTage as number) || 14;

      const kunde = await db.kunde.findFirst({ where: { id: kundeId } });
      if (!kunde) return "Fehler: Kunde nicht gefunden.";

      if (angebotId) {
        // Aus Angebot erstellen
        const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:4000"}/api/rechnungen/${angebotId}/aus-angebot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zahlungszielTage: faelligkeitTage }),
        });
        if (!res.ok) {
          const err = await res.json();
          return `Fehler: ${err.error}`;
        }
        const rechnung = await res.json();
        return `Rechnung ${rechnung.nummer} aus Angebot erstellt. Brutto: ${Number(rechnung.brutto).toFixed(2)} EUR.`;
      }

      const positionen = (args.positionen as Array<{
        beschreibung: string; menge: number; einheit: string; einzelpreis: number;
      }>) || [];

      if (positionen.length === 0) {
        return "Fehler: Ohne Angebots-ID brauche ich Positionen. Frage nach Beschreibung, Menge, Einheit und Preis.";
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const defaultUstSatz = Number(tenant?.ustSatz ?? 19);

      const berechnete = positionen.map((p, idx) => {
        const ergebnis = berechnePosition({ menge: p.menge, einzelpreis: p.einzelpreis, ustSatz: defaultUstSatz });
        return {
          beschreibung: p.beschreibung,
          menge: p.menge,
          einheit: p.einheit || "Stk",
          einzelpreis: p.einzelpreis,
          gesamtpreis: ergebnis.gesamtpreis,
          ustSatz: defaultUstSatz,
          ustBetrag: ergebnis.ustBetrag,
          sortierung: idx,
        };
      });

      const summen = berechneDokumentSummen(berechnete);
      const nummer = await naechsteNummer(tenantId, "RECHNUNG");
      const zahlungsziel = new Date();
      zahlungsziel.setDate(zahlungsziel.getDate() + faelligkeitTage);

      const rechnung = await db.rechnung.create({
        data: {
          tenantId,
          kundeId,
          nummer,
          netto: summen.netto,
          ust: summen.ust,
          brutto: summen.brutto,
          zahlungsziel,
          positionen: { create: berechnete },
          historie: { create: { quelle: "chat", wasGeaendert: "Rechnung erstellt", neuerWert: `Netto: ${summen.netto.toFixed(2)} EUR` } },
        },
        include: { kunde: { select: { name: true } } },
      });

      return `Rechnung ${rechnung.nummer} fuer ${rechnung.kunde.name} erstellt. Brutto: ${summen.brutto.toFixed(2)} EUR. Zahlungsziel: ${faelligkeitTage} Tage.`;
    }

    case "ueberfaellige_rechnungen_liste": {
      const limit = Math.min((args.limit as number) || 10, 20);
      const rechnungen = await db.rechnung.findMany({
        where: {
          status: "GESENDET",
          zahlungsziel: { lt: new Date() },
        },
        take: limit,
        orderBy: { zahlungsziel: "asc" },
        include: { kunde: { select: { name: true } } },
      });
      if (rechnungen.length === 0) return "Keine ueberfaelligen Rechnungen.";
      return JSON.stringify(rechnungen.map(r => ({
        nummer: r.nummer,
        kunde: r.kunde.name,
        brutto: Number(r.brutto),
        faelligSeit: r.zahlungsziel?.toISOString().split("T")[0],
      })));
    }

    case "angebot_zu_rechnung": {
      if (!args.bestaetigt) return "Aktion abgebrochen — keine Bestaetigung.";
      const angebotId = args.angebotId as string;
      const a = await db.angebot.findFirst({ where: { id: angebotId } });
      if (!a) return "Angebot nicht gefunden.";
      if (a.status !== "ANGENOMMEN") return `Nur angenommene Angebote koennen umgewandelt werden. Status: ${a.status}`;

      const nummer = await naechsteNummer(tenantId, "RECHNUNG");
      const zahlungsziel = new Date();
      zahlungsziel.setDate(zahlungsziel.getDate() + 14);

      const positionen = await prisma.angebotPosition.findMany({ where: { angebotId } });

      await db.rechnung.create({
        data: {
          tenantId,
          kundeId: a.kundeId,
          angebotId,
          nummer,
          netto: Number(a.netto),
          ust: Number(a.ust),
          brutto: Number(a.brutto),
          zahlungsziel,
          positionen: {
            create: positionen.map(p => ({
              beschreibung: p.beschreibung,
              menge: Number(p.menge),
              einheit: p.einheit,
              einzelpreis: Number(p.einzelpreis),
              gesamtpreis: Number(p.gesamtpreis),
              ustSatz: Number(p.ustSatz),
              ustBetrag: Number(p.ustBetrag),
              sortierung: p.sortierung,
            })),
          },
        },
      });

      return `Angebot in Rechnung ${nummer} umgewandelt. Brutto: ${Number(a.brutto).toFixed(2)} EUR.`;
    }

    case "dokument_versenden": {
      if (!args.bestaetigt) return "Aktion abgebrochen — keine Bestaetigung.";
      return "E-Mail-Versand ist in der Testumgebung deaktiviert. Im Produktivbetrieb wird das Dokument per E-Mail versendet.";
    }

    case "zahlungserinnerung_senden": {
      if (!args.bestaetigt) return "Bitte bestaetigen Sie, dass die Mahnung versendet werden soll.";

      const ERLAUBTE_QUELL_STATI = new Set([
        "GESENDET", "UEBERFAELLIG", "ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2",
      ]);

      let rechnungId = args.rechnungId as string | undefined;

      // Rechnung per Kundenname suchen, wenn keine ID angegeben
      if (!rechnungId && args.kundeName) {
        const kundeName = args.kundeName as string;
        const kunden = await db.kunde.findMany({
          where: { name: { contains: kundeName, mode: "insensitive" } },
          take: 1,
          select: { id: true },
        });
        if (kunden.length === 0) return `Kein Kunde mit Namen "${kundeName}" gefunden.`;

        const offeneRechnungen = await db.rechnung.findMany({
          where: {
            kundeId: kunden[0].id,
            status: { in: Array.from(ERLAUBTE_QUELL_STATI) as never[] },
          },
          orderBy: { zahlungsziel: "asc" },
          take: 1,
          select: { id: true, nummer: true },
        });
        if (offeneRechnungen.length === 0) return `Keine offene überfällige Rechnung für "${kundeName}" gefunden.`;
        rechnungId = offeneRechnungen[0].id;
      }

      if (!rechnungId) return "Fehler: Rechnungs-ID oder Kundenname erforderlich.";

      const rechnung = await db.rechnung.findFirst({
        where: { id: rechnungId },
        include: {
          kunde: { select: { name: true, email: true } },
          mahnungen: { where: { storniert: false }, orderBy: { gesendetAm: "desc" }, take: 1 },
        },
      });

      if (!rechnung) return "Rechnung nicht gefunden.";
      if (!ERLAUBTE_QUELL_STATI.has(rechnung.status)) {
        return `Mahnung nicht möglich. Rechnungsstatus ist '${rechnung.status}'.`;
      }
      if (!rechnung.zahlungsziel) return "Rechnung hat kein Zahlungsziel.";

      // Stufe ermitteln: explizit angegeben oder nächste fällige
      const naechsteStufenMap: Record<string, Mahnstufe> = {
        GESENDET: "ERINNERUNG", UEBERFAELLIG: "ERINNERUNG",
        ERINNERUNG: "MAHNUNG_1", MAHNUNG_1: "MAHNUNG_2", MAHNUNG_2: "INKASSO",
      };
      const hoechsteBisherige = rechnung.mahnungen[0]?.mahnstufe ?? null;
      const stufe = (args.stufe as Mahnstufe) ?? naechsteStufenMap[hoechsteBisherige ?? rechnung.status];

      if (!stufe) return "Keine weitere Mahnstufe möglich.";
      if (!istMahnstufeZulaessig(stufe, hoechsteBisherige)) {
        return `Rückstufung von '${hoechsteBisherige}' auf '${stufe}' nicht zulässig.`;
      }

      const verzugstage = berechneVerzugstage(rechnung.zahlungsziel);
      const offenerBetrag = Number(rechnung.brutto);
      const mahngebuehr = MAHNSTUFE_GEBUEHR[stufe];
      const verzugszinsen = stufe !== "ERINNERUNG" ? berechneVerzugszinsen(offenerBetrag, verzugstage) : 0;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, bankIban: true },
      });

      await prisma.$transaction([
        prisma.mahnung.create({
          data: {
            rechnungId,
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
          where: { id: rechnungId },
          data: {
            status: mahnstufeZuRechnungStatus(stufe),
            historie: {
              create: {
                quelle: "chat",
                wasGeaendert: `Mahnstufe ${stufe} via KI`,
                neuerWert: `Verzugstage: ${verzugstage}`,
              },
            },
          },
        }),
      ]);

      if (rechnung.kunde.email) {
        const email = erstelleMahnEmail(stufe, {
          kundenname: rechnung.kunde.name,
          nummer: rechnung.nummer,
          rechnungsdatum: rechnung.createdAt.toLocaleDateString("de-DE"),
          zahlungsziel: rechnung.zahlungsziel.toLocaleDateString("de-DE"),
          brutto: offenerBetrag.toFixed(2).replace(".", ",") + " EUR",
          tenantname: tenant?.name ?? "",
          iban: tenant?.bankIban ?? undefined,
          neue_frist_datum: berechneNeueFrist(rechnung.zahlungsziel, MAHNSTUFE_TAGE[stufe]),
          inkasso_datum: berechneNeueFrist(rechnung.zahlungsziel, 42),
          mahngebuehr: mahngebuehr.toFixed(2).replace(".", ",") + " EUR",
          verzugszinsen: verzugszinsen.toFixed(2).replace(".", ",") + " EUR",
          gesamtbetrag: (offenerBetrag + mahngebuehr + verzugszinsen).toFixed(2).replace(".", ",") + " EUR",
        });
        sendMail({ to: rechnung.kunde.email, subject: email.betreff, html: email.html }).catch(
          (err: unknown) => console.error("[KI-Tool] Mahnung E-Mail fehlgeschlagen:", err)
        );
        return `Mahnung (${stufe}) für ${rechnung.kunde.name}, Rechnung ${rechnung.nummer}, wurde erstellt und an ${rechnung.kunde.email} gesendet.`;
      }

      return `Mahnung (${stufe}) für ${rechnung.kunde.name}, Rechnung ${rechnung.nummer}, wurde erstellt. Kein E-Mail-Versand (keine E-Mail-Adresse hinterlegt).`;
    }

    default:
      return `Unbekanntes Tool: ${toolName}`;
  }
}
