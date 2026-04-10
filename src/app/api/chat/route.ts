import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { HANDWERK_TOOLS } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-executor";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
  }

  const { nachricht, quelle = "text" } = body;

  if (!nachricht?.trim()) {
    return NextResponse.json({ error: "Nachricht darf nicht leer sein" }, { status: 400 });
  }

  const db = getTenantDb(tenantId);

  // Tenant-Infos laden
  const tenant = await db.tenant.findFirst({ select: { name: true } });

  // Letzte 10 Nachrichten als Kontext
  const verlauf = await db.chatHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { nachricht: true, antwort: true },
  });

  const verlaufSorted = verlauf.reverse();

  // Nachrichten fuer OpenAI aufbauen
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        firmenname: tenant?.name ?? "Ihr Betrieb",
        userName,
        quelle,
      }),
    },
  ];

  for (const eintrag of verlaufSorted) {
    messages.push({ role: "user", content: eintrag.nachricht });
    if (eintrag.antwort) {
      messages.push({ role: "assistant", content: eintrag.antwort });
    }
  }

  messages.push({ role: "user", content: nachricht });

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

      try {
        // Tool-Execution-Loop: max 5 Durchlaeufe
        let currentMessages = [...messages];
        const MAX_TOOL_ROUNDS = 5;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: currentMessages,
            tools: HANDWERK_TOOLS,
            tool_choice: "auto",
            max_tokens: 1024,
          });

          const choice = response.choices[0];
          const message = choice.message;

          // Wenn Tool-Calls vorhanden: ausfuehren und Ergebnis zurueckgeben
          if (message.tool_calls && message.tool_calls.length > 0) {
            // Assistant-Message mit Tool-Calls merken
            currentMessages.push(message);

            for (const toolCall of message.tool_calls) {
              const toolName = toolCall.function.name;
              erkannterIntent = toolName;
              let toolArgs: Record<string, unknown> = {};
              try {
                toolArgs = JSON.parse(toolCall.function.arguments);
              } catch {
                toolArgs = {};
              }

              sendEvent("tool_use", { tool: toolName, input: toolArgs });

              // Tool ausfuehren
              const result = await executeTool(toolName, toolArgs, tenantId);

              // Tool-Ergebnis zurueck an OpenAI
              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: result,
              });
            }

            // Naechste Runde — OpenAI verarbeitet die Tool-Ergebnisse
            continue;
          }

          // Keine Tool-Calls — finale Textantwort
          if (message.content) {
            vollstaendigeAntwort = message.content;
            sendEvent("delta", { text: message.content });
          }

          break; // Fertig
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
          },
        });
      } catch (err) {
        console.error("Chat API Fehler:", err);
        sendEvent("error", {
          message: "Das hat leider nicht geklappt. Versuch es nochmal.",
        });

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
