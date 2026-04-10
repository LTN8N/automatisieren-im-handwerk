export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { locales } from "@/i18n/config";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(locales, locale)) {
    notFound();
  }

  return children;
}
