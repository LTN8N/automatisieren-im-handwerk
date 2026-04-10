"use client";

import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-base",
          isUser
            ? "rounded-br-md bg-blue-500 text-white"
            : "rounded-bl-md bg-slate-100 text-slate-900",
          message.pending && "opacity-60",
        )}
      >
        {message.pending && !message.content ? (
          <span className="inline-flex gap-1">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce [animation-delay:0.15s]">.</span>
            <span className="animate-bounce [animation-delay:0.3s]">.</span>
          </span>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        )}
      </div>
    </div>
  );
}
