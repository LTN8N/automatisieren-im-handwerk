"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useLocaleRouter } from "@/hooks/use-locale-router"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Edit, Send, Check, X, Clock, Trash2, Receipt, Plus, Save } from "lucide-react"

interface Position {
  id: string
  beschreibung: string
  menge: number
  einheit: string
  einzelpreis: number
  gesamtpreis: number
  ustSatz: number
  ustBetrag: number
  sortierung: number
}

interface EditPosition {
  beschreibung: string
  menge: number
  einheit: string
  einzelpreis: number
  ustSatz: number
}

interface HistorieEintrag {
  id: string
  quelle: string
  wasGeaendert: string
  alterWert: string | null
  neuerWert: string | null
  createdAt: string
}

interface Angebot {
  id: string
  nummer: string
  status: string
  netto: number
  ust: number
  brutto: number
  gueltigBis: string | null
  createdAt: string
  kunde: { id: string; name: string; adresse: string | null; email: string | null }
  positionen: Position[]
  historie: HistorieEintrag[]
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

const ERLAUBTE_UEBERGAENGE: Record<string, Array<{ status: string; label: string; icon: typeof Send; farbe: string }>> = {
  ENTWURF: [
    { status: "GESENDET", label: "Senden", icon: Send, farbe: "bg-blue-500 hover:bg-blue-600 text-white" },
  ],
  GESENDET: [
    { status: "ANGENOMMEN", label: "Angenommen", icon: Check, farbe: "bg-green-500 hover:bg-green-600 text-white" },
    { status: "ABGELEHNT", label: "Abgelehnt", icon: X, farbe: "bg-red-500 hover:bg-red-600 text-white" },
  ],
  ANGENOMMEN: [],
  ABGELEHNT: [],
}

function formatEuro(betrag: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(betrag))
}

function formatDatum(datum: string): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(datum))
}

function formatZeit(datum: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(datum))
}

function berechnePosition(p: EditPosition) {
  const netto = Math.round(p.menge * p.einzelpreis * 100) / 100
  const ust = Math.round(netto * (p.ustSatz / 100) * 100) / 100
  return { netto, ust, brutto: Math.round((netto + ust) * 100) / 100 }
}

const LEERE_POSITION: EditPosition = { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, ustSatz: 19 }

export default function AngebotDetailPage() {
  const t = useTranslations("angebote")
  const router = useLocaleRouter()
  const params = useParams()
  const angebotId = params?.id as string

  const [angebot, setAngebot] = useState<Angebot | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [rechnungLoading, setRechnungLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editPositionen, setEditPositionen] = useState<EditPosition[]>([])

  const laden = async () => {
    setLoading(true)
    const res = await fetch(`/api/angebote/${angebotId}`)
    if (res.ok) {
      const data = await res.json()
      setAngebot(data)
    } else {
      setError("Angebot nicht gefunden.")
    }
    setLoading(false)
  }

  useEffect(() => { laden() }, [angebotId])

  const startEdit = () => {
    if (!angebot) return
    setEditPositionen(
      angebot.positionen.map(p => ({
        beschreibung: p.beschreibung,
        menge: Number(p.menge),
        einheit: p.einheit,
        einzelpreis: Number(p.einzelpreis),
        ustSatz: Number(p.ustSatz),
      }))
    )
    setEditMode(true)
    setError(null)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEditPositionen([])
  }

  const updatePosition = (idx: number, field: keyof EditPosition, value: string | number) => {
    setEditPositionen(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const addPosition = () => {
    setEditPositionen(prev => [...prev, { ...LEERE_POSITION }])
  }

  const removePosition = (idx: number) => {
    setEditPositionen(prev => prev.filter((_, i) => i !== idx))
  }

  const saveEdit = async () => {
    if (editPositionen.length === 0) {
      setError("Mindestens eine Position erforderlich.")
      return
    }
    if (editPositionen.some(p => !p.beschreibung.trim())) {
      setError("Alle Positionen brauchen eine Beschreibung.")
      return
    }

    setSaving(true)
    setError(null)

    const res = await fetch(`/api/angebote/${angebotId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kundeId: angebot?.kunde.id,
        positionen: editPositionen.map((p, i) => ({ ...p, sortierung: i })),
      }),
    })

    setSaving(false)

    if (res.ok) {
      setEditMode(false)
      await laden()
    } else {
      const data = await res.json()
      setError(data.error || "Speichern fehlgeschlagen.")
    }
  }

  // Summen live berechnen im Edit-Mode
  const editSummen = editPositionen.reduce(
    (acc, p) => {
      const calc = berechnePosition(p)
      return { netto: acc.netto + calc.netto, ust: acc.ust + calc.ust, brutto: acc.brutto + calc.brutto }
    },
    { netto: 0, ust: 0, brutto: 0 }
  )

  const statusWechseln = async (neuerStatus: string) => {
    setStatusLoading(true)
    const res = await fetch(`/api/angebote/${angebotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: neuerStatus }),
    })
    if (res.ok) {
      await laden()
    } else {
      const data = await res.json()
      setError(data.error)
    }
    setStatusLoading(false)
  }

  const rechnungErstellen = async () => {
    if (!confirm("Soll aus diesem Angebot eine Rechnung erstellt werden?")) return
    setRechnungLoading(true)
    const res = await fetch(`/api/rechnungen/${angebotId}/aus-angebot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zahlungszielTage: 14 }),
    })
    if (res.ok) {
      const rechnung = await res.json()
      router.push(`/dashboard/rechnungen/${rechnung.id}`)
    } else {
      const data = await res.json()
      setError(data.error || "Rechnung konnte nicht erstellt werden.")
    }
    setRechnungLoading(false)
  }

  const archivieren = async () => {
    if (!confirm(t("archivierenBestaetigung"))) return
    const res = await fetch(`/api/angebote/${angebotId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/angebote")
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-slate-400">{t("laden")}</p></div>
  }

  if (!angebot) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/angebote")} className="rounded-xl">
          <ArrowLeft className="mr-2 h-5 w-5" /> {t("zurueckZurListe")}
        </Button>
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error || "Angebot nicht gefunden."}
        </div>
      </div>
    )
  }

  const uebergaenge = ERLAUBTE_UEBERGAENGE[angebot.status] || []

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/angebote")} className="rounded-xl min-h-[48px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{angebot.nummer}</h1>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_FARBEN[angebot.status]}`}>
                {STATUS_LABELS[angebot.status]}
              </span>
            </div>
            <p className="text-sm text-slate-500">{angebot.kunde.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!editMode && angebot.status === "ENTWURF" && (
            <Button onClick={startEdit} variant="outline" className="rounded-xl min-h-[48px]">
              <Edit className="mr-2 h-4 w-4" /> {t("bearbeiten")}
            </Button>
          )}
          {angebot.status === "ANGENOMMEN" && (
            <Button onClick={rechnungErstellen} disabled={rechnungLoading}
              className="rounded-xl min-h-[48px] font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
              <Receipt className="mr-2 h-4 w-4" /> Rechnung erstellen
            </Button>
          )}
          {!editMode && uebergaenge.map((u) => {
            const Icon = u.icon
            return (
              <Button key={u.status} onClick={() => statusWechseln(u.status)} disabled={statusLoading}
                className={`rounded-xl min-h-[48px] font-semibold ${u.farbe}`}>
                <Icon className="mr-2 h-4 w-4" /> {u.label}
              </Button>
            )
          })}
          {!editMode && (
            <Button onClick={archivieren} variant="outline"
              className="rounded-xl min-h-[48px] text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" /> {t("archivieren")}
            </Button>
          )}
        </div>
      </div>

      {/* Kundendaten + Metadaten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500 mb-2">{t("kundeInfo")}</h2>
          <p className="font-semibold text-slate-900">{angebot.kunde.name}</p>
          {angebot.kunde.adresse && <p className="text-sm text-slate-600">{angebot.kunde.adresse}</p>}
          {angebot.kunde.email && <p className="text-sm text-slate-600">{angebot.kunde.email}</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500 mb-2">{t("details")}</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">{t("erstelltAm")}</span>
              <span>{formatDatum(angebot.createdAt)}</span>
            </div>
            {angebot.gueltigBis && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t("gueltigBis")}</span>
                <span>{formatDatum(angebot.gueltigBis)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Positionen — View oder Edit Mode */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t("positionen")}</h2>
          {editMode && (
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={saving} size="sm" className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white">
                <Save className="mr-1 h-4 w-4" /> {saving ? "Speichern..." : "Speichern"}
              </Button>
              <Button onClick={cancelEdit} size="sm" variant="outline" className="rounded-xl">
                Abbrechen
              </Button>
            </div>
          )}
        </div>

        {editMode ? (
          /* ===== EDIT MODE ===== */
          <div className="p-4 sm:p-6 space-y-4">
            {editPositionen.map((pos, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border bg-slate-50">
                <div className="flex-1 space-y-2">
                  <Input
                    value={pos.beschreibung}
                    onChange={(e) => updatePosition(idx, "beschreibung", e.target.value)}
                    placeholder="Beschreibung *"
                    className="min-h-[44px]"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input
                      type="number"
                      value={pos.menge}
                      onChange={(e) => updatePosition(idx, "menge", Number(e.target.value))}
                      placeholder="Menge"
                      min={0}
                      step="0.01"
                      className="min-h-[44px]"
                    />
                    <Input
                      value={pos.einheit}
                      onChange={(e) => updatePosition(idx, "einheit", e.target.value)}
                      placeholder="Einheit"
                      className="min-h-[44px]"
                    />
                    <Input
                      type="number"
                      value={pos.einzelpreis}
                      onChange={(e) => updatePosition(idx, "einzelpreis", Number(e.target.value))}
                      placeholder="Einzelpreis"
                      min={0}
                      step="0.01"
                      className="min-h-[44px]"
                    />
                    <Input
                      type="number"
                      value={pos.ustSatz}
                      onChange={(e) => updatePosition(idx, "ustSatz", Number(e.target.value))}
                      placeholder="USt %"
                      min={0}
                      step="0.5"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Netto: {formatEuro(berechnePosition(pos).netto)} | USt: {formatEuro(berechnePosition(pos).ust)} | Brutto: {formatEuro(berechnePosition(pos).brutto)}
                  </div>
                </div>
                <Button onClick={() => removePosition(idx)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700 self-start">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button onClick={addPosition} variant="outline" className="w-full rounded-xl min-h-[48px]">
              <Plus className="mr-2 h-4 w-4" /> Position hinzufuegen
            </Button>

            {/* Live Summen */}
            <div className="border-t pt-4">
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-8 text-sm"><span className="text-slate-600">Netto</span><span className="font-medium w-28 text-right">{formatEuro(editSummen.netto)}</span></div>
                <div className="flex gap-8 text-sm"><span className="text-slate-600">USt</span><span className="font-medium w-28 text-right">{formatEuro(editSummen.ust)}</span></div>
                <div className="flex gap-8 text-base font-bold border-t pt-2 mt-1"><span>Brutto</span><span className="w-28 text-right">{formatEuro(editSummen.brutto)}</span></div>
              </div>
            </div>
          </div>
        ) : (
          /* ===== VIEW MODE ===== */
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">{t("beschreibung")}</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">{t("menge")}</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">{t("einheit")}</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">{t("einzelpreis")}</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">{t("ustSatz")}</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">{t("netto")}</th>
                  </tr>
                </thead>
                <tbody>
                  {angebot.positionen.map((pos, i) => (
                    <tr key={pos.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">{pos.beschreibung}</td>
                      <td className="px-4 py-3 text-right">{Number(pos.menge)}</td>
                      <td className="px-4 py-3">{pos.einheit}</td>
                      <td className="px-4 py-3 text-right">{formatEuro(Number(pos.einzelpreis))}</td>
                      <td className="px-4 py-3 text-right">{Number(pos.ustSatz)} %</td>
                      <td className="px-4 py-3 text-right font-medium">{formatEuro(Number(pos.gesamtpreis))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t p-4 sm:p-6">
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-8 text-sm"><span className="text-slate-600">{t("summeNetto")}</span><span className="font-medium w-28 text-right">{formatEuro(Number(angebot.netto))}</span></div>
                <div className="flex gap-8 text-sm"><span className="text-slate-600">{t("summeUst")}</span><span className="font-medium w-28 text-right">{formatEuro(Number(angebot.ust))}</span></div>
                <div className="flex gap-8 text-base font-bold border-t pt-2 mt-1"><span>{t("summeBrutto")}</span><span className="w-28 text-right">{formatEuro(Number(angebot.brutto))}</span></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Aenderungshistorie */}
      {angebot.historie.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("aenderungshistorie")}</h2>
          <div className="space-y-3">
            {angebot.historie.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-700">
                    <span className="font-medium">{h.wasGeaendert}</span>
                    {h.alterWert && (
                      <>: <span className="text-red-600 line-through">{h.alterWert}</span>{" → "}<span className="text-green-600">{h.neuerWert}</span></>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{formatZeit(h.createdAt)} · {h.quelle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
