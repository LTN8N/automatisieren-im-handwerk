import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantDb } from "@/lib/db"
import ExcelJS from "exceljs"

interface RowError {
  sheet: string
  row: number
  error: string
}

/**
 * POST /api/wartung/contracts/import/excel — Excel-Upload (exceljs)
 *
 * Sheet 1: Objekte (Name, Adresse, PLZ, Gebäudetyp, Ansprechpartner, Zugangszeiten)
 * Sheet 2: Leistungen (Anlagentyp, Intervall in Monaten, Qualifikation, Dauer in h, Saison, Rechtsgrundlage)
 * Sheet 3: Vertragsdaten (Vertragsnummer, Laufzeit von, Laufzeit bis, Kundenzuordnung)
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
    return NextResponse.json({ error: "Datei konnte nicht gelesen werden. Bitte Excel-Datei (.xlsx) hochladen." }, { status: 400 })
  }

  const errors: RowError[] = []
  const db = getTenantDb(session.user.tenantId)

  // --- Sheet 1: Objekte ---
  const objectSheet = workbook.getWorksheet(1)
  const createdObjectIds: string[] = []

  if (objectSheet) {
    let rowIndex = 2 // Zeile 1 = Header
    objectSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return // Header überspringen
      rowIndex = rowNumber

      const name = String(row.getCell(1).value ?? "").trim()
      const address = String(row.getCell(2).value ?? "").trim()
      const postalCode = String(row.getCell(3).value ?? "").trim()
      const buildingType = String(row.getCell(4).value ?? "").trim()
      const contactName = String(row.getCell(5).value ?? "").trim() || undefined
      const accessNotes = String(row.getCell(6).value ?? "").trim() || undefined

      if (!name) errors.push({ sheet: "Objekte", row: rowIndex, error: "Name fehlt" })
      if (!address) errors.push({ sheet: "Objekte", row: rowIndex, error: "Adresse fehlt" })
      if (!postalCode) errors.push({ sheet: "Objekte", row: rowIndex, error: "PLZ fehlt" })
      if (!buildingType) errors.push({ sheet: "Objekte", row: rowIndex, error: "Gebäudetyp fehlt" })
    })
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validierungsfehler in der Excel-Datei", errors },
      { status: 422 }
    )
  }

  // Import durchführen: Objekte anlegen
  if (objectSheet) {
    const rows: Array<{
      name: string
      address: string
      city: string
      postalCode: string
      buildingType: string
      contactName?: string
      accessNotes?: string
    }> = []

    objectSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return
      rows.push({
        name: String(row.getCell(1).value ?? "").trim(),
        address: String(row.getCell(2).value ?? "").trim(),
        city: "",
        postalCode: String(row.getCell(3).value ?? "").trim(),
        buildingType: String(row.getCell(4).value ?? "").trim(),
        contactName: String(row.getCell(5).value ?? "").trim() || undefined,
        accessNotes: String(row.getCell(6).value ?? "").trim() || undefined,
      })
    })

    for (const rowData of rows) {
      const obj = await db.maintenanceObject.create({
        data: {
          tenantId: session.user.tenantId,
          name: rowData.name,
          address: rowData.address,
          city: "",
          postalCode: rowData.postalCode,
          buildingType: rowData.buildingType,
          contactName: rowData.contactName,
          accessNotes: rowData.accessNotes,
        },
      })
      createdObjectIds.push(obj.id)
    }
  }

  // Sheet 3: Vertragsdaten — Vertrag anlegen (pro Objekt, falls vorhanden)
  const contractSheet = workbook.getWorksheet(3)
  const leaseSheet = workbook.getWorksheet(2)
  const createdContracts: string[] = []

  if (contractSheet && createdObjectIds.length > 0) {
    let contractRowIndex = 0

    contractSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return
      contractRowIndex++

      const contractNumber = String(row.getCell(1).value ?? "").trim() || undefined
      const startDateRaw = row.getCell(2).value
      const endDateRaw = row.getCell(3).value
      const customerName = String(row.getCell(4).value ?? "").trim()

      if (!customerName) {
        errors.push({ sheet: "Vertragsdaten", row: rowNumber, error: "Kundenname fehlt" })
        return
      }

      const objectId = createdObjectIds[contractRowIndex - 1]
      if (!objectId) return

      const startDate = startDateRaw instanceof Date ? startDateRaw : new Date(String(startDateRaw))
      const endDate = endDateRaw instanceof Date ? endDateRaw : endDateRaw ? new Date(String(endDateRaw)) : undefined

      if (isNaN(startDate.getTime())) {
        errors.push({ sheet: "Vertragsdaten", row: rowNumber, error: "Ungültiges Startdatum" })
        return
      }

      createdContracts.push(JSON.stringify({ objectId, contractNumber, customerName, startDate, endDate }))
    })
  }

  // Sheet 2: Leistungen — pro Vertrag
  const leaseRows: Array<{
    serviceType: string
    intervalMonths: number
    estimatedHours: number
    qualificationRequired?: string
    seasonalPreference?: string
    legalBasis?: string
    legalDeadline?: string
  }> = []

  if (leaseSheet) {
    leaseSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return
      leaseRows.push({
        serviceType: String(row.getCell(1).value ?? "").trim(),
        intervalMonths: parseInt(String(row.getCell(2).value ?? "0"), 10),
        qualificationRequired: String(row.getCell(3).value ?? "").trim() || undefined,
        estimatedHours: parseFloat(String(row.getCell(4).value ?? "0")),
        seasonalPreference: String(row.getCell(5).value ?? "").trim() || undefined,
        legalBasis: String(row.getCell(6).value ?? "").trim() || undefined,
      })
    })
  }

  // Verträge mit Leistungen anlegen
  for (const contractJson of createdContracts) {
    const { objectId, contractNumber, customerName, startDate, endDate } = JSON.parse(contractJson)
    await db.maintenanceContract.create({
      data: {
        tenantId: session.user.tenantId,
        objectId,
        contractNumber,
        customerName,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        leases: {
          create: leaseRows.filter((l) => l.serviceType && l.intervalMonths > 0),
        },
      },
    })
  }

  return NextResponse.json({
    success: true,
    importedObjects: createdObjectIds.length,
    importedContracts: createdContracts.length,
    warnings: errors,
  })
}
