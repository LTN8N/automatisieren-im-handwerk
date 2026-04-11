"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface Vertrag {
  id: string;
  contractNumber: string | null;
  customerName: string;
  status: string;
  createdAt: string;
  object: { id: string; name: string } | null;
  _count: { leases: number };
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface VertraegeTableProps {
  vertraege: Vertrag[];
  pagination: Pagination;
  currentStatus: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_FILTERS = ["ALL", "ACTIVE", "EXPIRED", "CANCELLED"] as const;

interface ImportError {
  row: number;
  message: string;
}

interface ImportRow {
  row: number;
  data: Record<string, string>;
  status: "ok" | "warning" | "error";
  message?: string;
}

interface ImportResult {
  errors: ImportError[];
  preview: ImportRow[];
  imported?: number;
}

export function VertraegeTable({
  vertraege,
  pagination,
  currentStatus,
}: VertraegeTableProps) {
  const t = useTranslations("wartung");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setFilter(status: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  }

  async function handleFileUpload(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Bitte eine Excel-Datei (.xlsx) hochladen.");
      return;
    }
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/wartung/contracts/import/excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
    } catch {
      setImportResult({ errors: [{ row: 0, message: "Upload fehlgeschlagen." }], preview: [] });
    } finally {
      setImporting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function closeImport() {
    setImportOpen(false);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (importResult?.imported) router.refresh();
  }

  const filterLabels: Record<string, string> = {
    ALL: t("filterAlle"),
    ACTIVE: t("filterAktiv"),
    EXPIRED: t("filterAbgelaufen"),
    CANCELLED: t("filterGekuendigt"),
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status-Filter */}
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentStatus === s
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filterLabels[s]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="rounded-xl min-h-[48px]"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("importieren")}
          </Button>
          <Button
            onClick={() => router.push("vertraege/neu")}
            className="rounded-xl min-h-[48px]"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t("neuerVertragBtn")}
          </Button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">{t("spalteVertragsnummer")}</th>
              <th className="px-4 py-3 font-medium">{t("spalteKunde")}</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">{t("spalteObjekt")}</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell text-right">{t("spalteLeistungen")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("spalteStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {vertraege.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("keineVertraege")}
                </td>
              </tr>
            ) : (
              vertraege.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`vertraege/${v.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-mono text-sm font-medium">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      {v.contractNumber ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{v.customerName}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {v.object?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-right">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {v._count.leases}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[v.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {t(`status${v.status}` as Parameters<typeof t>[0])}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(pagination.page - 1) * pagination.perPage + 1}–
            {Math.min(pagination.page * pagination.perPage, pagination.total)} von {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
              className="rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
              className="rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Import-Modal */}
      <Dialog open={importOpen} onOpenChange={closeImport}>
        <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("importModal")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!importResult && (
              <>
                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  }`}
                >
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">{t("importDragDrop")}</p>
                  <p className="text-xs text-muted-foreground mt-1">.xlsx</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                </div>

                {/* Template Download */}
                <div className="flex items-center justify-center">
                  <a
                    href="/api/wartung/contracts/import/excel?template=1"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {t("importTemplateDownload")}
                  </a>
                </div>

                {importing && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    {t("importUploading")}
                  </div>
                )}
              </>
            )}

            {/* Fehler-Tabelle */}
            {importResult && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {t("importFehlerTabelle")}
                </h3>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">{t("importZeile")}</th>
                        <th className="px-3 py-2 text-left font-medium">{t("importFehler")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((e, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono">{e.row}</td>
                          <td className="px-3 py-2 text-red-600">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vorschau */}
            {importResult && importResult.preview.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {t("importVorschau")} ({importResult.imported ?? importResult.preview.length} importiert)
                </h3>
                <div className="overflow-x-auto rounded-xl border max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">{t("importZeile")}</th>
                        <th className="px-3 py-2 text-left font-medium">{t("spalteKunde")}</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.preview.map((row) => (
                        <tr key={row.row} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono">{row.row}</td>
                          <td className="px-3 py-2">{row.data.customerName ?? "—"}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                row.status === "ok"
                                  ? "bg-green-100 text-green-800"
                                  : row.status === "warning"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeImport} className="rounded-xl">
              {t("importSchliessen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
