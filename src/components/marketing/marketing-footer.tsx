import Link from "next/link";

interface MarketingFooterProps {
  locale: string;
  appName: string;
  footerTagline: string;
  footerRights: string;
  footerImpressum: string;
  footerDatenschutz: string;
  footerKontakt: string;
}

export function MarketingFooter({
  locale,
  appName,
  footerTagline,
  footerRights,
  footerImpressum,
  footerDatenschutz,
  footerKontakt,
}: MarketingFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/8 bg-[#080C18] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              aria-label={appName}
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
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
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <span className="font-marketing text-sm font-bold text-white">{appName}</span>
            </Link>
            <p className="text-xs text-white/35">{footerTagline}</p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" role="list">
              <li>
                <Link
                  href={`/${locale}/impressum`}
                  className="text-xs text-white/40 transition-colors hover:text-white/70"
                >
                  {footerImpressum}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/datenschutz`}
                  className="text-xs text-white/40 transition-colors hover:text-white/70"
                >
                  {footerDatenschutz}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/kontakt`}
                  className="text-xs text-white/40 transition-colors hover:text-white/70"
                >
                  {footerKontakt}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-white/25">
            © {currentYear} {appName}. {footerRights}.
          </p>
        </div>
      </div>
    </footer>
  );
}
