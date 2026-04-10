"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceStatus = "idle" | "recording" | "transcribing";

interface VoiceButtonProps {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscribed, disabled }: VoiceButtonProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Aufräumen bei Unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Mikrofon wird von diesem Browser nicht unterstützt.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Mikrofon-Zugriff verweigert. Bitte Berechtigung erteilen.");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      if (blob.size === 0) {
        setStatus("idle");
        return;
      }

      setStatus("transcribing");

      try {
        const form = new FormData();
        form.append("audio", blob, "aufnahme.webm");

        const res = await fetch("/api/voice", {
          method: "POST",
          body: form,
        });

        const data = await res.json();

        if (!res.ok || !data.text) {
          setError(data.error ?? "Transkription fehlgeschlagen.");
        } else {
          onTranscribed(data.text);
        }
      } catch {
        setError("Netzwerkfehler. Versuch es nochmal.");
      } finally {
        setStatus("idle");
      }
    };

    recorder.start();
    setStatus("recording");
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function handleClick() {
    if (disabled) return;
    if (status === "idle") startRecording();
    else if (status === "recording") stopRecording();
  }

  const isRecording = status === "recording";
  const isTranscribing = status === "transcribing";

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        aria-label={
          isTranscribing
            ? "Transkribiere Aufnahme…"
            : isRecording
              ? "Aufnahme stoppen"
              : "Sprachaufnahme starten"
        }
        aria-pressed={isRecording}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isRecording &&
            "bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse",
          isTranscribing && "bg-slate-200 text-slate-400 cursor-not-allowed",
          !isRecording &&
            !isTranscribing &&
            !disabled &&
            "bg-slate-100 text-slate-600 hover:bg-slate-200",
          disabled && !isRecording && "opacity-40 cursor-not-allowed",
        )}
      >
        {isTranscribing ? (
          <Loader2 size={20} className="animate-spin" />
        ) : isRecording ? (
          <MicOff size={20} />
        ) : (
          <Mic size={20} />
        )}
      </button>

      {/* Waveform-Animation während Aufnahme */}
      {isRecording && (
        <div className="absolute -bottom-4 flex items-end gap-0.5 h-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-red-400"
              style={{
                height: "100%",
                animation: `waveform 0.8s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Fehleranzeige */}
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="absolute top-14 left-1/2 -translate-x-1/2 w-56 text-xs text-center text-red-500 bg-white border border-red-200 rounded-lg px-2 py-1 shadow-sm z-10"
        >
          {error}
        </p>
      )}

      <style>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
