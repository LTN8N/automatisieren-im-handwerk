import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://automatisieren-im-handwerk.de";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${BASE_URL}/de`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          de: `${BASE_URL}/de`,
          en: `${BASE_URL}/en`,
        },
      },
    },
    {
      url: `${BASE_URL}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          de: `${BASE_URL}/de`,
          en: `${BASE_URL}/en`,
        },
      },
    },
    {
      url: `${BASE_URL}/de/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/de/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
