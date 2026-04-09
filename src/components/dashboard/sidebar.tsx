"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  MessageSquare,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/angebote", labelKey: "angebote", icon: FileText },
  { href: "/dashboard/rechnungen", labelKey: "rechnungen", icon: Receipt },
  { href: "/dashboard/kunden", labelKey: "kunden", icon: Users },
  { href: "/dashboard/chat", labelKey: "chat", icon: MessageSquare },
  {
    href: "/dashboard/einstellungen",
    labelKey: "einstellungen",
    icon: Settings,
  },
];

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const t = useTranslations("nav");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {t(item.labelKey)}
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-6">
        <h2 className="text-lg font-semibold">{t("appName")}</h2>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Sidebar">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive}
              onClick={onNavigate}
            />
          );
        })}
      </nav>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:block">
      <SidebarNav />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("dashboard");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("menuOpen")}
          />
        }
      >
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
