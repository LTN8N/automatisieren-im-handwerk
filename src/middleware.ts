import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/de/login", "/de/register", "/en/login", "/en/register"];

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

  // Oeffentliche Marketing-Seiten (Root-Locale-Seite)
  if (pathname === "/de" || pathname === "/en" || pathname === "/") {
    return NextResponse.next();
  }

  // Auth-Seiten durchlassen
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Geschuetzte Routen: Session pruefen
  if (!req.auth) {
    const loginUrl = new URL("/de/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
