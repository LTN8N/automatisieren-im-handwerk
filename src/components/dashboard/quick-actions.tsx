"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { FileText, Users, MessageSquare } from "lucide-react";

export function QuickActions() {
  const t = useTranslations("dashboard");

  const actions = [
    {
      href: "/dashboard/angebote/neu" as const,
      label: t("newAngebot"),
      icon: FileText,
    },
    {
      href: "/dashboard/kunden/neu" as const,
      label: t("newKunde"),
      icon: Users,
    },
    {
      href: "/dashboard/chat" as const,
      label: t("openChat"),
      icon: MessageSquare,
    },
  ];

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{t("quickActions")}</h2>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "min-h-[48px] gap-2",
              })}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
