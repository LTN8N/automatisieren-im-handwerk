import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { HANDWERK_TOOLS } from "@/lib/ai/tools";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  nachricht: string;
  quelle?: "text" | "voice";
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const userName = session.user.name ?? "Nutzer";

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { nachricht, quelle = "text" } = body;

  if (!nachricht?.trim()) {
    return NextResponse.json(
      { error: "Nachricht darf nicht leer sein" },
      { status: 400 },
    );
  }

  const db = getTenantDb(tenantId);

  // Tenant-Infos laden
  const tenant = await db.tenant.findFirst({
    select: { name: true },
  });

  // Letzte 10 Nachrichten als Gesprächskontext laden
  const verlauf = await db.chatHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      nachricht: true,
      antwort: true,
    },
  });

  // Älteste zuerst für chronologische Reihenfolge
  const verlaufSorted = verlauf.reverse();

  // Nachrichten für Claude aufbauen
  const messages: Anthropic.MessageParam[] = [];

  for (const eintrag of verlaufSorted) {
    messages.push({ role: "user", content: eintrag.nachricht });
    if (eintrag.antwort) {
      messages.push({ role: "assistant", content: eintrag.antwort });
    }
  }

  // Aktuelle Nutzernachricht
  messages.push({ role: "user", content: nachricht });

  const systemPrompt = buildSystemPrompt({
    firmenname: tenant?.name ?? "Ihr Betrieb",
    userName,
    quelle,
  });

  // SSE-Stream aufbauen
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(event: string, data: unknown) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      let vollstaendigeAntwort = "";
      let erkannterIntent: string | null = null;
      let intentKontext: Record<string, unknown> | null = null;

      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          tools: HANDWERK_TOOLS,
          messages,
        });

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              const text = event.delta.text;
              vollstaendigeAntwort += text;
              sendEvent("delta", { text });
            }
          }
        }

        // Nach dem Stream: finale Nachricht für Tool-Use auswerten
        const finalMsg = await claudeStream.finalMessage();
        const toolBlock = finalMsg.content.find((b) => b.type === "tool_use");
        if (toolBlock && toolBlock.type === "tool_use") {
          erkannterIntent = toolBlock.name;
          intentKontext = toolBlock.input as Record<string, unknown>;
          sendEvent("tool_use", {
            tool: toolBlock.name,
            input: toolBlock.input,
          });
        }

        sendEvent("done", { vollstaendig: true });

        // Antwort in ChatHistory speichern
        await db.chatHistory.create({
          data: {
            tenantId,
            quelle,
            nachricht,
            antwort: vollstaendigeAntwort || null,
            intent: erkannterIntent,
            kontext: intentKontext ?? undefined,
          },
        });
      } catch (err) {
        console.error("Chat API Fehler:", err);
        sendEvent("error", {
          message: "Das hat leider nicht geklappt. Versuch es nochmal.",
        });

        // Fehler-Eintrag speichern
        await db.chatHistory.create({
          data: {
            tenantId,
            quelle,
            nachricht,
            antwort: null,
            intent: "fehler",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
