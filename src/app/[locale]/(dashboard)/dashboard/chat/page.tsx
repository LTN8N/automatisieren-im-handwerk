import { auth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load the heavy chat component — reduces initial JS bundle
const ChatContainer = dynamic(
  () =>
    import("@/components/chat/ChatContainer").then((m) => m.ChatContainer),
  { ssr: false }
);

export const metadata = {
  title: "KI-Assistent",
};

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/de/login");
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const db = getTenantDb(tenantId);

  // Letzte 20 Nachrichten für die initiale Anzeige laden
  const verlaufRaw = await db.chatHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      nachricht: true,
      antwort: true,
    },
  });

  // Älteste zuerst, in Chat-Message-Format umwandeln
  const verlauf = verlaufRaw
    .reverse()
    .flatMap((e) => {
      const msgs: { role: "user" | "assistant"; content: string }[] = [
        { role: "user", content: e.nachricht },
      ];
      if (e.antwort) {
        msgs.push({ role: "assistant", content: e.antwort });
      }
      return msgs;
    });

  return <ChatContainer verlauf={verlauf} />;
}
