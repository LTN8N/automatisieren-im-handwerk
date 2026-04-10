"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronLeft, ChevronRight, Mail, Phone } from "lucide-react";

interface Kunde {
  id: string;
  name: string;
  adresse: string | null;
  email: string | null;
  telefon: string | null;
  createdAt: string;
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
}

export function KundenTable({ kunden, pagination, searchQuery }: KundenTableProps) {
  const t = useTranslations("kunden");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchQuery);

  function updateSearch(value: string) {
    setSearch(value);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Suche */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder={t("suchePlaceholder")}
            className="pl-10 rounded-xl min-h-[48px]"
          />
        </div>
        <Button
          onClick={() => router.push("kunden/neu")}
          className="rounded-xl min-h-[48px]"
        >
          <Plus className="mr-2 h-5 w-5" />
          {t("neuerKunde")}
        </Button>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">{t("spalteName")}</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">{t("spalteEmail")}</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">{t("spalteTelefon")}</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">{t("spalteAdresse")}</th>
            </tr>
          </thead>
          <tbody>
            {kunden.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  {t("keineKunden")}
                </td>
              </tr>
            ) : (
              kunden.map((k) => (
                <tr
                  key={k.id}
                  onClick={() => router.push(`kunden/${k.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {k.email && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {k.email}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {k.telefon && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {k.telefon}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {k.adresse ?? "—"}
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
            {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)} von {pagination.total}
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
    </div>
  );
}
