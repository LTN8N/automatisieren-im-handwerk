import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";
import { checkRateLimit } from "@/lib/rate-limit";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API-Routen: Rate-Limiting + CSRF-Schutz
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const { allowed } = checkRateLimit(ip, 120, 60_000); // 120 requests/minute
    if (!allowed) {
      return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });
    }

    // CSRF: Mutating requests müssen vom gleichen Origin kommen
    const method = req.method;
    if (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE") {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin && host && !origin.includes(host)) {
        return NextResponse.json({ error: "Ungültiger Origin." }, { status: 403 });
      }
    }

    return NextResponse.next();
  }

  // Statische Assets durchlassen
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Aktuelle Locale aus dem Pfad extrahieren
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  const locale = pathnameLocale ?? defaultLocale;

  // Oeffentliche Marketing-Seiten (Root-Locale-Seite)
  if (pathname === `/${locale}` || pathname === "/") {
    return NextResponse.next();
  }

  // Auth-Seiten durchlassen
  const authPaths = locales.flatMap((l) => [`/${l}/login`, `/${l}/register`]);
  if (authPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Geschuetzte Routen: Session pruefen
  if (!req.auth) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
