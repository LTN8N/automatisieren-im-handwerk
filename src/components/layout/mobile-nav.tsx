"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  Receipt,
} from "lucide-react";

interface BottomNavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const bottomNavItems: BottomNavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/angebote", labelKey: "angebote", icon: FileText },
  { href: "/dashboard/kunden", labelKey: "kunden", icon: Users },
  { href: "/dashboard/rechnungen", labelKey: "rechnungen", icon: Receipt },
  { href: "/dashboard/chat", labelKey: "chat", icon: MessageSquare },
];

export function BottomMobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Mobile Navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Backdrop blur bar */}
      <div className="border-t border-border/60 bg-background/95 backdrop-blur-md">
        <div className="flex h-16 items-stretch">
          {bottomNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150 active:scale-95",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active pill indicator */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                )}

                {/* Icon with active background */}
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150",
                    isActive ? "bg-primary/10" : ""
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-150",
                      isActive ? "scale-110" : ""
                    )}
                  />
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none tracking-wide",
                    isActive ? "font-semibold" : ""
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
