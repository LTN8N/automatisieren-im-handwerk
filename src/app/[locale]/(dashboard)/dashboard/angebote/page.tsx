"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useLocaleRouter } from "@/hooks/use-locale-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface Angebot {
  id: string
  nummer: string
  status: string
  netto: number
  brutto: number
  gueltigBis: string | null
  createdAt: string
  kunde: { id: string; name: string }
}

const STATUS_FARBEN: Record<string, string> = {
  ENTWURF: "bg-slate-100 text-slate-700",
  GESENDET: "bg-blue-50 text-blue-700",
  ANGENOMMEN: "bg-green-50 text-green-700",
  ABGELEHNT: "bg-red-50 text-red-700",
}

const STATUS_LABELS: Record<string, string> = {
  ENTWURF: "Entwurf",
  GESENDET: "Gesendet",
  ANGENOMMEN: "Angenommen",
  ABGELEHNT: "Abgelehnt",
}

function formatEuro(betrag: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(betrag)
}

function formatDatum(datum: string): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(datum))
}

export default function AngebotListePage() {
  const t = useTranslations("angebote")
  const tCommon = useTranslations("common")
  const router = useLocaleRouter()

  const [angebote, setAngebote] = useState<Angebot[]>([])
  const [gesamt, setGesamt] = useState(0)
  const [seite, setSeite] = useState(1)
  const [seiten, setSeiten] = useState(1)
  const [suche, setSuche] = useState("")
  const [statusFilter, setStatusFilter] = useState("alle")
  const [loading, setLoading] = useState(true)

  const laden = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      seite: String(seite),
      proSeite: "10",
      sortierung: "createdAt",
      richtung: "desc",
    })
    if (statusFilter !== "alle") params.set("status", statusFilter)
    if (suche) params.set("suche", suche)

    const res = await fetch(`/api/angebote?${params}`)
    if (res.ok) {
      const data = await res.json()
      setAngebote(data.angebote)
      setGesamt(data.gesamt)
      setSeiten(data.seiten)
    }
    setLoading(false)
  }, [seite, statusFilter, suche])

  useEffect(() => {
    laden()
  }, [laden])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle", { count: gesamt })}</p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/angebote/neu")}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl px-6 py-3 min-h-[48px]"
        >
          <Plus className="mr-2 h-5 w-5" />
          {t("neuesAngebot")}
        </Button>
      </div>

      {/* Filter + Suche */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={suche}
            onChange={(e) => { setSuche(e.target.value); setSeite(1) }}
            placeholder={t("suchePlaceholder")}
            className="pl-10 rounded-xl min-h-[48px]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["alle", "ENTWURF", "GESENDET", "ANGENOMMEN", "ABGELEHNT"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setSeite(1) }}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors min-h-[40px] ${
                statusFilter === s
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "alle" ? t("filterAlle") : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">{t("spalteNummer")}</th>
              <th className="px-4 py-3 font-medium text-slate-600">{t("spalteKunde")}</th>
              <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">{t("spalteNetto")}</th>
              <th className="px-4 py-3 font-medium text-slate-600">{t("spalteBrutto")}</th>
              <th className="px-4 py-3 font-medium text-slate-600">{t("spalteStatus")}</th>
              <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">{t("spalteDatum")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {tCommon("loading")}
                </td>
              </tr>
            ) : angebote.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {t("keineAngebote")}
                </td>
              </tr>
            ) : (
              angebote.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/dashboard/angebote/${a.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-sm font-medium">{a.nummer}</td>
                  <td className="px-4 py-3">{a.kunde.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{formatEuro(a.netto)}</td>
                  <td className="px-4 py-3 font-semibold">{formatEuro(a.brutto)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_FARBEN[a.status] || ""}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDatum(a.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {seiten > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t("paginierung", { von: (seite - 1) * 10 + 1, bis: Math.min(seite * 10, gesamt), gesamt })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={seite <= 1}
              onClick={() => setSeite(seite - 1)}
              className="rounded-xl min-h-[40px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={seite >= seiten}
              onClick={() => setSeite(seite + 1)}
              className="rounded-xl min-h-[40px]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
