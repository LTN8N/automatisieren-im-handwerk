import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Automatisieren im Handwerk",
    short_name: "AiH",
    description:
      "KI-gestützte Angebote, Rechnungen und Kundenverwaltung für Handwerksbetriebe",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a1a",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    lang: "de",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Neues Angebot",
        short_name: "Angebot",
        description: "Erstelle ein neues Angebot",
        url: "/dashboard/angebote/neu",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Kunden",
        short_name: "Kunden",
        description: "Kundenliste öffnen",
        url: "/dashboard/kunden",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [],
  };
}
