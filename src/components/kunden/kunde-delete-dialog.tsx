"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

interface KundeDeleteDialogProps {
  kunde: {
    id: string;
    name: string;
    _count: {
      angebote: number;
      rechnungen: number;
    };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function KundeDeleteDialog({
  kunde,
  open,
  onOpenChange,
  onDeleted,
}: KundeDeleteDialogProps) {
  const t = useTranslations("kunden");
  const tc = useTranslations("common");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRelations = kunde._count.angebote > 0 || kunde._count.rechnungen > 0;

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/kunden/${kunde.id}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? t("deleteError"));
        return;
      }

      onDeleted();
    } catch {
      setError(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteDescription", { name: kunde.name })}
          </DialogDescription>
        </DialogHeader>

        {hasRelations && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>
              {t("deleteWarning", {
                angebote: kunde._count.angebote,
                rechnungen: kunde._count.rechnungen,
              })}
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
