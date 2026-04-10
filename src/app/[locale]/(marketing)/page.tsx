export const dynamic = "force-dynamic";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Automatisieren im Handwerk</h1>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline">Anmelden</Button>
            </Link>
            <Link href="/register">
              <Button>Kostenlos starten</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="mb-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
          Angebote und Rechnungen per Sprache erstellen
        </h2>
        <p className="mb-8 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          KI-gesteuertes Angebots- und Rechnungsmanagement fuer Handwerker.
          Einfach sprechen — die KI erledigt den Rest.
        </p>
        <Link href="/register">
          <Button size="lg">Jetzt kostenlos starten</Button>
        </Link>
      </main>
    </div>
  );
}
