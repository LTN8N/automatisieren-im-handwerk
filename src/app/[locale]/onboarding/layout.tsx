import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { Wrench } from "lucide-react";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect({ href: "/login", locale: "de" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Minimaler Header nur mit Logo */}
      <header className="flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
            <Wrench className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-semibold text-slate-900">
            Automatisieren im Handwerk
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
