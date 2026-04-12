/**
 * POST /api/wartung/contracts/parse
 *
 * Nimmt ein Base64-kodiertes PDF entgegen und gibt die geparsten
 * Vertragsdaten inkl. Review-Queue zurück.
 *
 * Body: { pdfBase64: string, pageCount: number }
 * Response: { data: ParsedContractData, reviewQueue: LowConfidenceField[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { parseContractPdf } from "@/lib/wartung/contract-parser";

const parseRequestSchema = z.object({
  pdfBase64: z.string().min(100, "Kein gültiges Base64-PDF"),
  pageCount: z.number().int().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const result = parseRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const parsed = await parseContractPdf(result.data.pdfBase64, result.data.pageCount);
    return NextResponse.json(parsed, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "PDF-Parsing fehlgeschlagen.", details: message }, { status: 500 });
  }
}
