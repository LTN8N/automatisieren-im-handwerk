import { prisma } from "@/lib/db";
import { getTenantDb } from "@/lib/db";
import type { AngebotStatus } from "@prisma/client";
import { naechsteNummer } from "@/lib/angebote/nummernkreis";
import { berechnePosition, berechneDokumentSummen } from "@/lib/angebote/berechnung";

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

    case "angebot_suchen": {
      const kundeName = args.kundeName as string | undefined;
      const stichwort = args.stichwort as string | undefined;
      const nurOffen = args.nurOffen as boolean | undefined;

      const offenStatusListe: AngebotStatus[] = ["ENTWURF", "GESENDET"];

      const angebote = await prisma.angebot.findMany({
        where: {
          tenantId,
          archiviertAm: null,
          ...(nurOffen ? { status: { in: offenStatusListe } } : {}),
          ...(kundeName
            ? { kunde: { name: { contains: kundeName, mode: "insensitive" } } }
            : {}),
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          kunde: { select: { id: true, name: true, email: true } },
          positionen: {
            select: { id: true, beschreibung: true, menge: true, einzelpreis: true, einheit: true },
          },
        },
      });

      const gefiltert = stichwort
        ? angebote.filter((a) => {
            const text = [
              a.nummer,
              a.kunde.name,
              ...a.positionen.map((p: { beschreibung: string }) => p.beschreibung),
            ].join(" ").toLowerCase();
            return text.includes(stichwort.toLowerCase());
          })
        : angebote;

      if (gefiltert.length === 0) return "Kein passendes Angebot gefunden.";
      return JSON.stringify(
        gefiltert.map((a) => ({
          id: a.id,
          nummer: a.nummer,
          status: a.status,
          kunde: a.kunde,
          netto: Number(a.netto),
          brutto: Number(a.brutto),
          positionen: a.positionen,
        }))
      );
    }

    case "position_hinzufuegen": {
      const angebotId = args.angebotId as string;
      const beschreibung = args.beschreibung as string;
      const menge = args.menge as number;
      const einheit = (args.einheit as string) || "Stk";
      const einzelpreis = args.einzelpreis as number;

      const angebot = await db.angebot.findFirst({
        where: { id: angebotId },
        include: { positionen: true },
      });
      if (!angebot) return "Angebot nicht gefunden.";

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const ustSatz = (args.ustSatz as number) ?? Number(tenant?.ustSatz ?? 19);

      const ergebnis = berechnePosition({ menge, einzelpreis, ustSatz });
      const sortierung = angebot.positionen.length;

      await prisma.angebotPosition.create({
        data: {
          angebotId,
          beschreibung,
          menge,
          einheit,
          einzelpreis,
          gesamtpreis: ergebnis.gesamtpreis,
          ustSatz,
          ustBetrag: ergebnis.ustBetrag,
          sortierung,
        },
      });

      // Summen neu berechnen
      const allePositionen = await prisma.angebotPosition.findMany({ where: { angebotId } });
      const summen = berechneDokumentSummen(
        allePositionen.map((p) => ({
          menge: Number(p.menge),
          einzelpreis: Number(p.einzelpreis),
          gesamtpreis: Number(p.gesamtpreis),
          ustSatz: Number(p.ustSatz),
          ustBetrag: Number(p.ustBetrag),
        }))
      );

      await db.angebot.update({
        where: { id: angebotId },
        data: { netto: summen.netto, ust: summen.ust, brutto: summen.brutto },
      });

      return `Position "${beschreibung}" (${menge} ${einheit} × ${einzelpreis.toFixed(2)} EUR) zum Angebot ${angebot.nummer} hinzugefuegt. Neues Brutto: ${summen.brutto.toFixed(2)} EUR.`;
    }

    case "position_aendern": {
      const angebotId = args.angebotId as string;
      const positionId = args.positionId as string;

      const angebot = await db.angebot.findFirst({ where: { id: angebotId } });
      if (!angebot) return "Angebot nicht gefunden.";

      const position = await prisma.angebotPosition.findFirst({ where: { id: positionId, angebotId } });
      if (!position) return "Position nicht gefunden.";

      const menge = (args.menge as number) ?? Number(position.menge);
      const einzelpreis = (args.einzelpreis as number) ?? Number(position.einzelpreis);
      const ustSatz = Number(position.ustSatz);
      const ergebnis = berechnePosition({ menge, einzelpreis, ustSatz });

      await prisma.angebotPosition.update({
        where: { id: positionId },
        data: {
          ...(args.beschreibung ? { beschreibung: args.beschreibung as string } : {}),
          ...(args.einheit ? { einheit: args.einheit as string } : {}),
          menge,
          einzelpreis,
          gesamtpreis: ergebnis.gesamtpreis,
          ustBetrag: ergebnis.ustBetrag,
        },
      });

      // Summen neu berechnen
      const allePositionen = await prisma.angebotPosition.findMany({ where: { angebotId } });
      const summen = berechneDokumentSummen(
        allePositionen.map((p) => ({
          menge: Number(p.menge),
          einzelpreis: Number(p.einzelpreis),
          gesamtpreis: Number(p.gesamtpreis),
          ustSatz: Number(p.ustSatz),
          ustBetrag: Number(p.ustBetrag),
        }))
      );

      await db.angebot.update({
        where: { id: angebotId },
        data: { netto: summen.netto, ust: summen.ust, brutto: summen.brutto },
      });

      return `Position geaendert. Angebot ${angebot.nummer} neues Brutto: ${summen.brutto.toFixed(2)} EUR.`;
    }

    case "position_loeschen": {
      if (!args.bestaetigt) return "Aktion abgebrochen — keine Bestaetigung.";

      const angebotId = args.angebotId as string;
      const positionId = args.positionId as string;

      const angebot = await db.angebot.findFirst({ where: { id: angebotId } });
      if (!angebot) return "Angebot nicht gefunden.";

      const position = await prisma.angebotPosition.findFirst({ where: { id: positionId, angebotId } });
      if (!position) return "Position nicht gefunden.";

      await prisma.angebotPosition.delete({ where: { id: positionId } });

      // Summen neu berechnen
      const allePositionen = await prisma.angebotPosition.findMany({ where: { angebotId } });
      const summen = berechneDokumentSummen(
        allePositionen.map((p) => ({
          menge: Number(p.menge),
          einzelpreis: Number(p.einzelpreis),
          gesamtpreis: Number(p.gesamtpreis),
          ustSatz: Number(p.ustSatz),
          ustBetrag: Number(p.ustBetrag),
        }))
      );

      await db.angebot.update({
        where: { id: angebotId },
        data: { netto: summen.netto, ust: summen.ust, brutto: summen.brutto },
      });

      return `Position "${position.beschreibung}" geloescht. Angebot ${angebot.nummer} neues Brutto: ${summen.brutto.toFixed(2)} EUR.`;
    }

    case "rechnung_status_aendern": {
      if (!args.bestaetigt) return "Aktion abgebrochen — keine Bestaetigung.";

      const rechnungId = args.rechnungId as string;
      const neuerStatus = args.neuerStatus as "BEZAHLT" | "STORNIERT";

      const rechnung = await db.rechnung.findFirst({ where: { id: rechnungId } });
      if (!rechnung) return "Rechnung nicht gefunden.";

      if (rechnung.gesperrt) return "Diese Rechnung ist gesperrt und kann nicht geaendert werden.";

      await db.rechnung.update({
        where: { id: rechnungId },
        data: {
          status: neuerStatus === "BEZAHLT" ? "BEZAHLT" : "ENTWURF",
          ...(neuerStatus === "BEZAHLT" ? { bezahltAm: new Date() } : {}),
        },
      });

      if (neuerStatus === "BEZAHLT") {
        return `Rechnung ${rechnung.nummer} als bezahlt markiert.`;
      }
      return `Rechnung ${rechnung.nummer} storniert.`;
    }

    default:
      return `Unbekanntes Tool: ${toolName}`;
  }
}
