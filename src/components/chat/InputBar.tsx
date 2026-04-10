"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceButton } from "./VoiceButton";

interface InputBarProps {
  onSend: (text: string) => void;
  onVoice?: (text: string) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, onVoice, disabled }: InputBarProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="sticky bottom-16 sm:bottom-0 border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Schreib etwas…"
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3",
            "text-base text-slate-900 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "max-h-[120px] overflow-y-auto",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
        {onVoice && (
          <VoiceButton onTranscribed={onVoice} disabled={disabled} />
        )}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          aria-label="Nachricht senden"
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            "bg-blue-500 text-white transition-opacity",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            (!text.trim() || disabled) && "opacity-40 cursor-not-allowed",
            text.trim() && !disabled && "hover:bg-blue-600",
          )}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
