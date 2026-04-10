export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTenantDb } from "@/lib/db";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect({ href: "/login", locale: "de" });
  }

  const db = getTenantDb(session.user.tenantId);

  // Letzte Chat-Eintraege als Verlauf laden
  const history = await db.chatHistory.findMany({
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { nachricht: true, antwort: true },
  });

  const verlauf = history.flatMap((h) => {
    const entries: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: h.nachricht },
    ];
    if (h.antwort) {
      entries.push({ role: "assistant", content: h.antwort });
    }
    return entries;
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h1 className="mb-4 text-2xl font-bold">KI-Assistent</h1>
      <div className="flex-1 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <ChatContainer verlauf={verlauf} />
      </div>
    </div>
  );
}
