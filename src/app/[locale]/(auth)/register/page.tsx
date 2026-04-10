"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        firmenname: formData.get("firmenname"),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Registrierung fehlgeschlagen.");
      return;
    }

    router.push("/login");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Registrieren</CardTitle>
        <CardDescription>
          Erstellen Sie Ihr Konto in wenigen Sekunden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Ihr Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Max Mustermann"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firmenname">Firmenname</Label>
            <Input
              id="firmenname"
              name="firmenname"
              type="text"
              placeholder="Mustermann Sanitaer GmbH"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@firma.de"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Wird erstellt..." : "Konto erstellen"}
          </Button>
          <p className="text-center text-sm text-zinc-500">
            Bereits ein Konto?{" "}
            <Link href="/login" className="font-medium underline">
              Anmelden
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
