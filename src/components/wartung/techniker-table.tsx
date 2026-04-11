"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Check, Pencil, UserCircle } from "lucide-react";

interface Techniker {
  id: string;
  name: string;
  qualifications: string[];
  workHoursStart: string;
  workHoursEnd: string;
  maxDailyHours: number;
  isActive: boolean;
}

interface TechnikerTableProps {
  techniker: Techniker[];
}

interface NewTechnikerForm {
  name: string;
  qualifications: string;
  workHoursStart: string;
  workHoursEnd: string;
  maxDailyHours: string;
}

export function TechnikerTable({ techniker: initialTechniker }: TechnikerTableProps) {
  const t = useTranslations("wartung");
  const router = useRouter();

  const [techniker, setTechniker] = useState(initialTechniker);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuals, setEditQuals] = useState("");
  const [form, setForm] = useState<NewTechnikerForm>({
    name: "",
    qualifications: "",
    workHoursStart: "07:00",
    workHoursEnd: "16:00",
    maxDailyHours: "8",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/wartung/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        qualifications: form.qualifications
          ? form.qualifications.split(",").map((q) => q.trim()).filter(Boolean)
          : [],
        workHoursStart: form.workHoursStart,
        workHoursEnd: form.workHoursEnd,
        maxDailyHours: Number(form.maxDailyHours),
      }),
    });

    setSaving(false);

    if (res.ok) {
      const created = await res.json();
      setTechniker((prev) => [...prev, created]);
      setShowForm(false);
      setForm({ name: "", qualifications: "", workHoursStart: "07:00", workHoursEnd: "16:00", maxDailyHours: "8" });
    } else {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern.");
    }
  }

  async function saveQualifications(id: string) {
    const quals = editQuals.split(",").map((q) => q.trim()).filter(Boolean);
    const res = await fetch(`/api/wartung/technicians/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qualifications: quals }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTechniker((prev) => prev.map((t) => (t.id === id ? { ...t, qualifications: updated.qualifications } : t)));
      setEditingId(null);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/wartung/technicians/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) {
      setTechniker((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !current } : t)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(true)}
          className="rounded-xl min-h-[48px]"
        >
          <Plus className="mr-2 h-5 w-5" />
          {t("neuerTechniker")}
        </Button>
      </div>

      {/* Neuer Techniker Formular */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border bg-card p-4 shadow-sm space-y-3"
        >
          <h3 className="font-semibold text-sm">{t("neuerTechniker")}</h3>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("techName")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Max Mustermann"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("techQualifikationen")}</Label>
              <Input
                value={form.qualifications}
                onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))}
                placeholder="Gas, Wasser, Heizung"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("techWorkStart")}</Label>
              <Input
                type="time"
                value={form.workHoursStart}
                onChange={(e) => setForm((f) => ({ ...f, workHoursStart: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("techWorkEnd")}</Label>
              <Input
                type="time"
                value={form.workHoursEnd}
                onChange={(e) => setForm((f) => ({ ...f, workHoursEnd: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("techMaxStunden")}</Label>
              <Input
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={form.maxDailyHours}
                onChange={(e) => setForm((f) => ({ ...f, maxDailyHours: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} size="sm" className="rounded-xl">
              {saving ? "Speichern..." : "Speichern"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowForm(false); setError(null); }}
              className="rounded-xl"
            >
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">{t("spalteName")}</th>
              <th className="px-4 py-3 font-medium">{t("spalteQualifikationen")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("spalteAktiv")}</th>
            </tr>
          </thead>
          <tbody>
            {techniker.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {t("keineTechniker")}
                </td>
              </tr>
            ) : (
              techniker.map((tech) => (
                <tr key={tech.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium">
                      <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      {tech.name}
                      <span className="text-xs text-muted-foreground">
                        {tech.workHoursStart}–{tech.workHoursEnd}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === tech.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editQuals}
                          onChange={(e) => setEditQuals(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => saveQualifications(tech.id)}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {tech.qualifications.length > 0 ? (
                          tech.qualifications.map((q) => (
                            <span
                              key={q}
                              className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium"
                            >
                              {q}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(tech.id);
                            setEditQuals(tech.qualifications.join(", "));
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(tech.id, tech.isActive)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        tech.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tech.isActive ? t("techAktiv") : t("techInaktiv")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
