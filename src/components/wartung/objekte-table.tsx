"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronLeft, ChevronRight, Building2 } from "lucide-react";

interface Objekt {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  buildingType: string;
  _count: { contracts: number };
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface ObjekteTableProps {
  objekte: Objekt[];
  pagination: Pagination;
  searchQuery: string;
}

export function ObjekteTable({ objekte, pagination, searchQuery }: ObjekteTableProps) {
  const t = useTranslations("wartung");
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder={t("objektSuchePlaceholder")}
            className="pl-10 rounded-xl min-h-[48px]"
          />
        </div>
        <Button
          onClick={() => router.push("objekte/neu")}
          className="rounded-xl min-h-[48px]"
        >
          <Plus className="mr-2 h-5 w-5" />
          {t("neuesObjekt")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">{t("spalteObjektName")}</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">{t("spalteAdresse")}</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">{t("spaltePLZ")}</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">{t("spalteGebaeudetyp")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("spalteVertraege")}</th>
            </tr>
          </thead>
          <tbody>
            {objekte.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("keineObjekte")}
                </td>
              </tr>
            ) : (
              objekte.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`objekte/${o.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      {o.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {o.address}, {o.city}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {o.postalCode}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {o.buildingType}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {o._count.contracts}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
