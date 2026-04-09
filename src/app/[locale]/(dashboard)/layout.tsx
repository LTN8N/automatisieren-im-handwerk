import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DesktopSidebar, MobileSidebar } from "@/components/dashboard/sidebar";

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
      <DesktopSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-4 md:hidden">
          <MobileSidebar />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
