"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConflictDialogProps {
  details: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConflictDialog({ details, onConfirm, onCancel }: ConflictDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Terminkonflikt erkannt</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Beim Verschieben des Termins wurden folgende Konflikte festgestellt:
            </p>
          </div>
        </div>

        <ul className="mb-5 space-y-1.5 rounded-xl bg-muted/50 p-3">
          {details.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
              {d}
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-xl"
          >
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            className="min-h-[44px] flex-1 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600"
          >
            Trotzdem verschieben
          </Button>
        </div>
      </div>
    </div>
  );
}
