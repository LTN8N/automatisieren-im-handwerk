import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma, getTenantDb } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { HANDWERK_TOOLS } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-executor";
import { extragiereKontext, formatKontextHinweis } from "@/lib/ai/context-extractor";
import { formatiereVoiceAntwort } from "@/lib/ai/voice-formatter";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/voice
 *
 * Vollstaendige Voice-Pipeline:
 * 1. Audio-Upload entgegennehmen
 * 2. Whisper STT — Audio → Text
 * 3. Kontext-Extraktion (Kundenname, Preise etc. erkennen)
 * 4. LLM-Chat mit Tool-Execution (gleiche Logik wie /api/chat)
 * 5. Antwort fuer Sprache optimieren (kurze Saetze, kein Markdown)
 *
 * Response: JSON { text: string, antwort: string, intent?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const userName = session.user.name ?? "Nutzer";

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const audio = formData.get("audio");

  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Keine Audiodatei übermittelt" }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Audiodatei ist leer" }, { status: 400 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Audiodatei zu groß (max. 25 MB)" }, { status: 400 });
  }

  // ─── Schritt 1: Whisper STT ───────────────────────────────────────────────
  let transkription: string;
  try {
    const file = new File([audio], "aufnahme.webm", { type: "audio/webm" });
    transkription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "de",
      response_format: "text",
    }) as unknown as string;
  } catch (err) {
    console.error("Whisper API Fehler:", err);
    return NextResponse.json(
      { error: "Transkription fehlgeschlagen. Versuch es nochmal." },
      { status: 500 }
    );
  }

  if (!transkription?.trim()) {
    return NextResponse.json(
      { error: "Kein Text erkannt. Bitte nochmal sprechen." },
      { status: 422 }
    );
  }

  // ─── Schritt 2: Kontext-Extraktion ────────────────────────────────────────
  const kontext = extragiereKontext(transkription);
  const kontextHinweis = formatKontextHinweis(kontext);

  // ─── Schritt 3: LLM-Verarbeitung ──────────────────────────────────────────
  const db = getTenantDb(tenantId);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

  const verlauf = await db.chatHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 6, // Weniger Kontext bei Voice — kuerzere Antworten erwuenscht
    select: { nachricht: true, antwort: true },
  });

  const systemPrompt =
    buildSystemPrompt({ firmenname: tenant?.name ?? "Ihr Betrieb", userName, quelle: "voice" }) +
    kontextHinweis;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const eintrag of verlauf.reverse()) {
    messages.push({ role: "user", content: eintrag.nachricht });
    if (eintrag.antwort) {
      messages.push({ role: "assistant", content: eintrag.antwort });
    }
  }

  messages.push({ role: "user", content: transkription });

  let vollstaendigeAntwort = "";
  let erkannterIntent: string | null = null;

  try {
    const currentMessages = [...messages];
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: currentMessages,
        tools: HANDWERK_TOOLS,
        tool_choice: "auto",
        max_tokens: 512, // Kuerzere Antworten bei Voice
      });

      const choice = response.choices[0];
      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push(message);

        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const fn = toolCall.function;
          erkannterIntent = fn.name;
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(fn.arguments);
          } catch {
            toolArgs = {};
          }

          const result = await executeTool(fn.name, toolArgs, tenantId);
          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        continue;
      }

      if (message.content) {
        vollstaendigeAntwort = message.content;
      }
      break;
    }

    // ─── Schritt 4: Voice-Optimierung ─────────────────────────────────────
    const voiceAntwort = formatiereVoiceAntwort(vollstaendigeAntwort);

    // Verlauf speichern
    await db.chatHistory.create({
      data: {
        tenantId,
        quelle: "voice",
        nachricht: transkription,
        antwort: vollstaendigeAntwort || null,
        intent: erkannterIntent,
        kontext: kontext as unknown as Record<string, unknown>,
      },
    });

    return NextResponse.json({
      text: transkription,        // Was Whisper erkannt hat
      antwort: voiceAntwort,      // Voice-optimierte Antwort
      antwortRoh: vollstaendigeAntwort, // Volle Antwort (fuer Chat-Anzeige)
      intent: erkannterIntent,
    });
  } catch (err) {
    console.error("Voice KI Fehler:", err);

    await db.chatHistory.create({
      data: {
        tenantId,
        quelle: "voice",
        nachricht: transkription,
        antwort: null,
        intent: "fehler",
      },
    });

    return NextResponse.json(
      { error: "Das hat leider nicht geklappt. Versuch es nochmal." },
      { status: 500 }
    );
  }
}
