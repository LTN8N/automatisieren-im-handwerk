"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Play, FileDown, Loader2 } from "lucide-react";
import { PLAN_STATUS_LABELS } from "./types";
import { toast } from "sonner";

interface PlanStatusBannerProps {
  planId: string;
  status: string;
  year: number;
  onStatusChange: (newStatus: "DRAFT" | "RELEASED" | "EXECUTING" | "COMPLETED") => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="h-4 w-4" />,
  RELEASED: <CheckCircle2 className="h-4 w-4" />,
  EXECUTING: <Play className="h-4 w-4" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-50 border-yellow-200 text-yellow-800",
  RELEASED: "bg-blue-50 border-blue-200 text-blue-800",
  EXECUTING: "bg-green-50 border-green-200 text-green-800",
  COMPLETED: "bg-gray-50 border-gray-200 text-gray-700",
};

export function PlanStatusBanner({ planId, status, year, onStatusChange }: PlanStatusBannerProps) {
  const [isReleasing, setIsReleasing] = useState(false);

  async function handleRelease() {
    setIsReleasing(true);
    try {
      const res = await fetch(`/api/wartung/plans/${planId}/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Freigabe fehlgeschlagen.");
        return;
      }
      toast.success(`Jahresplan ${year} freigegeben.`);
      onStatusChange("RELEASED" as const);
    } catch {
      toast.error("Netzwerkfehler bei der Freigabe.");
    } finally {
      setIsReleasing(false);
    }
  }

  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT;

  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${colorClass}`}>
      <div className="flex items-center gap-2">
        {STATUS_ICONS[status]}
        <span className="text-sm font-semibold">
          Jahresplan {year} — {PLAN_STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {status === "DRAFT" && (
          <Button
            size="sm"
            onClick={handleRelease}
            disabled={isReleasing}
            className="rounded-xl"
          >
            {isReleasing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Plan freigeben
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled
          className="rounded-xl opacity-60"
          title="PDF-Export kommt in einer späteren Version"
        >
          <FileDown className="mr-1.5 h-3.5 w-3.5" />
          Als PDF exportieren
        </Button>
      </div>
    </div>
  );
}
