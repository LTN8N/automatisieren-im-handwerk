export const dynamic = "force-dynamic";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  Receipt,
  Users,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Zap,
  Smartphone,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────
// Sub-Komponenten
// ────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-foreground">
            Automatisieren im Handwerk
          </span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#wie-es-funktioniert" className="transition-colors hover:text-foreground">
            So funktioniert&apos;s
          </a>
          <a href="#preise" className="transition-colors hover:text-foreground">
            Preise
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Anmelden
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="hidden sm:inline-flex">
              Kostenlos starten
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background px-5 py-16 text-center md:py-24">
      {/* Hintergrund-Ornament */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        {/* Badge */}
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
          <Mic className="h-3 w-3" />
          KI-gestütztes Angebots- &amp; Rechnungsmanagement
        </span>

        <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
          Angebote erstellen —{" "}
          <span className="text-primary">einfach sprechen.</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Sie sprechen auf der Baustelle, die KI schreibt das Angebot. In
          Sekunden fertig, als PDF versandbereit. Kein Büroaufwand mehr.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="min-h-[52px] min-w-[200px] rounded-xl text-base font-semibold"
            >
              Kostenlos starten
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#wie-es-funktioniert">
            <Button
              variant="outline"
              size="lg"
              className="min-h-[52px] min-w-[200px] rounded-xl text-base"
            >
              So funktioniert&apos;s
            </Button>
          </a>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Keine Kreditkarte erforderlich · 14 Tage gratis testen
        </p>
      </div>

      {/* Vorschau-UI Mockup */}
      <div className="mx-auto mt-14 max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/10">
          {/* Browser-Chrome */}
          <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-muted-foreground">
              automatisieren-im-handwerk.de/dashboard/chat
            </span>
          </div>
          {/* Chat Preview */}
          <div className="space-y-3 p-5 text-left">
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                Ich war heute bei Herrn Müller, Badezimmer-Sanierung. Dusche
                raus, neue Dusche rein, Fliesen 12qm.
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] space-y-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-foreground">
                <p className="font-medium">
                  Alles klar! Ich hab ein Angebot für Herrn Müller erstellt:
                </p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>• Demontage Dusche: 340 €</li>
                  <li>• Neue Duschwanne inkl. Einbau: 890 €</li>
                  <li>• Fliesen 12m² inkl. Verlegung: 1.440 €</li>
                  <li className="font-semibold text-foreground">
                    • Gesamt: 2.670 € netto
                  </li>
                </ul>
                <p className="pt-0.5">
                  Soll ich es als PDF generieren und versenden?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mic className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">
                Ja, schick es direkt raus …
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Mic,
    title: "Sprachbedienung",
    description:
      "Angebote und Rechnungen per Sprache erstellen — auf der Baustelle, im Auto oder beim Kunden. Einfach sprechen, die KI erledigt den Rest.",
  },
  {
    icon: FileText,
    title: "Professionelle PDFs",
    description:
      "Automatisch generierte Angebote und Rechnungen mit Ihren Firmendaten, korrekter USt und allem was § 14 UStG vorschreibt.",
  },
  {
    icon: Receipt,
    title: "Angebot → Rechnung",
    description:
      "Einmal sagen „Der Müller hat angenommen" — die KI wandelt das Angebot in eine Rechnung um und versendet sie direkt per E-Mail.",
  },
  {
    icon: Users,
    title: "Kundenverwaltung",
    description:
      "Kunden werden automatisch aus Gesprächen angelegt und gepflegt. Kein manuelles Eintippen, keine doppelten Einträge.",
  },
  {
    icon: MessageSquare,
    title: "KI-Bürokollege",
    description:
      "Fragen wie „Welche Rechnungen sind noch offen?" oder „Was habe ich diesen Monat verdient?" — die KI antwortet sofort.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First",
    description:
      "Optimiert für Handwerker auf dem Handy. Große Buttons, übersichtlich, auch mit dreckigen Händen bedienbar.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="px-5 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Alles was ein Handwerksbetrieb braucht
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Von der Angebotserstellung bis zur bezahlten Rechnung — in einer
            App, bedienbar per Sprache.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md hover:shadow-primary/8"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 font-semibold text-foreground">
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    step: "01",
    title: "Account anlegen",
    description:
      "E-Mail und Passwort — fertig. Firmendaten in 3 Minuten eingetragen.",
  },
  {
    step: "02",
    title: "Mit KI sprechen",
    description:
      "Sagen Sie z.B. „Ich war bei Frau Schmidt, Heizung gewartet, 3 Stunden." Die KI erstellt sofort ein Angebot.",
  },
  {
    step: "03",
    title: "PDF versenden",
    description:
      "Mit einem Tap bestätigen und das Angebot geht direkt per E-Mail an den Kunden.",
  },
];

function HowItWorksSection() {
  return (
    <section
      id="wie-es-funktioniert"
      className="bg-muted/40 px-5 py-16 md:py-20"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            In 3 Schritten startklar
          </h2>
          <p className="text-muted-foreground">
            Einrichten wie ein E-Mail-Postfach. Kein IT-Wissen nötig.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
                {item.step}
              </div>
              <h3 className="mb-1.5 font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Starter",
    price: "0 €",
    period: "für immer",
    description: "Zum Ausprobieren",
    features: [
      "5 Angebote/Monat",
      "5 Rechnungen/Monat",
      "KI-Chat (10 Nachrichten/Tag)",
      "PDF-Download",
    ],
    cta: "Kostenlos starten",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29 €",
    period: "pro Monat",
    description: "Für aktive Betriebe",
    features: [
      "Unbegrenzte Angebote & Rechnungen",
      "Unbegrenzter KI-Chat",
      "Sprachsteuerung",
      "E-Mail-Versand",
      "Kundenverwaltung",
      "Mahnwesen",
    ],
    cta: "14 Tage gratis testen",
    highlighted: true,
  },
  {
    name: "Team",
    price: "59 €",
    period: "pro Monat",
    description: "Für wachsende Betriebe",
    features: [
      "Alles aus Pro",
      "Bis zu 5 Nutzer",
      "Wartungsvertrags-Modul",
      "Prioritäts-Support",
      "API-Zugang",
    ],
    cta: "Jetzt anfragen",
    highlighted: false,
  },
];

function PricingSection() {
  return (
    <section id="preise" className="px-5 py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Faire Preise. Keine Überraschungen.
          </h2>
          <p className="text-muted-foreground">
            Kündigung jederzeit möglich. Keine Mindestlaufzeit.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                  : "border-border/60 bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                  Beliebteste Wahl
                </div>
              )}
              <div className="mb-5">
                <p
                  className={`mb-0.5 text-sm font-medium ${plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span
                    className={`text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm ${plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "text-primary-foreground/80" : "text-primary"}`}
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button
                  variant={plan.highlighted ? "secondary" : "outline"}
                  className="w-full min-h-[48px] rounded-xl font-semibold"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-5 py-16 md:py-20">
      <div className="mx-auto max-w-2xl rounded-3xl bg-primary px-8 py-12 text-center text-primary-foreground shadow-2xl shadow-primary/25">
        <h2 className="mb-3 text-3xl font-bold leading-tight">
          Weniger Büroarbeit. Mehr Zeit auf der Baustelle.
        </h2>
        <p className="mb-8 text-primary-foreground/80">
          Starten Sie kostenlos. Keine Kreditkarte. Kein Fachwissen nötig.
        </p>
        <Link href="/register">
          <Button
            size="lg"
            variant="secondary"
            className="min-h-[52px] min-w-[220px] rounded-xl text-base font-bold"
          >
            Jetzt kostenlos starten
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-4 text-xs text-primary-foreground/60">
          14 Tage gratis · Dann ab 29 €/Monat · Jederzeit kündbar
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t px-5 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">
            Automatisieren im Handwerk
          </span>
        </div>
        <div className="flex gap-5">
          <a href="#" className="transition-colors hover:text-foreground">
            Impressum
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Datenschutz
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            AGB
          </a>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Anmelden
          </Link>
        </div>
        <p className="text-xs">
          © {new Date().getFullYear()} Automatisieren im Handwerk
        </p>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────
// Haupt-Export
// ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
