"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Mail, Receipt, Hash, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- Types ---

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
}

interface Nummernkreise {
  angebote: { anzahl: number; letzteNummer: string | null };
  rechnungen: { anzahl: number; letzteNummer: string | null };
}

interface TenantData {
  id: string;
  name: string;
  adresse: string | null;
  steuernummer: string | null;
  ustId: string | null;
  logo: string | null;
  bankName: string | null;
  bankIban: string | null;
  bankBic: string | null;
  emailConfig: EmailConfig | null;
  ustSatz: number;
  land: "DE" | "AT" | "CH";
  waehrung: string;
  sprache: string;
  _nummernkreise: Nummernkreise;
}

// --- Tab definitions ---

const UST_SAETZE: Record<string, { standard: number; ermaessigt: number; label: string }> = {
  DE: { standard: 19, ermaessigt: 7, label: "Deutschland (DE)" },
  AT: { standard: 20, ermaessigt: 10, label: "Österreich (AT)" },
  CH: { standard: 8.1, ermaessigt: 2.6, label: "Schweiz (CH)" },
};

// --- Sub-components ---

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

// --- Tab: Firmendaten ---

function FirmendatenTab({ tenant, onSave }: { tenant: TenantData; onSave: (data: Partial<TenantData>) => Promise<void> }) {
  const t = useTranslations("einstellungen");
  const tc = useTranslations("common");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);

    const name = fd.get("name") as string;
    if (!name.trim()) {
      setErrors({ name: t("nameRequired") });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        adresse: fd.get("adresse") as string,
        steuernummer: fd.get("steuernummer") as string || null,
        ustId: fd.get("ustId") as string || null,
        bankName: fd.get("bankName") as string || null,
        bankIban: fd.get("bankIban") as string || null,
        bankBic: fd.get("bankBic") as string || null,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("firmendaten")}</CardTitle>
          <CardDescription>{t("firmendatenDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("firmenname")} *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={tenant.name}
              placeholder="Mustermann GmbH"
              required
              aria-invalid={!!errors.name}
              className="h-12 text-base md:h-9 md:text-sm"
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">{t("adresse")}</Label>
            <textarea
              id="adresse"
              name="adresse"
              defaultValue={tenant.adresse ?? ""}
              placeholder={t("adressePlaceholder")}
              rows={3}
              className="flex min-h-[80px] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="steuernummer">{t("steuernummer")}</Label>
              <Input
                id="steuernummer"
                name="steuernummer"
                defaultValue={tenant.steuernummer ?? ""}
                placeholder="12/345/67890"
                className="h-12 text-base md:h-9 md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ustId">{t("ustId")}</Label>
              <Input
                id="ustId"
                name="ustId"
                defaultValue={tenant.ustId ?? ""}
                placeholder="DE123456789"
                className="h-12 text-base md:h-9 md:text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("bankdaten")}</CardTitle>
          <CardDescription>{t("bankdatenDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">{t("bankName")}</Label>
            <Input
              id="bankName"
              name="bankName"
              defaultValue={tenant.bankName ?? ""}
              placeholder="Sparkasse Hamburg"
              className="h-12 text-base md:h-9 md:text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankIban">{t("iban")}</Label>
              <Input
                id="bankIban"
                name="bankIban"
                defaultValue={tenant.bankIban ?? ""}
                placeholder="DE12 3456 7890 1234 5678 90"
                className="h-12 font-mono text-base md:h-9 md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankBic">{t("bic")}</Label>
              <Input
                id="bankBic"
                name="bankBic"
                defaultValue={tenant.bankBic ?? ""}
                placeholder="SSKMDEMMXXX"
                className="h-12 font-mono text-base md:h-9 md:text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} size="lg" className="min-h-[48px] px-6">
          {isSaving && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

// --- Tab: E-Mail ---

function EmailTab({ tenant, onSave }: { tenant: TenantData; onSave: (data: Partial<TenantData>) => Promise<void> }) {
  const t = useTranslations("einstellungen");
  const tc = useTranslations("common");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const cfg = tenant.emailConfig;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emailConfig = {
      host: fd.get("host") as string,
      port: Number(fd.get("port")),
      user: fd.get("user") as string,
      password: fd.get("password") as string,
      from: fd.get("from") as string,
      secure: fd.get("secure") === "on",
    };

    setIsSaving(true);
    try {
      await onSave({ emailConfig });
      toast.success(t("saveSuccess"));
      setTestResult(null);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/einstellungen/smtp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: fd.get("host"),
          port: Number(fd.get("port")),
          user: fd.get("user"),
          password: fd.get("password"),
          from: fd.get("from"),
          secure: fd.get("secure") === "on",
        }),
      });
      if (res.ok) {
        setTestResult({ ok: true, message: t("smtpTestSuccess") });
      } else {
        const body = await res.json().catch(() => ({}));
        setTestResult({ ok: false, message: body.error ?? t("smtpTestError") });
      }
    } catch {
      setTestResult({ ok: false, message: t("smtpTestError") });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} id="email-form" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("smtpKonfiguration")}</CardTitle>
          <CardDescription>{t("smtpDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor="host">{t("smtpHost")}</Label>
              <Input
                id="host"
                name="host"
                defaultValue={cfg?.host ?? ""}
                placeholder="smtp.gmail.com"
                className="h-12 text-base md:h-9 md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">{t("smtpPort")}</Label>
              <Input
                id="port"
                name="port"
                type="number"
                defaultValue={cfg?.port ?? 587}
                min={1}
                max={65535}
                className="h-12 text-base md:h-9 md:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user">{t("smtpUser")}</Label>
              <Input
                id="user"
                name="user"
                type="email"
                defaultValue={cfg?.user ?? ""}
                placeholder="absender@firma.de"
                autoComplete="off"
                className="h-12 text-base md:h-9 md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("smtpPassword")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue={cfg?.password ?? ""}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-12 text-base md:h-9 md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">{t("smtpFrom")}</Label>
            <Input
              id="from"
              name="from"
              type="email"
              defaultValue={cfg?.from ?? ""}
              placeholder="noreply@firma.de"
              className="h-12 text-base md:h-9 md:text-sm"
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-input bg-muted/30 px-3 py-3">
            <input
              id="secure"
              name="secure"
              type="checkbox"
              defaultChecked={cfg?.secure ?? true}
              className="h-5 w-5 rounded border-input accent-primary"
            />
            <div>
              <Label htmlFor="secure" className="cursor-pointer font-medium">
                {t("smtpSecure")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("smtpSecureHint")}</p>
            </div>
          </div>

          {testResult && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-sm",
                testResult.ok
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              )}
            >
              {testResult.ok ? (
                <CheckCircle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              )}
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {/* Test button submits the same form data but to a different handler */}
        <button
          type="button"
          form="email-form"
          onClick={async (e) => {
            const form = (e.currentTarget as HTMLElement).closest("form") as HTMLFormElement | null;
            if (form) await handleTest({ preventDefault: () => {}, currentTarget: form } as React.FormEvent<HTMLFormElement>);
          }}
          disabled={isTesting || isSaving}
          className={cn(
            "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          {isTesting && <Loader2 className="size-4 animate-spin" />}
          {t("smtpTest")}
        </button>
        <Button type="submit" disabled={isSaving || isTesting} size="lg" className="min-h-[48px] px-6">
          {isSaving && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

// --- Tab: Steuern ---

function SteuernTab({ tenant, onSave }: { tenant: TenantData; onSave: (data: Partial<TenantData>) => Promise<void> }) {
  const t = useTranslations("einstellungen");
  const tc = useTranslations("common");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLand, setSelectedLand] = useState<string>(tenant.land ?? "DE");
  const [customUst, setCustomUst] = useState<number>(tenant.ustSatz ?? 19);

  const saetze = UST_SAETZE[selectedLand] ?? UST_SAETZE.DE;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        land: selectedLand as "DE" | "AT" | "CH",
        ustSatz: customUst,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("steuerland")}</CardTitle>
          <CardDescription>{t("steuerlandDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="land">{t("land")}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              {Object.entries(UST_SAETZE).map(([code, info]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setSelectedLand(code);
                    setCustomUst(info.standard);
                  }}
                  className={cn(
                    "flex flex-1 min-h-[56px] flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-all",
                    selectedLand === code
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <span className="font-semibold text-sm">{code}</span>
                  <span className="text-xs text-muted-foreground">{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <SectionHeader title={t("ustSaetze")} description={t("ustSaetzeDescription")} />
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-2xl font-bold">{saetze.standard}%</p>
                <p className="text-xs text-muted-foreground mt-1">{t("standardsatz")}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-2xl font-bold">{saetze.ermaessigt}%</p>
                <p className="text-xs text-muted-foreground mt-1">{t("ermaessigterSatz")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ustSatz">{t("standardUstSatz")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="ustSatz"
                name="ustSatz"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={customUst}
                onChange={(e) => setCustomUst(Number(e.target.value))}
                className="h-12 w-28 text-base md:h-9 md:text-sm"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomUst(saetze.standard)}
                  className="h-9 text-xs"
                >
                  {saetze.standard}% ({t("standard")})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomUst(saetze.ermaessigt)}
                  className="h-9 text-xs"
                >
                  {saetze.ermaessigt}% ({t("ermaessigt")})
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("ustSatzHint")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} size="lg" className="min-h-[48px] px-6">
          {isSaving && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}

// --- Tab: Nummernkreise ---

function NummernkreiseTab({ tenant }: { tenant: TenantData }) {
  const t = useTranslations("einstellungen");
  const nk = tenant._nummernkreise;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("nummernkreise")}</CardTitle>
          <CardDescription>{t("nummernkreiseDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Angebote */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Receipt className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-sm">{t("angebote")}</h4>
              </div>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{t("anzahl")}</dt>
                  <dd className="font-mono font-medium">{nk.angebote.anzahl}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{t("letzteNummer")}</dt>
                  <dd className="font-mono font-medium">{nk.angebote.letzteNummer ?? "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Rechnungen */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Hash className="size-4 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-medium text-sm">{t("rechnungen")}</h4>
              </div>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{t("anzahl")}</dt>
                  <dd className="font-mono font-medium">{nk.rechnungen.anzahl}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{t("letzteNummer")}</dt>
                  <dd className="font-mono font-medium">{nk.rechnungen.letzteNummer ?? "—"}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {t("nummernkreiseHinweis")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main EinstellungenTabs ---

type TabId = "firmendaten" | "email" | "steuern" | "nummernkreise";

const TABS: Array<{ id: TabId; icon: React.ComponentType<{ className?: string }>; labelKey: string }> = [
  { id: "firmendaten", icon: Building2, labelKey: "tabFirmendaten" },
  { id: "email", icon: Mail, labelKey: "tabEmail" },
  { id: "steuern", icon: Receipt, labelKey: "tabSteuern" },
  { id: "nummernkreise", icon: Hash, labelKey: "tabNummernkreise" },
];

export function EinstellungenTabs({ initialData }: { initialData: TenantData }) {
  const t = useTranslations("einstellungen");
  const [activeTab, setActiveTab] = useState<TabId>("firmendaten");
  const [tenant, setTenant] = useState<TenantData>(initialData);

  async function handleSave(data: Partial<TenantData>) {
    const res = await fetch("/api/einstellungen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Fehler beim Speichern");
    }

    const updated = await res.json();
    setTenant((prev) => ({ ...prev, ...updated }));
  }

  return (
    <div className="space-y-6">
      {/* Tab navigation — horizontal scroll on mobile */}
      <div className="relative">
        <div className="flex overflow-x-auto scrollbar-none border-b border-border -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-selected={isActive}
                role="tab"
                className={cn(
                  "flex min-h-[48px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                <span className="sm:hidden">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === "firmendaten" && (
          <FirmendatenTab tenant={tenant} onSave={handleSave} />
        )}
        {activeTab === "email" && (
          <EmailTab tenant={tenant} onSave={handleSave} />
        )}
        {activeTab === "steuern" && (
          <SteuernTab tenant={tenant} onSave={handleSave} />
        )}
        {activeTab === "nummernkreise" && (
          <NummernkreiseTab tenant={tenant} />
        )}
      </div>
    </div>
  );
}
