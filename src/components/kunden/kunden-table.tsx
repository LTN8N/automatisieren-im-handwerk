"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { ArrowUpDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { KundeDeleteDialog } from "./kunde-delete-dialog";

interface Kunde {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;
  createdAt: string;
  _count: {
    angebote: number;
    rechnungen: number;
  };
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface KundenTableProps {
  kunden: Kunde[];
  pagination: Pagination;
  searchQuery: string;
  sortBy: string;
  sortOrder: string;
}

export function KundenTable({
  kunden,
  pagination,
  searchQuery,
  sortBy,
  sortOrder,
}: KundenTableProps) {
  const t = useTranslations("kunden");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchQuery);
  const [deleteKunde, setDeleteKunde] = useState<Kunde | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateParams({ search, page: "1" });
    },
    [search, updateParams]
  );

  const handleSort = useCallback(
    (field: string) => {
      const newOrder =
        sortBy === field && sortOrder === "asc" ? "desc" : "asc";
      updateParams({ sortBy: field, sortOrder: newOrder });
    },
    [sortBy, sortOrder, updateParams]
  );

  const handlePerPage = useCallback(
    (value: string) => {
      updateParams({ perPage: value, page: "1" });
    },
    [updateParams]
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {children}
      <ArrowUpDown className="size-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="outline" size="default">
            {tc("search")}
          </Button>
        </form>
        <Link href="/dashboard/kunden/neu">
          <Button>
            <Plus className="size-4" data-icon="inline-start" />
            {t("newKunde")}
          </Button>
        </Link>
      </div>

      {kunden.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? t("noResults") : t("noKunden")}
          </p>
          {!searchQuery && (
            <Link href="/dashboard/kunden/neu" className="mt-4">
              <Button>
                <Plus className="size-4" data-icon="inline-start" />
                {t("newKunde")}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="name">{t("name")}</SortButton>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortButton field="email">{t("email")}</SortButton>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortButton field="telefon">{t("telefon")}</SortButton>
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center">
                  {t("angebote")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortButton field="createdAt">{t("createdAt")}</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  {tc("edit")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kunden.map((kunde) => (
                <TableRow key={kunde.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/kunden/${kunde.id}`}
                      className="hover:underline"
                    >
                      {kunde.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {kunde.email ?? "–"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {kunde.telefon ?? "–"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center">
                    {kunde._count.angebote}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {formatDate(kunde.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/kunden/${kunde.id}`}>
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="size-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteKunde(kunde)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("perPage")}:</span>
              {[10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => handlePerPage(String(n))}
                  className={`px-2 py-1 rounded ${
                    pagination.perPage === n
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("page", {
                  current: pagination.page,
                  total: pagination.totalPages || 1,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isPending}
                onClick={() =>
                  updateParams({ page: String(pagination.page - 1) })
                }
              >
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  pagination.page >= pagination.totalPages || isPending
                }
                onClick={() =>
                  updateParams({ page: String(pagination.page + 1) })
                }
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </>
      )}

      {deleteKunde && (
        <KundeDeleteDialog
          kunde={deleteKunde}
          open={!!deleteKunde}
          onOpenChange={(open) => {
            if (!open) setDeleteKunde(null);
          }}
          onDeleted={() => {
            setDeleteKunde(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
