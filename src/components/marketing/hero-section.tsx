import Link from "next/link";

interface HeroSectionProps {
  locale: string;
  heroSubtitle: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  cta: string;
  heroSecondary: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  mockBadge: string;
  mockTitle: string;
  mockCustomer: string;
  mockItem1: string;
  mockItem1Price: string;
  mockItem2: string;
  mockItem2Price: string;
  mockItem3: string;
  mockItem3Price: string;
  mockTotal: string;
  mockTotalPrice: string;
}

export function HeroSection({
  locale,
  heroSubtitle,
  heroTitle,
  heroHighlight,
  heroDescription,
  cta,
  heroSecondary,
  stat1Value,
  stat1Label,
  stat2Value,
  stat2Label,
  stat3Value,
  stat3Label,
  mockBadge,
  mockTitle,
  mockCustomer,
  mockItem1,
  mockItem1Price,
  mockItem2,
  mockItem2Price,
  mockItem3,
  mockItem3Price,
  mockTotal,
  mockTotalPrice,
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      {/* Background layers */}
      <div className="absolute inset-0 dot-grid opacity-40" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{
          background:
            "linear-gradient(to top, #0A0E1A 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:gap-16 lg:py-24">
        {/* Left — content */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              {heroSubtitle}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-marketing mb-2 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {heroTitle}
          </h1>
          <p className="font-marketing mb-8 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="gradient-text">{heroHighlight}</span>
          </p>

          {/* Description */}
          <p className="mb-8 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
            {heroDescription}
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${locale}/register`}
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-blue-500 px-8 py-3 text-base font-semibold text-white transition-all hover:bg-blue-400 active:scale-95 glow-blue-sm"
            >
              {cta}
            </Link>
            <a
              href="#how"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 px-8 py-3 text-base font-semibold text-white/80 transition-all hover:border-white/30 hover:text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              {heroSecondary}
            </a>
          </div>

          {/* Stats */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
            {[
              { value: stat1Value, label: stat1Label },
              { value: stat2Value, label: stat2Label },
              { value: stat3Value, label: stat3Label },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 lg:items-start">
                <span className="font-marketing text-2xl font-bold text-white sm:text-3xl">
                  {stat.value}
                </span>
                <span className="text-xs text-white/50">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product mockup */}
        <div className="relative flex flex-1 items-center justify-center">
          {/* Glow behind card */}
          <div
            className="absolute inset-0 rounded-3xl blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(59,130,246,0.2) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* Quote card mockup */}
          <div className="card-float relative w-full max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/90 shadow-2xl backdrop-blur-xl glow-blue">
              {/* Card header */}
              <div className="border-b border-white/8 bg-[#0F172A]/80 px-5 py-4">
                <div className="flex items-center justify-between">
                  {/* Voice waveform */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </div>
                    <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
                      {[12, 20, 14, 24, 16, 20, 10].map((h, i) => (
                        <div
                          key={i}
                          className="wave-bar w-[3px] rounded-full bg-blue-400"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400">
                    {mockBadge}
                  </span>
                </div>
              </div>

              {/* Card content */}
              <div className="px-5 py-4">
                <div className="mb-4">
                  <p className="text-xs text-white/40">{mockCustomer}</p>
                  <p className="font-marketing text-base font-bold text-white">
                    {mockTitle}
                  </p>
                </div>

                {/* Line items */}
                <div className="space-y-2.5">
                  {[
                    { name: mockItem1, price: mockItem1Price },
                    { name: mockItem2, price: mockItem2Price },
                    { name: mockItem3, price: mockItem3Price },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" />
                        <span className="text-xs text-white/70">{item.name}</span>
                      </div>
                      <span className="font-marketing text-xs font-semibold text-white">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
                  <span className="text-sm font-semibold text-white/80">{mockTotal}</span>
                  <span className="font-marketing text-lg font-bold text-amber-400">
                    {mockTotalPrice}
                  </span>
                </div>
              </div>

              {/* Card footer — send button */}
              <div className="px-5 pb-5">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="22" x2="11" y1="2" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span className="text-sm font-semibold text-white">Angebot senden</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
