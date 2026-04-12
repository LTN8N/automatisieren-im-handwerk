"use client";

import { useTranslations } from "next-intl";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Send, CheckCircle, Archive, Clock, FileText } from "lucide-react";
import { MahnungsDashboard } from "@/components/mahnwesen/mahnungs-dashboard";

interface Position {
  id: string;
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
  ustSatz: number;
  ustBetrag: number;
}

interface Historie {
  id: string;
  quelle: string;
  wasGeaendert: string;
  alterWert: string | null;
  neuerWert: string | null;
  createdAt: string;
}

interface Mahnung {
  id: string;
  mahnstufe: "ERINNERUNG" | "MAHNUNG_1" | "MAHNUNG_2" | "INKASSO";
  offenerBetrag: number;
  mahngebuehr: number;
  verzugszinsen: number;
  verzugstage: number;
  emailGesendetAn: string | null;
  gesendetAm: string;
  storniert: boolean;
  notizen: string | null;
}

interface RechnungData {
  id: string;
  nummer: string;
  status: string;
  netto: number;
  ust: number;
  brutto: number;
  zahlungsziel: string | null;
  bezahltAm: string | null;
  leistungVon: string | null;
  leistungBis: string | null;
  gesperrt: boolean;
  createdAt: string;
  kunde: { id: string; name: string; adresse: string | null; email: string | null };
  angebot: { id: string; nummer: string } | null;
  positionen: Position[];
  historie: Historie[];
  mahnungen?: Mahnung[];
}

const STATUS_FARBEN: Record<string, string> = {
  ENTWURF: "bg-slate-100 text-slate-700",
  GESENDET: "bg-blue-100 text-blue-700",
  BEZAHLT: "bg-green-100 text-green-700",
  UEBERFAELLIG: "bg-red-100 text-red-700",
  MAHNUNG: "bg-orange-100 text-orange-700",
  ERINNERUNG: "bg-yellow-100 text-yellow-800",
  MAHNUNG_1: "bg-orange-100 text-orange-800",
  MAHNUNG_2: "bg-red-100 text-red-800",
  INKASSO: "bg-red-900 text-red-100",
  STORNIERT: "bg-slate-100 text-slate-500 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  ENTWURF: "statusEntwurf",
  GESENDET: "statusGesendet",
  BEZAHLT: "statusBezahlt",
  UEBERFAELLIG: "statusUeberfaellig",
  MAHNUNG: "statusMahnung",
  ERINNERUNG: "Zahlungserinnerung",
  MAHNUNG_1: "1. Mahnung",
  MAHNUNG_2: "2. Mahnung",
  INKASSO: "Inkasso",
  STORNIERT: "Storniert",
};

export function RechnungDetail({ rechnung }: { rechnung: RechnungData }) {
  const t = useTranslations("rechnungen");
  const router = useLocaleRouter();
  const [updating, setUpdating] = useState(false);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const statusWechseln = async (neuerStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/rechnungen/${rechnung.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: neuerStatus }),
      });
      if (res.ok) { router.refresh(); }
    } finally {
      setUpdating(false);
    }
  };

  const archivieren = async () => {
    if (!confirm(t("archivierenBestaetigung"))) return;
    const res = await fetch(`/api/rechnungen/${rechnung.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/dashboard/rechnungen"); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/rechnungen">
            <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{rechnung.nummer}</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_FARBEN[rechnung.status] || ""}`}>
              {["ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2", "INKASSO", "STORNIERT"].includes(rechnung.status)
                ? STATUS_LABELS[rechnung.status]
                : t(STATUS_LABELS[rechnung.status] || rechnung.status)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {rechnung.status === "ENTWURF" && (
            <Button size="sm" onClick={() => statusWechseln("GESENDET")} disabled={updating}>
              <Send className="size-3.5 mr-1" />{t("senden")}
            </Button>
          )}
          {["GESENDET", "UEBERFAELLIG", "MAHNUNG", "ERINNERUNG", "MAHNUNG_1", "MAHNUNG_2"].includes(rechnung.status) && (
            <Button size="sm" variant="outline" onClick={() => statusWechseln("BEZAHLT")} disabled={updating}
              className="text-green-700 border-green-300 hover:bg-green-50">
              <CheckCircle className="size-3.5 mr-1" />{t("alsBezahltMarkieren")}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={archivieren}>
            <Archive className="size-3.5 mr-1" />{t("archivieren")}
          </Button>
        </div>
      </div>

      {/* GoBD Hinweis */}
      {rechnung.gesperrt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t("gesperrtHinweis")}</div>
      )}

      {/* Angebot-Referenz */}
      {rechnung.angebot && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm flex items-center gap-2">
          <FileText className="size-4 text-blue-600" />
          <span>{t("ausAngebot")}: {rechnung.angebot.nummer}</span>
        </div>
      )}

      {/* Kunde */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-2">
        <h2 className="font-semibold">{t("kundeInfo")}</h2>
        <p className="font-medium">{rechnung.kunde.name}</p>
        {rechnung.kunde.adresse && <p className="text-sm text-muted-foreground">{rechnung.kunde.adresse}</p>}
        {rechnung.kunde.email && <p className="text-sm text-muted-foreground">{rechnung.kunde.email}</p>}
      </div>

      {/* Details */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-2">
        <h2 className="font-semibold">{t("details")}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t("erstelltAm")}</span>
            <p>{formatDate(rechnung.createdAt)}</p>
          </div>
          {rechnung.zahlungsziel && (
            <div>
              <span className="text-muted-foreground">{t("zahlungsziel")}</span>
              <p>{formatDate(rechnung.zahlungsziel)}</p>
            </div>
          )}
          {rechnung.leistungVon && (
            <div>
              <span className="text-muted-foreground">{t("leistungVon")}</span>
              <p>{formatDate(rechnung.leistungVon)}</p>
            </div>
          )}
          {rechnung.leistungBis && (
            <div>
              <span className="text-muted-foreground">{t("leistungBis")}</span>
              <p>{formatDate(rechnung.leistungBis)}</p>
            </div>
          )}
          {rechnung.bezahltAm && (
            <div>
              <span className="text-muted-foreground">{t("bezahltAm")}</span>
              <p>{formatDate(rechnung.bezahltAm)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Positionen */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">{t("positionen")}</h2>
        <div className="space-y-2">
          {rechnung.positionen.map((pos) => (
            <div key={pos.id} className="flex items-start justify-between py-2 border-b last:border-0">
              <div className="flex-1">
                <p className="font-medium">{pos.beschreibung}</p>
                <p className="text-sm text-muted-foreground">
                  {pos.menge} {pos.einheit} &times; {formatCurrency(pos.einzelpreis)} &middot; {pos.ustSatz}% USt
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(pos.gesamtpreis)}</p>
                <p className="text-xs text-muted-foreground">+{formatCurrency(pos.ustBetrag)} USt</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span>{t("summeNetto")}</span><span>{formatCurrency(rechnung.netto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t("summeUst")}</span><span>{formatCurrency(rechnung.ust)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>{t("summeBrutto")}</span><span>{formatCurrency(rechnung.brutto)}</span>
          </div>
        </div>
      </div>

      {/* Mahnwesen */}
      <MahnungsDashboard
        rechnungId={rechnung.id}
        rechnungStatus={rechnung.status}
        zahlungsziel={rechnung.zahlungsziel}
        brutto={rechnung.brutto}
        kundeEmail={rechnung.kunde.email}
        mahnungen={rechnung.mahnungen ?? []}
      />

      {/* Historie */}
      {rechnung.historie.length > 0 && (
        <div className="rounded-xl border p-4 sm:p-6 space-y-3">
          <h2 className="font-semibold">{t("aenderungshistorie")}</h2>
          <div className="space-y-2">
            {rechnung.historie.map((h) => (
              <div key={h.id} className="flex items-start gap-2 text-sm">
                <Clock className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">{h.wasGeaendert}</span>
                  {h.alterWert && <span className="text-muted-foreground"> {h.alterWert} &rarr; </span>}
                  {h.neuerWert && <span>{h.neuerWert}</span>}
                  <span className="block text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
