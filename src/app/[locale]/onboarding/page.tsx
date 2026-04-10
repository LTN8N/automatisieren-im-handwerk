"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Building2, Mail, PartyPopper, ChevronRight, ArrowLeft, SkipForward } from "lucide-react";

// --- Typen ---

interface FirmendatenForm {
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  steuernummer: string;
  ustId: string;
}

interface SmtpForm {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
}

// --- Fortschritts-Anzeige ---

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Firmendaten", icon: Building2 },
    { label: "E-Mail", icon: Mail },
    { label: "Fertig", icon: PartyPopper },
  ];

  return (
    <div className="mb-8 flex w-full max-w-sm items-center">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={index} className="flex flex-1 items-center">
            {/* Schritt-Kreis */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-semibold transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 text-white shadow-sm shadow-green-200"
                    : isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "border-2 border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Verbindungslinie (nicht nach dem letzten Schritt) */}
            {index < steps.length - 1 && (
              <div
                className={`mx-1 mb-5 h-0.5 flex-1 transition-all duration-500 ${
                  isCompleted ? "bg-green-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Schritt 1: Firmendaten ---

function StepFirmendaten({
  onWeiter,
  loading,
}: {
  onWeiter: (data: FirmendatenForm) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FirmendatenForm>({
    strasse: "",
    hausnummer: "",
    plz: "",
    stadt: "",
    steuernummer: "",
    ustId: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onWeiter(form);
  }

  const inputClass =
    "min-h-[48px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-full";
  const labelClass = "text-sm font-medium text-slate-700 mb-1.5 block";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Ihr Betrieb</h2>
        </div>
        <p className="text-sm text-slate-500 pl-12">
          Adresse und Steuerdaten für Angebote und Rechnungen.
        </p>
      </div>

      {/* Adresse */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass}>Straße</label>
          <Input
            type="text"
            placeholder="Hauptstraße"
            value={form.strasse}
            onChange={(e) => setForm({ ...form, strasse: e.target.value })}
            required
            className={inputClass}
          />
        </div>
        <div className="w-24">
          <label className={labelClass}>Nr.</label>
          <Input
            type="text"
            placeholder="12"
            value={form.hausnummer}
            onChange={(e) => setForm({ ...form, hausnummer: e.target.value })}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="w-28">
          <label className={labelClass}>PLZ</label>
          <Input
            type="text"
            placeholder="20099"
            value={form.plz}
            onChange={(e) => setForm({ ...form, plz: e.target.value })}
            required
            maxLength={10}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Stadt</label>
          <Input
            type="text"
            placeholder="Hamburg"
            value={form.stadt}
            onChange={(e) => setForm({ ...form, stadt: e.target.value })}
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Steuerdaten */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Steuerdaten (optional)
        </p>
        <div>
          <label className={labelClass}>Steuernummer</label>
          <Input
            type="text"
            placeholder="21/815/08150"
            value={form.steuernummer}
            onChange={(e) => setForm({ ...form, steuernummer: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>USt-IdNr.</label>
          <Input
            type="text"
            placeholder="DE 123 456 789"
            value={form.ustId}
            onChange={(e) => setForm({ ...form, ustId: e.target.value })}
            className={inputClass}
          />
        </div>
        <p className="text-xs text-slate-400">
          Pflichtangaben auf Rechnungen nach § 14 UStG. Können später ergänzt werden.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="mt-2 min-h-[48px] w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Wird gespeichert…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Weiter
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </form>
  );
}

// --- Schritt 2: E-Mail Konfiguration ---

function StepEmailConfig({
  onWeiter,
  onZurueck,
  onUeberspringen,
  loading,
}: {
  onWeiter: (data: SmtpForm) => void;
  onZurueck: () => void;
  onUeberspringen: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<SmtpForm>({
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onWeiter(form);
  }

  const inputClass =
    "min-h-[48px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-full";
  const labelClass = "text-sm font-medium text-slate-700 mb-1.5 block";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <Mail className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">E-Mail-Versand</h2>
        </div>
        <p className="text-sm text-slate-500 pl-12">
          Optional: Rechnungen und Angebote direkt aus der App versenden.
        </p>
      </div>

      {/* Info-Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Optional:</strong> Ohne SMTP-Konfiguration können Sie Dokumente als PDF herunterladen und selbst versenden.
      </div>

      <div>
        <label className={labelClass}>SMTP-Server</label>
        <Input
          type="text"
          placeholder="smtp.gmail.com"
          value={form.smtpHost}
          onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass}>SMTP-Port</label>
          <Input
            type="number"
            placeholder="587"
            value={form.smtpPort}
            onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Absender-E-Mail</label>
          <Input
            type="email"
            placeholder="info@firma.de"
            value={form.smtpFrom}
            onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>SMTP-Benutzername</label>
        <Input
          type="text"
          placeholder="info@firma.de"
          value={form.smtpUser}
          onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>SMTP-Passwort</label>
        <Input
          type="password"
          placeholder="App-Passwort oder SMTP-Passwort"
          value={form.smtpPassword}
          onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
        >
          {loading ? "Wird gespeichert…" : (
            <span className="flex items-center gap-2">
              Speichern & weiter
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        <button
          type="button"
          onClick={onUeberspringen}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <SkipForward className="h-4 w-4" />
          Überspringen — später einrichten
        </button>
      </div>

      <button
        type="button"
        onClick={onZurueck}
        className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </button>
    </form>
  );
}

// --- Schritt 3: Fertig ---

function StepFertig({ loading }: { loading: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      {/* Animations-Kreis */}
      <div
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100"
        style={{ animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
      >
        <Check
          className="h-12 w-12 text-green-600"
          style={{ animation: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both" }}
        />
      </div>

      <h2 className="mb-3 text-2xl font-bold text-slate-900">
        Alles bereit! 🎉
      </h2>
      <p className="mb-2 text-base text-slate-600 max-w-xs">
        Ihr Betrieb ist eingerichtet. Sie können jetzt Angebote erstellen, Rechnungen schreiben und mit der KI sprechen.
      </p>
      <p className="mb-8 text-sm text-slate-400">
        Tipp: Sagen Sie der KI einfach was Sie brauchen!
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Weiterleitung zum Dashboard…
        </div>
      )}
    </div>
  );
}

// --- Haupt-Seite ---

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveFirmendaten(data: FirmendatenForm) {
    setLoading(true);
    setError(null);

    const adresse = `${data.strasse} ${data.hausnummer}, ${data.plz} ${data.stadt}`.trim();

    const res = await fetch("/api/tenant/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adresse,
        steuernummer: data.steuernummer || null,
        ustId: data.ustId || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Speichern fehlgeschlagen.");
      return;
    }

    setStep(1);
  }

  async function saveEmailConfig(data: SmtpForm) {
    setLoading(true);
    setError(null);

    // Nur speichern wenn SMTP ausgefüllt
    if (data.smtpHost && data.smtpUser) {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailConfig: {
            host: data.smtpHost,
            port: parseInt(data.smtpPort) || 587,
            user: data.smtpUser,
            password: data.smtpPassword,
            from: data.smtpFrom || data.smtpUser,
          },
        }),
      });

      setLoading(false);

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Speichern fehlgeschlagen.");
        return;
      }
    } else {
      setLoading(false);
    }

    goToDashboard();
  }

  function goToDashboard() {
    setStep(2);
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

  return (
    <div className="w-full max-w-lg">
      {/* Willkommens-Titel */}
      {step === 0 && (
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Willkommen! Richten wir Ihren Betrieb ein.
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            3 kurze Schritte — in unter 3 Minuten startklar.
          </p>
        </div>
      )}

      {/* Fortschritts-Anzeige */}
      <div className="flex justify-center mb-2">
        <ProgressIndicator currentStep={step} />
      </div>

      {/* Fehler-Anzeige */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Schritt-Karte */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <StepFirmendaten onWeiter={saveFirmendaten} loading={loading} />
        )}
        {step === 1 && (
          <StepEmailConfig
            onWeiter={saveEmailConfig}
            onZurueck={() => setStep(0)}
            onUeberspringen={goToDashboard}
            loading={loading}
          />
        )}
        {step === 2 && <StepFertig loading={loading} />}
      </div>

      {/* Schritt-Zähler */}
      {step < 2 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Schritt {step + 1} von 2
        </p>
      )}

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
