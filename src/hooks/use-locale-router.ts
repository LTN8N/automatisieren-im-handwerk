"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback } from "react";

/**
 * Wrapper um next/navigation useRouter der automatisch das Locale prefixed.
 * Alle Pfade die mit / starten bekommen /{locale}/ vorangestellt.
 */
export function useLocaleRouter() {
  const router = useRouter();
  const locale = useLocale();

  const push = useCallback(
    (path: string) => {
      const prefixed = path.startsWith("/") ? `/${locale}${path}` : path;
      router.push(prefixed);
    },
    [router, locale]
  );

  return { ...router, push };
}
