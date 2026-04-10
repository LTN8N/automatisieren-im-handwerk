"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble, type Message } from "./MessageBubble";
import { InputBar } from "./InputBar";
import { KRITISCHE_TOOLS, TOOL_BESCHREIBUNG } from "@/lib/ai/tools";

interface PendingConfirmation {
  tool: string;
  input: Record<string, unknown>;
}

interface ChatContainerProps {
  verlauf: { role: "user" | "assistant"; content: string }[];
}

export function ChatContainer({ verlauf }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    verlauf.map((v, i) => ({
      id: `init-${i}`,
      role: v.role,
      content: v.content,
    })),
  );
  const [streaming, setStreaming] = useState(false);
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function senden(text: string, quelle: "text" | "voice" = "text") {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantPlaceholder: Message = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setStreaming(true);

    let antwort = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nachricht: text, quelle }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Anfrage fehlgeschlagen");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split("\n");
          let eventType = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
          }

          if (!dataStr) continue;

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventType === "delta" && typeof data.text === "string") {
            antwort += data.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholder.id
                  ? { ...m, content: antwort, pending: false }
                  : m,
              ),
            );
          }

          if (eventType === "tool_use") {
            const tool = data.tool as string;
            if (KRITISCHE_TOOLS.has(tool)) {
              setPendingConfirm({
                tool,
                input: data.input as Record<string, unknown>,
              });
            }
          }

          if (eventType === "error") {
            const errorMsg = (data.message as string) ?? "Fehler aufgetreten.";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholder.id
                  ? { ...m, content: errorMsg, pending: false }
                  : m,
              ),
            );
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantPlaceholder.id
            ? {
                ...m,
                content: "Das hat leider nicht geklappt. Versuch es nochmal.",
                pending: false,
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  function bestaetigen(ja: boolean) {
    if (!pendingConfirm) return;
    setPendingConfirm(null);

    if (ja) {
      senden(`Ja, bestätigt.`);
    } else {
      const abbruchMsg: Message = {
        id: `abort-${Date.now()}`,
        role: "assistant",
        content: "Ok, ich mache das nicht.",
      };
      setMessages((prev) => [...prev, abbruchMsg]);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col">
      {/* Nachrichtenliste */}
      <div
        role="log"
        aria-label="Chatverlauf"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-slate-400 text-sm">
              Wie kann ich dir helfen?
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Bestätigungs-Dialog */}
      {pendingConfirm && (
        <div
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="confirm-title"
          className="border-t border-amber-200 bg-amber-50 px-4 py-3"
        >
          <p
            id="confirm-title"
            className="mb-3 text-sm font-medium text-amber-900"
          >
            {TOOL_BESCHREIBUNG[pendingConfirm.tool]} — bist du sicher?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => bestaetigen(true)}
              aria-label={`${TOOL_BESCHREIBUNG[pendingConfirm.tool]} bestätigen`}
              className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Ja
            </button>
            <button
              onClick={() => bestaetigen(false)}
              aria-label="Aktion abbrechen"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Nein
            </button>
          </div>
        </div>
      )}

      {/* Eingabe */}
      <InputBar
        onSend={senden}
        onVoice={(text) => senden(text, "voice")}
        disabled={streaming}
      />
    </div>
  );
}
