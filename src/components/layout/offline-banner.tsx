"use client";

import { useOnline } from "@/hooks/use-online";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const isOnline = useOnline();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isOnline ? "max-h-0" : "max-h-12"
      )}
    >
      <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Keine Internetverbindung – Änderungen werden nicht gespeichert</span>
      </div>
    </div>
  );
}
