import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import ExcelJS from "exceljs"

interface RowError {
  sheet: string
  row: number
  error: string
}

interface ObjectRow {
  name: string
  address: string
  city: string
  postalCode: string
  buildingType: string
  contactName?: string
  accessNotes?: string
}

interface LeaseRow {
  serviceType: string
  intervalMonths: number
  qualificationRequired?: string
  estimatedHours: number
  seasonalPreference?: string
  legalBasis?: string
  legalDeadline?: string
  /**
   * Optionale Spalte 8: 1-basierter Verweis auf eine Datenzeile in Sheet 3.
   * Wenn gesetzt, gilt diese Leistung nur für den referenzierten Vertrag.
   * Wenn nicht gesetzt (0 oder leer), gilt die Leistung für alle Verträge.
   */
  contractLine?: number
}

interface ContractRow {
  contractNumber?: string
  startDate: Date
  endDate?: Date
  customerName: string
  /** Index in objects array (0-based) */
  objectIndex: number
}

/**
 * POST /api/wartung/contracts/import/excel — Excel-Upload (exceljs)
 *
 * Sheet 1: Objekte (Name, Adresse, Stadt, PLZ, Gebäudetyp, Ansprechpartner, Zugangszeiten)
 * Sheet 2: Leistungen (Anlagentyp, Intervall in Monaten, Qualifikation, Dauer in h, Saison, Rechtsgrundlage, Rechtl. Frist, [Vertrag-Zeile])
 * Sheet 3: Vertragsdaten (Vertragsnummer, Laufzeit von, Laufzeit bis, Kundenname, Objekt-Zeile)
 *
 * Alle Sheets werden vollständig validiert bevor irgendwas in die DB geschrieben wird.
 * Der gesamte Import läuft in einer Transaktion.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file")

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = Buffer.from(await file.arrayBuffer()) as any
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(buffer)
  } catch {
    return NextResponse.json(
      { error: "Datei konnte nicht gelesen werden. Bitte Excel-Datei (.xlsx) hochladen." },
      { status: 400 }
    )
  }

  const errors: RowError[] = []

  // ── Validierungsphase ──────────────────────────────────────────────────────
  // Sheet 1: Objekte
  const objectRows: ObjectRow[] = []
  const objectSheet = workbook.getWorksheet(1)

  if (objectSheet) {
    objectSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return

      const name = String(row.getCell(1).value ?? "").trim()
      const address = String(row.getCell(2).value ?? "").trim()
      const city = String(row.getCell(3).value ?? "").trim()
      const postalCode = String(row.getCell(4).value ?? "").trim()
      const buildingType = String(row.getCell(5).value ?? "").trim()
      const contactName = String(row.getCell(6).value ?? "").trim() || undefined
      const accessNotes = String(row.getCell(7).value ?? "").trim() || undefined

      if (!name) errors.push({ sheet: "Objekte", row: rowNumber, error: "Name fehlt" })
      if (!address) errors.push({ sheet: "Objekte", row: rowNumber, error: "Adresse fehlt" })
      if (!city) errors.push({ sheet: "Objekte", row: rowNumber, error: "Stadt fehlt (Spalte C)" })
      if (!postalCode) errors.push({ sheet: "Objekte", row: rowNumber, error: "PLZ fehlt" })
      if (!buildingType) errors.push({ sheet: "Objekte", row: rowNumber, error: "Gebäudetyp fehlt" })

      objectRows.push({ name, address, city, postalCode, buildingType, contactName, accessNotes })
    })
  }

  // Sheet 2: Leistungen
  const leaseRows: LeaseRow[] = []
  const leaseSheet = workbook.getWorksheet(2)

  if (leaseSheet) {
    leaseSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return

      const serviceType = String(row.getCell(1).value ?? "").trim()
      const intervalMonths = parseInt(String(row.getCell(2).value ?? "0"), 10)
      const qualificationRequired = String(row.getCell(3).value ?? "").trim() || undefined
      const estimatedHours = parseFloat(String(row.getCell(4).value ?? "0"))
      const seasonalPreference = String(row.getCell(5).value ?? "").trim() || undefined
      const legalBasis = String(row.getCell(6).value ?? "").trim() || undefined
      const legalDeadline = String(row.getCell(7).value ?? "").trim() || undefined
      // Spalte 8 (optional): 1-basierter Verweis auf Sheet-3-Datenzeile.
      // Leer oder 0 → Leistung gilt für alle Verträge.
      const contractLineRaw = parseInt(String(row.getCell(8).value ?? "0"), 10)
      const contractLine = isNaN(contractLineRaw) || contractLineRaw <= 0 ? undefined : contractLineRaw

      if (!serviceType) errors.push({ sheet: "Leistungen", row: rowNumber, error: "Anlagentyp fehlt" })
      if (!intervalMonths || intervalMonths <= 0) errors.push({ sheet: "Leistungen", row: rowNumber, error: "Intervall muss > 0 sein" })
      if (!estimatedHours || estimatedHours <= 0) errors.push({ sheet: "Leistungen", row: rowNumber, error: "Dauer muss > 0 sein" })

      leaseRows.push({ serviceType, intervalMonths, qualificationRequired, estimatedHours, seasonalPreference, legalBasis, legalDeadline, contractLine })
    })
  }

  // Sheet 3: Vertragsdaten
  const contractRows: ContractRow[] = []
  const contractSheet = workbook.getWorksheet(3)

  if (contractSheet) {
    contractSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return

      const contractNumber = String(row.getCell(1).value ?? "").trim() || undefined
      const startDateRaw = row.getCell(2).value
      const endDateRaw = row.getCell(3).value
      const customerName = String(row.getCell(4).value ?? "").trim()
      // Spalte 5: Objekt-Zeile (1-basiert, bezieht sich auf Sheet 1 Datenzeile)
      const objectLineRaw = parseInt(String(row.getCell(5).value ?? "1"), 10)
      const objectIndex = isNaN(objectLineRaw) ? 0 : objectLineRaw - 1

      if (!customerName) errors.push({ sheet: "Vertragsdaten", row: rowNumber, error: "Kundenname fehlt" })

      const startDate = startDateRaw instanceof Date ? startDateRaw : new Date(String(startDateRaw))
      const endDate = endDateRaw instanceof Date ? endDateRaw : endDateRaw ? new Date(String(endDateRaw)) : undefined

      if (isNaN(startDate.getTime())) {
        errors.push({ sheet: "Vertragsdaten", row: rowNumber, error: "Ungültiges Startdatum" })
        return
      }

      if (objectIndex < 0 || objectIndex >= objectRows.length) {
        errors.push({ sheet: "Vertragsdaten", row: rowNumber, error: `Objekt-Zeile ${objectLineRaw} existiert nicht in Sheet 1` })
        return
      }

      contractRows.push({ contractNumber, startDate, endDate, customerName, objectIndex })
    })
  }

  // Abbruch bei Validierungsfehlern — noch nichts in DB geschrieben
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validierungsfehler in der Excel-Datei", errors }, { status: 422 })
  }

  if (objectRows.length === 0) {
    return NextResponse.json({ error: "Sheet 1 (Objekte) enthält keine Datenzeilen." }, { status: 400 })
  }

  // ── Import-Phase: atomare Transaktion ──────────────────────────────────────
  const tenantId = session.user.tenantId
  const db = getTenantDb(tenantId)

  const result = await db.$transaction(async (tx) => {
    // Objekte anlegen
    const createdObjects = await Promise.all(
      objectRows.map((row) =>
        tx.maintenanceObject.create({
          data: { tenantId, ...row },
          select: { id: true },
        })
      )
    )

    // Verträge mit Leistungen anlegen
    // Jeder Vertrag erhält nur Leistungen, die für ihn bestimmt sind:
    // - contractLine nicht gesetzt (undefined) → Leistung gilt für alle Verträge
    // - contractLine gesetzt → Leistung gilt nur für den Vertrag mit diesem 1-basierten Index
    const createdContracts = await Promise.all(
      contractRows.map((row, contractIndex) => {
        const contractLine = contractIndex + 1
        const objectId = createdObjects[row.objectIndex].id
        return tx.maintenanceContract.create({
          data: {
            tenantId,
            objectId,
            contractNumber: row.contractNumber,
            customerName: row.customerName,
            startDate: row.startDate,
            endDate: row.endDate,
            leases: {
              create: leaseRows.filter(
                (l) =>
                  l.serviceType &&
                  l.intervalMonths > 0 &&
                  (l.contractLine === undefined || l.contractLine === contractLine)
              ),
            },
          },
          select: { id: true },
        })
      })
    )

    return { importedObjects: createdObjects.length, importedContracts: createdContracts.length }
  })

  return NextResponse.json({ success: true, ...result })
}
