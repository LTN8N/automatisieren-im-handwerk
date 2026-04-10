import Link from "next/link";

interface MarketingNavProps {
  locale: string;
  navFeatures: string;
  navPricing: string;
  loginButton: string;
  cta: string;
  appName: string;
}

export function MarketingNav({
  locale,
  navFeatures,
  navPricing,
  loginButton,
  cta,
  appName,
}: MarketingNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0A0E1A]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 min-h-[44px]"
          aria-label={appName}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 glow-blue-sm">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
          <span className="font-marketing text-sm font-bold text-white sm:text-base">
            {appName}
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            className="min-h-[44px] flex items-center text-sm text-white/60 transition-colors hover:text-white"
          >
            {navFeatures}
          </a>
          <a
            href="#pricing"
            className="min-h-[44px] flex items-center text-sm text-white/60 transition-colors hover:text-white"
          >
            {navPricing}
          </a>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/login`}
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 text-sm text-white/60 transition-colors hover:text-white sm:flex"
          >
            {loginButton}
          </Link>
          <Link
            href={`/${locale}/register`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-400 active:scale-95"
          >
            {cta}
          </Link>
        </div>
      </div>
    </nav>
  );
}
