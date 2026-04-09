import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/de/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-white p-4 dark:bg-zinc-950 md:block">
        <h2 className="mb-6 text-lg font-semibold">
          Automatisieren im Handwerk
        </h2>
        <nav className="space-y-1">
          <a
            href="/de/dashboard"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Dashboard
          </a>
          <a
            href="/de/dashboard/angebote"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Angebote
          </a>
          <a
            href="/de/dashboard/rechnungen"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Rechnungen
          </a>
          <a
            href="/de/dashboard/kunden"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Kunden
          </a>
          <a
            href="/de/dashboard/chat"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            KI-Chat
          </a>
          <a
            href="/de/dashboard/einstellungen"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Einstellungen
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
