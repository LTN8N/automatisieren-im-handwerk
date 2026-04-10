import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { berechnePosition, berechneDokumentSummen } from "@/lib/angebote/berechnung"

type RouteParams = { params: Promise<{ id: string }> }

/** Erlaubte Statusübergänge */
const ERLAUBTE_UEBERGAENGE: Record<string, string[]> = {
  ENTWURF: ["GESENDET"],
  GESENDET: ["ANGENOMMEN", "ABGELEHNT"],
  ANGENOMMEN: [],
  ABGELEHNT: [],
}

/** GET /api/angebote/[id] — Einzelnes Angebot mit Positionen und Historie */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  const tenantId = (session?.user as { tenantId?: string })?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params

  const angebot = await prisma.angebot.findFirst({
    where: { id, tenantId },
    include: {
      positionen: { orderBy: { sortierung: "asc" } },
      historie: { orderBy: { createdAt: "desc" } },
      kunde: { select: { id: true, name: true, adresse: true, email: true } },
    },
  })

  if (!angebot) {
    return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 })
  }

  return NextResponse.json(angebot)
}

/** PUT /api/angebote/[id] — Angebot aktualisieren */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  const tenantId = (session?.user as { tenantId?: string })?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const bestehendes = await prisma.angebot.findFirst({
    where: { id, tenantId },
    include: { positionen: true },
  })

  if (!bestehendes) {
    return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 })
  }

  // GoBD: Gesendete Angebote → Änderungshistorie schreiben
  const istGesendetOderSpaeter = bestehendes.status !== "ENTWURF"

  const { kundeId, gueltigBis, positionen } = body

  // Berechne Positionen
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

  // Transaktion: Update + Historie + Positionen ersetzen
  const angebot = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Änderungshistorie bei bereits gesendeten Angeboten
    if (istGesendetOderSpaeter) {
      const aenderungen: Array<{ wasGeaendert: string; alterWert: string; neuerWert: string }> = []

      if (kundeId && kundeId !== bestehendes.kundeId) {
        aenderungen.push({ wasGeaendert: "kundeId", alterWert: bestehendes.kundeId, neuerWert: kundeId })
      }
      if (summen.netto !== Number(bestehendes.netto)) {
        aenderungen.push({ wasGeaendert: "netto", alterWert: String(bestehendes.netto), neuerWert: String(summen.netto) })
      }
      if (summen.brutto !== Number(bestehendes.brutto)) {
        aenderungen.push({ wasGeaendert: "brutto", alterWert: String(bestehendes.brutto), neuerWert: String(summen.brutto) })
      }

      if (aenderungen.length > 0) {
        await tx.angebotHistorie.createMany({
          data: aenderungen.map((a) => ({
            angebotId: id,
            quelle: "manuell",
            wasGeaendert: a.wasGeaendert,
            alterWert: a.alterWert,
            neuerWert: a.neuerWert,
          })),
        })
      }
    }

    // Alle bestehenden Positionen löschen und neu anlegen
    await tx.angebotPosition.deleteMany({ where: { angebotId: id } })

    return tx.angebot.update({
      where: { id },
      data: {
        kundeId: kundeId || bestehendes.kundeId,
        netto: summen.netto,
        ust: summen.ust,
        brutto: summen.brutto,
        gueltigBis: gueltigBis ? new Date(gueltigBis) : bestehendes.gueltigBis,
        positionen: {
          create: berechnetePositionen,
        },
      },
      include: {
        positionen: { orderBy: { sortierung: "asc" } },
        kunde: { select: { id: true, name: true } },
      },
    })
  })

  return NextResponse.json(angebot)
}

/** PATCH /api/angebote/[id] — Statusübergang */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  const tenantId = (session?.user as { tenantId?: string })?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params
  const { status: neuerStatus } = await request.json()

  const angebot = await prisma.angebot.findFirst({
    where: { id, tenantId },
  })

  if (!angebot) {
    return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 })
  }

  const erlaubt = ERLAUBTE_UEBERGAENGE[angebot.status] || []
  if (!erlaubt.includes(neuerStatus)) {
    return NextResponse.json(
      { error: `Statusübergang von ${angebot.status} nach ${neuerStatus} ist nicht erlaubt.` },
      { status: 400 }
    )
  }

  const aktualisiert = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Änderungshistorie
    await tx.angebotHistorie.create({
      data: {
        angebotId: id,
        quelle: "manuell",
        wasGeaendert: "status",
        alterWert: angebot.status,
        neuerWert: neuerStatus,
      },
    })

    return tx.angebot.update({
      where: { id },
      data: { status: neuerStatus },
      include: {
        positionen: { orderBy: { sortierung: "asc" } },
        kunde: { select: { id: true, name: true } },
      },
    })
  })

  return NextResponse.json(aktualisiert)
}

/** DELETE /api/angebote/[id] — Soft-Delete (archivieren) */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  const tenantId = (session?.user as { tenantId?: string })?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const { id } = await params

  const angebot = await prisma.angebot.findFirst({
    where: { id, tenantId },
  })

  if (!angebot) {
    return NextResponse.json({ error: "Angebot nicht gefunden." }, { status: 404 })
  }

  // GoBD: Nicht physisch löschen, nur archivieren
  await prisma.angebot.update({
    where: { id },
    data: { archiviertAm: new Date() },
  })

  return NextResponse.json({ success: true })
}
