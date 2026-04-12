"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, FileText } from "lucide-react";

interface MaintenanceContract {
  id: string;
  contractNumber: string | null;
  customerName: string;
  status: string;
  _count: { leases: number };
}

interface MaintenanceObject {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  buildingType: string;
  contactName: string | null;
  contactPhone: string | null;
  accessNotes: string | null;
  contracts: MaintenanceContract[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function ObjektDetailPage() {
  const t = useTranslations("wartung");
  const router = useLocaleRouter();
  const params = useParams();
  const objektId = params?.id as string;

  const [objekt, setObjekt] = useState<MaintenanceObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch(`/api/wartung/objects/${objektId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Nicht gefunden")))
      .then(setObjekt)
      .catch(() => setError("Objekt nicht gefunden."))
      .finally(() => setLoading(false));
  }, [objektId]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/wartung/objects/${objektId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        address: fd.get("address"),
        city: fd.get("city"),
        postalCode: fd.get("postalCode"),
        buildingType: fd.get("buildingType"),
        contactName: fd.get("contactName") || undefined,
        contactPhone: fd.get("contactPhone") || undefined,
        accessNotes: fd.get("accessNotes") || undefined,
      }),
    });

    setSaving(false);

    if (res.ok) {
      const updated = await res.json();
      setObjekt({ ...objekt!, ...updated });
      setEditMode(false);
    } else {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern.");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Laden...</div>;
  }

  if (error && !objekt) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/wartung/objekte")}
          className="rounded-xl"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Zurück
        </Button>
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!objekt) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/wartung/objekte")}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{objekt.name}</h1>
        </div>
        {!editMode && (
          <Button
            variant="outline"
            onClick={() => setEditMode(true)}
            className="rounded-xl min-h-[48px]"
          >
            {t("objektBearbeiten")}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stammdaten */}
      {editMode ? (
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="name">{t("objektName")}</Label>
            <Input id="name" name="name" defaultValue={objekt.name} required className="min-h-[48px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">{t("objektAdresse")}</Label>
              <Input id="address" name="address" defaultValue={objekt.address} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("objektStadt")}</Label>
              <Input id="city" name="city" defaultValue={objekt.city} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t("objektPLZ")}</Label>
              <Input id="postalCode" name="postalCode" defaultValue={objekt.postalCode} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingType">{t("objektGebaeudetyp")}</Label>
              <Input id="buildingType" name="buildingType" defaultValue={objekt.buildingType} required className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">{t("objektKontaktName")}</Label>
              <Input id="contactName" name="contactName" defaultValue={objekt.contactName ?? ""} className="min-h-[48px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">{t("objektKontaktTelefon")}</Label>
              <Input id="contactPhone" name="contactPhone" defaultValue={objekt.contactPhone ?? ""} className="min-h-[48px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessNotes">{t("objektZugangshinweis")}</Label>
            <textarea
              id="accessNotes"
              name="accessNotes"
              defaultValue={objekt.accessNotes ?? ""}
              rows={3}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="rounded-xl min-h-[48px]">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Speichern..." : t("objektSpeichern")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditMode(false)}
              className="rounded-xl min-h-[48px]"
            >
              {t("objektAbbrechen")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("objektAdresse")}:</span>{" "}
              {objekt.address}
            </div>
            <div>
              <span className="text-muted-foreground">{t("objektStadt")}:</span>{" "}
              {objekt.city}
            </div>
            <div>
              <span className="text-muted-foreground">{t("objektPLZ")}:</span>{" "}
              {objekt.postalCode}
            </div>
            <div>
              <span className="text-muted-foreground">{t("objektGebaeudetyp")}:</span>{" "}
              {objekt.buildingType}
            </div>
            {objekt.contactName && (
              <div>
                <span className="text-muted-foreground">{t("objektKontaktName")}:</span>{" "}
                {objekt.contactName}
              </div>
            )}
            {objekt.contactPhone && (
              <div>
                <span className="text-muted-foreground">{t("objektKontaktTelefon")}:</span>{" "}
                {objekt.contactPhone}
              </div>
            )}
            {objekt.accessNotes && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">{t("objektZugangshinweis")}:</span>{" "}
                {objekt.accessNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verträge dieses Objekts */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("objektVertraege")}
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/dashboard/wartung/vertraege/neu")}
            className="rounded-xl"
          >
            {t("neuerVertrag")}
          </Button>
        </div>
        {objekt.contracts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("keineVertraege")}</p>
        ) : (
          <div className="divide-y">
            {objekt.contracts.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/dashboard/wartung/vertraege/${c.id}`)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div>
                  <span className="font-mono text-sm font-medium">
                    {c.contractNumber ?? "—"}
                  </span>
                  <span className="ml-3 text-sm text-muted-foreground">{c.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {c._count.leases} Leistungen
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
