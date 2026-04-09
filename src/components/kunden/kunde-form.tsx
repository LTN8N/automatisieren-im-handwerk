"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

interface KundeFormProps {
  kunde?: {
    id: string;
    name: string;
    adresse: string | null;
    email: string | null;
    telefon: string | null;
    notizen: string | null;
  };
}

interface FieldErrors {
  name?: string[];
  email?: string[];
}

export function KundeForm({ kunde }: KundeFormProps) {
  const t = useTranslations("kunden");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isEdit = !!kunde;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      adresse: formData.get("adresse") as string,
      email: formData.get("email") as string,
      telefon: formData.get("telefon") as string,
      notizen: formData.get("notizen") as string,
    };

    try {
      const url = isEdit ? `/api/kunden/${kunde.id}` : "/api/kunden";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        if (body.details) {
          setFieldErrors(body.details);
        } else {
          setError(body.error ?? t("saveError"));
        }
        return;
      }

      router.push("/dashboard/kunden");
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href="/dashboard/kunden"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {tc("back")}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? t("editKunde") : t("newKunde")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("name")} *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={kunde?.name ?? ""}
                placeholder={t("namePlaceholder")}
                required
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse">{t("adresse")}</Label>
              <Input
                id="adresse"
                name="adresse"
                defaultValue={kunde?.adresse ?? ""}
                placeholder={t("adressePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={kunde?.email ?? ""}
                placeholder={t("emailPlaceholder")}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefon">{t("telefon")}</Label>
              <Input
                id="telefon"
                name="telefon"
                defaultValue={kunde?.telefon ?? ""}
                placeholder={t("telefonPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notizen">{t("notizen")}</Label>
              <textarea
                id="notizen"
                name="notizen"
                defaultValue={kunde?.notizen ?? ""}
                placeholder={t("notizenPlaceholder")}
                rows={4}
                className="flex min-h-[120px] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Link href="/dashboard/kunden">
              <Button type="button" variant="outline">
                {tc("cancel")}
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
              {tc("save")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
