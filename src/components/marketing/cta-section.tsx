import Link from "next/link";

interface CtaSectionProps {
  locale: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaButton: string;
}

export function CtaSection({ locale, ctaTitle, ctaDesc, ctaButton }: CtaSectionProps) {
  return (
    <section className="relative py-20 lg:py-28" aria-labelledby="cta-heading">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-[#0A0E1A] p-10 text-center sm:p-16">
          {/* Background decoration */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(59,130,246,0.25) 0%, transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
            style={{ background: "rgba(59,130,246,0.15)" }}
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full blur-3xl"
            style={{ background: "rgba(245,158,11,0.08)" }}
            aria-hidden="true"
          />

          {/* Content */}
          <div className="relative">
            <h2
              id="cta-heading"
              className="font-marketing mb-4 text-3xl font-extrabold text-white sm:text-4xl"
            >
              {ctaTitle}
            </h2>
            <p className="mx-auto mb-8 max-w-md text-base leading-relaxed text-white/60">
              {ctaDesc}
            </p>
            <Link
              href={`/${locale}/register`}
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-blue-500 px-10 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-blue-400 active:scale-95 glow-blue-sm"
            >
              {ctaButton}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
