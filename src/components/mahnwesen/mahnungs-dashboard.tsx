"use client";

import { useState } from "react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, Mail, CheckCircle } from "lucide-react";

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

interface MahnungsDashboardProps {
  rechnungId: string;
  rechnungStatus: string;
  zahlungsziel: string | null;
  brutto: number;
  kundeEmail: string | null;
  mahnungen: Mahnung[];
}

const STUFE_LABELS: Record<string, string> = {
  ERINNERUNG: "Zahlungserinnerung",
  MAHNUNG_1: "1. Mahnung",
  MAHNUNG_2: "2. Mahnung",
  INKASSO: "Inkasso-Übergabe",
};

const STUFE_FARBEN: Record<string, string> = {
  ERINNERUNG: "bg-yellow-100 text-yellow-800 border-yellow-200",
  MAHNUNG_1: "bg-orange-100 text-orange-800 border-orange-200",
  MAHNUNG_2: "bg-red-100 text-red-800 border-red-200",
  INKASSO: "bg-red-900 text-red-100 border-red-800",
};

const NAECHSTE_STUFE: Record<string, string> = {
  GESENDET: "ERINNERUNG",
  UEBERFAELLIG: "ERINNERUNG",
  ERINNERUNG: "MAHNUNG_1",
  MAHNUNG_1: "MAHNUNG_2",
  MAHNUNG_2: "INKASSO",
};

const ERLAUBTE_MAHNSTATUS = new Set([
  "GESENDET",
  "UEBERFAELLIG",
  "ERINNERUNG",
  "MAHNUNG_1",
  "MAHNUNG_2",
]);

export function MahnungsDashboard({
  rechnungId,
  rechnungStatus,
  zahlungsziel,
  brutto,
  kundeEmail,
  mahnungen,
}: MahnungsDashboardProps) {
  const router = useLocaleRouter();
  const [sending, setSending] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [showVorschau, setShowVorschau] = useState(false);

  const aktiveMahnungen = mahnungen.filter((m) => !m.storniert);
  const hoechsteStufe = aktiveMahnungen.at(-1)?.mahnstufe ?? null;
  const naechsteStufe = NAECHSTE_STUFE[hoechsteStufe ?? rechnungStatus] ?? null;
  const kannMahnen = ERLAUBTE_MAHNSTATUS.has(rechnungStatus) && naechsteStufe !== null;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const mahnungSenden = async () => {
    if (!naechsteStufe) return;
    setSending(true);
    setFehler(null);
    try {
      const res = await fetch(`/api/rechnungen/${rechnungId}/mahnungen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stufe: naechsteStufe,
          emailVersenden: !!kundeEmail,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFehler(data.error ?? "Unbekannter Fehler");
      } else {
        router.refresh();
      }
    } catch {
      setFehler("Verbindungsfehler");
    } finally {
      setSending(false);
    }
  };

  const verzugstage = zahlungsziel
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(zahlungsziel).getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  if (!ERLAUBTE_MAHNSTATUS.has(rechnungStatus) && aktiveMahnungen.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-orange-500" />
          <h2 className="font-semibold">Mahnwesen</h2>
          {hoechsteStufe && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STUFE_FARBEN[hoechsteStufe]}`}
            >
              {STUFE_LABELS[hoechsteStufe]}
            </span>
          )}
        </div>
        {verzugstage > 0 && (
          <span className="text-sm text-red-600 font-medium">
            {verzugstage} Verzugstage
          </span>
        )}
      </div>

      {/* Mahnhistorie */}
      {aktiveMahnungen.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Mahnhistorie</p>
          <div className="space-y-1.5">
            {aktiveMahnungen.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium ${STUFE_FARBEN[m.mahnstufe]}`}
                  >
                    {STUFE_LABELS[m.mahnstufe]}
                  </span>
                  <span className="text-muted-foreground">
                    {m.verzugstage} Verzugstage
                  </span>
                  {m.emailGesendetAn && (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle className="size-3" />
                      {m.emailGesendetAn}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium">{formatCurrency(Number(m.offenerBetrag))}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.gesendetAm)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktionen */}
      {kannMahnen && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
            onClick={() => setShowVorschau((v) => !v)}
          >
            <Mail className="size-3.5 mr-1.5" />
            Vorschau: {STUFE_LABELS[naechsteStufe]}
          </Button>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={mahnungSenden}
            disabled={sending}
          >
            <Bell className="size-3.5 mr-1.5" />
            {sending
              ? "Wird gesendet…"
              : `${STUFE_LABELS[naechsteStufe]} senden`}
            {kundeEmail ? "" : " (ohne E-Mail)"}
          </Button>
        </div>
      )}

      {/* Vorschau */}
      {showVorschau && naechsteStufe && (
        <MahnschreibenVorschau
          stufe={naechsteStufe}
          brutto={brutto}
          zahlungsziel={zahlungsziel}
          verzugstage={verzugstage}
        />
      )}

      {fehler && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          {fehler}
        </p>
      )}
    </div>
  );
}

function MahnschreibenVorschau({
  stufe,
  brutto,
  zahlungsziel,
  verzugstage,
}: {
  stufe: string;
  brutto: number;
  zahlungsziel: string | null;
  verzugstage: number;
}) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  const gebuehr =
    stufe === "MAHNUNG_2" ? 5.0 : stufe === "INKASSO" ? 40.0 : 0;
  const zinsenJaehrlich = brutto * (12.62 / 100);
  const zinsen =
    stufe !== "ERINNERUNG"
      ? Math.round((zinsenJaehrlich / 365) * verzugstage * 100) / 100
      : 0;

  return (
    <div className="rounded-lg border border-dashed p-4 text-sm space-y-2 bg-muted/30">
      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
        Mahnschreiben-Vorschau — {STUFE_LABELS[stufe]}
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Offener Betrag:</span>
          <p className="font-medium">{formatCurrency(brutto)}</p>
        </div>
        {gebuehr > 0 && (
          <div>
            <span className="text-muted-foreground">Mahngebühr:</span>
            <p className="font-medium">{formatCurrency(gebuehr)}</p>
          </div>
        )}
        {zinsen > 0 && (
          <div>
            <span className="text-muted-foreground">Verzugszinsen ({verzugstage} Tage):</span>
            <p className="font-medium">{formatCurrency(zinsen)}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Gesamtforderung:</span>
          <p className="font-bold">{formatCurrency(brutto + gebuehr + zinsen)}</p>
        </div>
        {zahlungsziel && (
          <div>
            <span className="text-muted-foreground">Fälligkeit war:</span>
            <p>{new Date(zahlungsziel).toLocaleDateString("de-DE")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
