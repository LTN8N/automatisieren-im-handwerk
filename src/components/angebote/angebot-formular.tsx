"use client"

import { useState, useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react"

interface Position {
  beschreibung: string
  menge: number
  einheit: string
  einzelpreis: number
  ustSatz: number
  sortierung: number
}

interface Kunde {
  id: string
  name: string
}

interface AngebotFormularProps {
  angebotId?: string
}

const EINHEITEN = ["Stk", "Std", "m²", "Pauschal", "lfm", "m³"]

function formatEuro(betrag: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(betrag)
}

function berechnePosition(pos: Position) {
  const gesamtpreis = Math.round((pos.menge * pos.einzelpreis + Number.EPSILON) * 100) / 100
  const ustBetrag = Math.round((gesamtpreis * (pos.ustSatz / 100) + Number.EPSILON) * 100) / 100
  return { gesamtpreis, ustBetrag }
}

export default function AngebotFormular({ angebotId }: AngebotFormularProps) {
  const t = useTranslations("angebote")
  const tCommon = useTranslations("common")
  const router = useRouter()

  const [kundeId, setKundeId] = useState("")
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [kundenSuche, setKundenSuche] = useState("")
  const [gueltigBis, setGueltigBis] = useState("")
  const [positionen, setPositionen] = useState<Position[]>([
    { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, ustSatz: 19, sortierung: 0 },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [istBearbeitung, setIstBearbeitung] = useState(false)
  const [angebotStatus, setAngebotStatus] = useState("")

  // Kunden laden
  useEffect(() => {
    fetch("/api/kunden")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setKunden(data)
        } else if (data.kunden) {
          setKunden(data.kunden)
        }
      })
      .catch(() => {})
  }, [])

  // Bestehendes Angebot laden
  useEffect(() => {
    if (!angebotId) return
    setIstBearbeitung(true)
    fetch(`/api/angebote/${angebotId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setKundeId(data.kundeId)
        setAngebotStatus(data.status)
        if (data.gueltigBis) {
          setGueltigBis(new Date(data.gueltigBis).toISOString().split("T")[0])
        }
        if (data.positionen?.length > 0) {
          setPositionen(
            data.positionen.map((p: Position & { gesamtpreis: number }, i: number) => ({
              beschreibung: p.beschreibung,
              menge: p.menge,
              einheit: p.einheit,
              einzelpreis: p.einzelpreis,
              ustSatz: p.ustSatz,
              sortierung: i,
            }))
          )
        }
      })
      .catch(() => setError("Fehler beim Laden des Angebots."))
  }, [angebotId])

  const positionHinzufuegen = () => {
    setPositionen([
      ...positionen,
      { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, ustSatz: 19, sortierung: positionen.length },
    ])
  }

  const positionEntfernen = (index: number) => {
    if (positionen.length <= 1) return
    setPositionen(positionen.filter((_, i) => i !== index))
  }

  const positionAktualisieren = (index: number, feld: keyof Position, wert: string | number) => {
    setPositionen(positionen.map((p, i) => (i === index ? { ...p, [feld]: wert } : p)))
  }

  // Summen berechnen
  const berechnetePositionen = positionen.map((p) => berechnePosition(p))
  const netto = berechnetePositionen.reduce((sum, p) => sum + p.gesamtpreis, 0)
  const ust = berechnetePositionen.reduce((sum, p) => sum + p.ustBetrag, 0)
  const brutto = Math.round((netto + ust + Number.EPSILON) * 100) / 100

  const speichern = async () => {
    setError(null)
    setLoading(true)

    if (!kundeId) {
      setError(t("fehlerKundeErforderlich"))
      setLoading(false)
      return
    }

    const leerePositionen = positionen.some((p) => !p.beschreibung || p.einzelpreis <= 0)
    if (leerePositionen) {
      setError(t("fehlerPositionenUnvollstaendig"))
      setLoading(false)
      return
    }

    const payload = {
      kundeId,
      gueltigBis: gueltigBis || undefined,
      positionen: positionen.map((p, i) => ({ ...p, sortierung: i })),
    }

    const url = angebotId ? `/api/angebote/${angebotId}` : "/api/angebote"
    const method = angebotId ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Fehler beim Speichern.")
      return
    }

    const data = await res.json()
    router.push(`/de/dashboard/angebote/${data.id}`)
  }

  const gefilterteKunden = kunden.filter((k) =>
    k.name.toLowerCase().includes(kundenSuche.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/angebote")}
          className="rounded-xl min-h-[48px]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {istBearbeitung ? t("bearbeiten") : t("erstellen")}
          </h1>
          {istBearbeitung && angebotStatus !== "ENTWURF" && (
            <p className="text-sm text-amber-600 font-medium">
              {t("gobdWarnung")}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Kunde auswählen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("kundeAuswaehlen")}</h2>
        <div className="space-y-2">
          <Label>{t("kunde")}</Label>
          <Input
            value={kundenSuche}
            onChange={(e) => setKundenSuche(e.target.value)}
            placeholder={t("kundeSuchePlaceholder")}
            className="rounded-xl min-h-[48px]"
          />
          {kundenSuche && gefilterteKunden.length > 0 && !kundeId && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
              {gefilterteKunden.map((k) => (
                <button
                  key={k.id}
                  onClick={() => {
                    setKundeId(k.id)
                    setKundenSuche(k.name)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 text-sm border-b last:border-0"
                >
                  {k.name}
                </button>
              ))}
            </div>
          )}
          {kundeId && (
            <button
              onClick={() => { setKundeId(""); setKundenSuche("") }}
              className="text-xs text-blue-600 hover:underline"
            >
              {t("kundeAendern")}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("gueltigBis")}</Label>
          <Input
            type="date"
            value={gueltigBis}
            onChange={(e) => setGueltigBis(e.target.value)}
            className="rounded-xl min-h-[48px]"
          />
        </div>
      </div>

      {/* Positionen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t("positionen")}</h2>
          <Button
            type="button"
            onClick={positionHinzufuegen}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl min-h-[40px] text-sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("positionHinzufuegen")}
          </Button>
        </div>

        <div className="space-y-4">
          {positionen.map((pos, index) => (
            <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  {t("positionNr", { nr: index + 1 })}
                </span>
                {positionen.length > 1 && (
                  <button
                    onClick={() => positionEntfernen(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("beschreibung")}</Label>
                <Input
                  value={pos.beschreibung}
                  onChange={(e) => positionAktualisieren(index, "beschreibung", e.target.value)}
                  placeholder={t("beschreibungPlaceholder")}
                  className="rounded-xl min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("menge")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pos.menge}
                    onChange={(e) => positionAktualisieren(index, "menge", parseFloat(e.target.value) || 0)}
                    className="rounded-xl min-h-[48px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("einheit")}</Label>
                  <select
                    value={pos.einheit}
                    onChange={(e) => positionAktualisieren(index, "einheit", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm min-h-[48px]"
                  >
                    {EINHEITEN.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("einzelpreis")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pos.einzelpreis}
                    onChange={(e) => positionAktualisieren(index, "einzelpreis", parseFloat(e.target.value) || 0)}
                    className="rounded-xl min-h-[48px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("ustSatz")}</Label>
                  <select
                    value={pos.ustSatz}
                    onChange={(e) => positionAktualisieren(index, "ustSatz", parseFloat(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm min-h-[48px]"
                  >
                    <option value={19}>19 %</option>
                    <option value={7}>7 %</option>
                    <option value={0}>0 %</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between text-sm text-slate-600 pt-2 border-t">
                <span>{t("netto")}: {formatEuro(berechnetePositionen[index].gesamtpreis)}</span>
                <span>{t("ustBetrag")}: {formatEuro(berechnetePositionen[index].ustBetrag)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("zusammenfassung")}</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t("summeNetto")}</span>
            <span className="font-medium">{formatEuro(netto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t("summeUst")}</span>
            <span className="font-medium">{formatEuro(ust)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>{t("summeBrutto")}</span>
            <span>{formatEuro(brutto)}</span>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/angebote")}
          className="rounded-xl min-h-[48px]"
        >
          {tCommon("cancel")}
        </Button>
        <Button
          onClick={speichern}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl px-6 py-3 min-h-[48px]"
        >
          <Save className="mr-2 h-5 w-5" />
          {loading ? tCommon("loading") : tCommon("save")}
        </Button>
      </div>
    </div>
  )
}
