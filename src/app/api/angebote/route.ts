import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import { naechsteNummer } from "@/lib/angebote/nummernkreis"
import { berechnePosition, berechneDokumentSummen } from "@/lib/angebote/berechnung"

/** GET /api/angebote — Liste aller Angebote mit Filter, Suche, Pagination */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const suche = searchParams.get("suche")
  const seite = parseInt(searchParams.get("seite") || "1", 10)
  const proSeite = parseInt(searchParams.get("proSeite") || "10", 10)
  const sortierung = searchParams.get("sortierung") || "createdAt"
  const richtung = searchParams.get("richtung") === "asc" ? "asc" : "desc"

  const db = getTenantDb(tenantId)

  const where: Record<string, unknown> = {
    archiviertAm: null,
  }
  if (status && status !== "alle") {
    where.status = status
  }
  if (suche) {
    where.OR = [
      { nummer: { contains: suche, mode: "insensitive" } },
      { kunde: { name: { contains: suche, mode: "insensitive" } } },
    ]
  }

  const [angebote, gesamt] = await Promise.all([
    db.angebot.findMany({
      where,
      include: { kunde: { select: { id: true, name: true } } },
      orderBy: { [sortierung]: richtung },
      skip: (seite - 1) * proSeite,
      take: proSeite,
    }),
    db.angebot.count({ where }),
  ])

  return NextResponse.json({
    angebote,
    gesamt,
    seite,
    seiten: Math.ceil(gesamt / proSeite),
  })
}

/** POST /api/angebote — Neues Angebot erstellen */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const db = getTenantDb(tenantId)
  const body = await request.json()
  const { kundeId, gueltigBis, positionen } = body

  if (!kundeId) {
    return NextResponse.json({ error: "Kunde ist erforderlich." }, { status: 400 })
  }
  if (!positionen || positionen.length === 0) {
    return NextResponse.json({ error: "Mindestens eine Position erforderlich." }, { status: 400 })
  }

  // Kunde muss dem Tenant gehoeren (db ist tenant-scoped)
  const kunde = await db.kunde.findFirst({ where: { id: kundeId } })
  if (!kunde) {
    return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 })
  }

  const nummer = await naechsteNummer(tenantId, "ANGEBOT")

  // Berechne alle Positionen
  const berechnetePositionen = positionen.map(
    (p: { beschreibung: string; menge: number; einheit: string; einzelpreis: number; ustSatz: number; sortierung: number }) => {
      const ergebnis = berechnePosition({ menge: p.menge, einzelpreis: p.einzelpreis, ustSatz: p.ustSatz })
      return {
        beschreibung: p.beschreibung,
        menge: p.menge,
        einheit: p.einheit || "Stk",
        einzelpreis: p.einzelpreis,
        gesamtpreis: ergebnis.gesamtpreis,
        ustSatz: p.ustSatz,
        ustBetrag: ergebnis.ustBetrag,
        sortierung: p.sortierung ?? 0,
      }
    }
  )

  const summen = berechneDokumentSummen(berechnetePositionen)

  // Gültigkeitsdatum: Standard 30 Tage
  const gueltig = gueltigBis
    ? new Date(gueltigBis)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Tenant-scoped db.angebot.create
  const angebot = await db.angebot.create({
    data: {
      tenantId,
      kundeId,
      nummer,
      status: "ENTWURF",
      netto: summen.netto,
      ust: summen.ust,
      brutto: summen.brutto,
      gueltigBis: gueltig,
      positionen: {
        create: berechnetePositionen,
      },
    },
    include: {
      positionen: true,
      kunde: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(angebot, { status: 201 })
}
