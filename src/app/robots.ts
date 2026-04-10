import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://automatisieren-im-handwerk.de";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/de", "/en", "/de/login", "/de/register", "/en/login", "/en/register"],
        disallow: ["/de/dashboard/", "/en/dashboard/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
