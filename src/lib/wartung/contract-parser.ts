/**
 * KI-Voice-Architect: Layer 3 — PDF-Vertragsparser (Integration)
 *
 * Ruft Claude Vision auf, um einen Wartungsvertrag aus einem Base64-PDF zu extrahieren.
 * Modell: claude-sonnet-4-6 (Vision), Seiten-Strategie: max. 4 Seiten bei langen Dokumenten
 * Konfidenz < 0.8: Feld wird in Review-Queue gemeldet (confidence[field] < 0.8)
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  CONTRACT_PARSER_SYSTEM_PROMPT,
  buildPageExtractionNote,
  type ParsedContractData,
} from "./prompts/contract-parser";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

// ---------------------------------------------------------------------------
// Claude Vision Call
// ---------------------------------------------------------------------------

async function callClaudeVision(
  client: Anthropic,
  pdfBase64: string,
  pageCount: number
): Promise<ParsedContractData> {
  const pageNote = buildPageExtractionNote(pageCount);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: CONTRACT_PARSER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: pageNote + "\n\nExtrahiere jetzt alle Wartungsvertragsdaten als JSON.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude hat keinen Text geliefert.");
  }

  const raw = textBlock.text.trim();

  // JSON-Extraktion: Claude umgibt Output manchmal mit ```json...```
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Claude-Antwort ist kein gültiges JSON: ${jsonStr.slice(0, 300)}`);
  }

  return parsed as ParsedContractData;
}

// ---------------------------------------------------------------------------
// Review-Queue: Felder mit Konfidenz < 0.8
// ---------------------------------------------------------------------------

export interface LowConfidenceField {
  field: string;
  confidence: number;
}

export function extractLowConfidenceFields(data: ParsedContractData): LowConfidenceField[] {
  return Object.entries(data.confidence)
    .filter(([, score]) => score < 0.8)
    .map(([field, confidence]) => ({ field, confidence }));
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

export interface ParseContractOptions {
  /** Optionaler API-Key (Standard: ANTHROPIC_API_KEY aus Umgebung) */
  apiKey?: string;
}

export interface ParseContractResult {
  data: ParsedContractData;
  /** Felder, die manuell geprüft werden sollen (confidence < 0.8) */
  reviewQueue: LowConfidenceField[];
}

/**
 * Parst einen Wartungsvertrag aus einem Base64-kodierten PDF via Claude Vision.
 *
 * - Seiten-Strategie: <= 5 Seiten → alle; > 5 Seiten → Seiten 1–3 + letzte
 * - Konfidenz < 0.8: Feld wird in reviewQueue zurückgegeben
 */
export async function parseContractPdf(
  pdfBase64: string,
  pageCount: number,
  options: ParseContractOptions = {}
): Promise<ParseContractResult> {
  const client = new Anthropic({ apiKey: options.apiKey });

  const data = await callClaudeVision(client, pdfBase64, pageCount);
  const reviewQueue = extractLowConfidenceFields(data);

  return { data, reviewQueue };
}
