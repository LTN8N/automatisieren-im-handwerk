"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Position {
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  ustSatz: number;
  sortierung: number;
}

function berechnePosition(menge: number, einzelpreis: number, ustSatz: number) {
  const gesamtpreis = Math.round((menge * einzelpreis + Number.EPSILON) * 100) / 100;
  const ustBetrag = Math.round((gesamtpreis * (ustSatz / 100) + Number.EPSILON) * 100) / 100;
  return { gesamtpreis, ustBetrag };
}

export function RechnungFormular() {
  const t = useTranslations("rechnungen");
  const tc = useTranslations("common");
  const router = useRouter();

  const [kundeId, setKundeId] = useState("");
  const [kundeSuche, setKundeSuche] = useState("");
  const [kundenListe, setKundenListe] = useState<Array<{ id: string; name: string }>>([]);
  const [kundenDropdownOpen, setKundenDropdownOpen] = useState(false);
  const [gewaehlterKunde, setGewaehlterKunde] = useState<{ id: string; name: string } | null>(null);
  const [leistungVon, setLeistungVon] = useState("");
  const [leistungBis, setLeistungBis] = useState("");
  const [positionen, setPositionen] = useState<Position[]>([
    { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, ustSatz: 19, sortierung: 0 },
  ]);
  const [fehler, setFehler] = useState("");
  const [speichert, setSpeichert] = useState(false);

  const kundenSuchen = async (suche: string) => {
    setKundeSuche(suche);
    if (suche.length < 1) {
      setKundenListe([]);
      setKundenDropdownOpen(false);
      return;
    }
    const res = await fetch(`/api/kunden?suche=${encodeURIComponent(suche)}`);
    if (res.ok) {
      const data = await res.json();
      const kunden = data.kunden || data;
      setKundenListe(Array.isArray(kunden) ? kunden : []);
      setKundenDropdownOpen(true);
    }
  };

  const kundeWaehlen = (kunde: { id: string; name: string }) => {
    setKundeId(kunde.id);
    setGewaehlterKunde(kunde);
    setKundeSuche(kunde.name);
    setKundenDropdownOpen(false);
  };

  const positionAktualisieren = (index: number, feld: keyof Position, wert: string | number) => {
    setPositionen((prev) => prev.map((p, i) => (i === index ? { ...p, [feld]: wert } : p)));
  };

  const positionHinzufuegen = () => {
    setPositionen((prev) => [
      ...prev,
      { beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0, ustSatz: 19, sortierung: prev.length },
    ]);
  };

  const positionEntfernen = (index: number) => {
    if (positionen.length <= 1) return;
    setPositionen((prev) => prev.filter((_, i) => i !== index));
  };

  const summen = positionen.reduce(
    (acc, p) => {
      const { gesamtpreis, ustBetrag } = berechnePosition(p.menge, p.einzelpreis, p.ustSatz);
      return { netto: acc.netto + gesamtpreis, ust: acc.ust + ustBetrag };
    },
    { netto: 0, ust: 0 }
  );
  const brutto = Math.round((summen.netto + summen.ust + Number.EPSILON) * 100) / 100;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  const speichern = async () => {
    setFehler("");
    if (!kundeId) { setFehler(t("fehlerKundeErforderlich")); return; }
    const ungueltig = positionen.some((p) => !p.beschreibung.trim() || p.einzelpreis <= 0);
    if (ungueltig) { setFehler(t("fehlerPositionenUnvollstaendig")); return; }

    setSpeichert(true);
    try {
      const res = await fetch("/api/rechnungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kundeId, leistungVon: leistungVon || null, leistungBis: leistungBis || null, positionen }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFehler(data.error || "Fehler beim Speichern.");
        return;
      }

      const rechnung = await res.json();
      router.push(`/dashboard/rechnungen/${rechnung.id}`);
    } catch {
      setFehler("Netzwerkfehler beim Speichern.");
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/rechnungen">
          <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("erstellen")}</h1>
      </div>

      {fehler && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fehler}</div>
      )}

      {/* Kunde */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">{t("kunde")}</h2>
        {gewaehlterKunde ? (
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="font-medium">{gewaehlterKunde.name}</span>
            <Button variant="ghost" size="sm" onClick={() => { setGewaehlterKunde(null); setKundeId(""); setKundeSuche(""); }}>
              {t("kundeAendern")}
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input value={kundeSuche} onChange={(e) => kundenSuchen(e.target.value)} placeholder={t("kundeSuchePlaceholder")} />
            {kundenDropdownOpen && kundenListe.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border bg-background shadow-lg max-h-48 overflow-y-auto">
                {kundenListe.map((k) => (
                  <button key={k.id} className="w-full px-3 py-2 text-left hover:bg-muted text-sm" onClick={() => kundeWaehlen(k)}>
                    {k.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leistungszeitraum */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">{t("leistungszeitraum")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t("leistungVon")}</Label>
            <Input type="date" value={leistungVon} onChange={(e) => setLeistungVon(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("leistungBis")}</Label>
            <Input type="date" value={leistungBis} onChange={(e) => setLeistungBis(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Positionen */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("positionen")}</h2>
          <Button variant="outline" size="sm" onClick={positionHinzufuegen}>
            <Plus className="size-4 mr-1" />{t("positionHinzufuegen")}
          </Button>
        </div>

        {positionen.map((pos, idx) => (
          <div key={idx} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t("positionNr", { nr: idx + 1 })}</span>
              {positionen.length > 1 && (
                <Button variant="ghost" size="icon-sm" onClick={() => positionEntfernen(idx)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t("beschreibung")}</Label>
              <Input value={pos.beschreibung} onChange={(e) => positionAktualisieren(idx, "beschreibung", e.target.value)} placeholder={t("beschreibungPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>{t("menge")}</Label>
                <Input type="number" min="0.01" step="0.01" value={pos.menge} onChange={(e) => positionAktualisieren(idx, "menge", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <Label>{t("einheit")}</Label>
                <Input value={pos.einheit} onChange={(e) => positionAktualisieren(idx, "einheit", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("einzelpreis")}</Label>
                <Input type="number" min="0" step="0.01" value={pos.einzelpreis} onChange={(e) => positionAktualisieren(idx, "einzelpreis", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <Label>{t("ustSatz")}</Label>
                <select value={pos.ustSatz} onChange={(e) => positionAktualisieren(idx, "ustSatz", parseFloat(e.target.value))}
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm">
                  <option value={19}>19%</option>
                  <option value={7}>7%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4 text-sm text-muted-foreground">
              <span>{t("netto")}: {formatCurrency(berechnePosition(pos.menge, pos.einzelpreis, pos.ustSatz).gesamtpreis)}</span>
              <span>{t("ustBetrag")}: {formatCurrency(berechnePosition(pos.menge, pos.einzelpreis, pos.ustSatz).ustBetrag)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Zusammenfassung */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-2">
        <h2 className="font-semibold">{t("zusammenfassung")}</h2>
        <div className="flex justify-between text-sm">
          <span>{t("summeNetto")}</span><span>{formatCurrency(summen.netto)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t("summeUst")}</span><span>{formatCurrency(summen.ust)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>{t("summeBrutto")}</span><span>{formatCurrency(brutto)}</span>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/rechnungen"><Button variant="outline">{tc("cancel")}</Button></Link>
        <Button onClick={speichern} disabled={speichert}>{speichert ? t("laden") : tc("save")}</Button>
      </div>
    </div>
  );
}
