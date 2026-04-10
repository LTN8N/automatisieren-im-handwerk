"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { Plus, Search } from "lucide-react";

interface Rechnung {
  id: string;
  nummer: string;
  status: string;
  netto: number;
  brutto: number;
  zahlungsziel: string | null;
  createdAt: string;
  kunde: { id: string; name: string };
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface RechnungenTableProps {
  rechnungen: Rechnung[];
  pagination: Pagination;
  searchQuery: string;
  statusFilter: string;
}

const STATUS_FARBEN: Record<string, string> = {
  ENTWURF: "bg-slate-100 text-slate-700",
  GESENDET: "bg-blue-100 text-blue-700",
  BEZAHLT: "bg-green-100 text-green-700",
  UEBERFAELLIG: "bg-red-100 text-red-700",
  MAHNUNG: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
  ENTWURF: "statusEntwurf",
  GESENDET: "statusGesendet",
  BEZAHLT: "statusBezahlt",
  UEBERFAELLIG: "statusUeberfaellig",
  MAHNUNG: "statusMahnung",
};

export function RechnungenTable({ rechnungen, pagination, searchQuery, statusFilter }: RechnungenTableProps) {
  const t = useTranslations("rechnungen");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchQuery);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(updates)) {
        if (value) { params.set(key, value); } else { params.delete(key); }
      }
      startTransition(() => { router.push(`?${params.toString()}`); });
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => { e.preventDefault(); updateParams({ search, page: "1" }); },
    [search, updateParams]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const istUeberfaellig = (r: Rechnung) => {
    if (r.status === "BEZAHLT" || !r.zahlungsziel) return false;
    return new Date(r.zahlungsziel) < new Date();
  };

  const statusButtons = ["alle", "ENTWURF", "GESENDET", "BEZAHLT", "UEBERFAELLIG", "MAHNUNG"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("suchePlaceholder")} className="pl-8" />
          </div>
          <Button type="submit" variant="outline" size="default">{tc("search")}</Button>
        </form>
        <Link href="/dashboard/rechnungen/neu">
          <Button><Plus className="size-4 mr-1" />{t("neueRechnung")}</Button>
        </Link>
      </div>

      <div className="flex gap-1 flex-wrap">
        {statusButtons.map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
            onClick={() => updateParams({ status: s === "alle" ? "" : s, page: "1" })}>
            {s === "alle" ? t("filterAlle") : t(STATUS_LABELS[s] || s)}
          </Button>
        ))}
      </div>

      {rechnungen.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">{searchQuery ? t("keineErgebnisse") : t("keineRechnungen")}</p>
          {!searchQuery && (
            <Link href="/dashboard/rechnungen/neu" className="mt-4">
              <Button><Plus className="size-4 mr-1" />{t("neueRechnung")}</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("spalteNummer")}</TableHead>
                <TableHead>{t("spalteKunde")}</TableHead>
                <TableHead className="hidden sm:table-cell text-right">{t("spalteNetto")}</TableHead>
                <TableHead className="hidden md:table-cell text-right">{t("spalteBrutto")}</TableHead>
                <TableHead>{t("spalteStatus")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("spalteFaellig")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("spalteDatum")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rechnungen.map((rechnung) => (
                <TableRow key={rechnung.id} className={istUeberfaellig(rechnung) ? "bg-red-50" : ""}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/rechnungen/${rechnung.id}`} className="hover:underline">{rechnung.nummer}</Link>
                  </TableCell>
                  <TableCell>{rechnung.kunde.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-right">{formatCurrency(rechnung.netto)}</TableCell>
                  <TableCell className="hidden md:table-cell text-right font-medium">{formatCurrency(rechnung.brutto)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_FARBEN[rechnung.status] || "bg-slate-100 text-slate-700"}`}>
                      {t(STATUS_LABELS[rechnung.status] || rechnung.status)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {rechnung.zahlungsziel ? formatDate(rechnung.zahlungsziel) : "\u2013"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(rechnung.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("proSeite")}:</span>
              {[10, 25, 50].map((n) => (
                <button key={n} onClick={() => updateParams({ perPage: String(n), page: "1" })}
                  className={`px-2 py-1 rounded ${pagination.perPage === n ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{n}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("seite", { current: pagination.page, total: pagination.totalPages || 1 })}</span>
              <Button variant="outline" size="sm" disabled={pagination.page <= 1 || isPending}
                onClick={() => updateParams({ page: String(pagination.page - 1) })}>{t("zurueck")}</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages || isPending}
                onClick={() => updateParams({ page: String(pagination.page + 1) })}>{t("weiter")}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
