import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Statische Assets und API-Routen durchlassen
  if (
    pathname.startsWith("/api") ||
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
