interface FeaturesSectionProps {
  featuresTitle: string;
  featuresSubtitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;
}

const featureIcons = [
  // Microphone icon
  (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  ),
  // File-check icon
  (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  ),
  // Users icon
  (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  // Smartphone icon
  (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
];

const accentColors = [
  { bg: "bg-blue-500/15", text: "text-blue-400", border: "hover:border-blue-500/30" },
  { bg: "bg-amber-500/15", text: "text-amber-400", border: "hover:border-amber-500/30" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "hover:border-emerald-500/30" },
  { bg: "bg-violet-500/15", text: "text-violet-400", border: "hover:border-violet-500/30" },
];

export function FeaturesSection({
  featuresTitle,
  featuresSubtitle,
  feature1Title,
  feature1Desc,
  feature2Title,
  feature2Desc,
  feature3Title,
  feature3Desc,
  feature4Title,
  feature4Desc,
}: FeaturesSectionProps) {
  const features = [
    { title: feature1Title, desc: feature1Desc },
    { title: feature2Title, desc: feature2Desc },
    { title: feature3Title, desc: feature3Desc },
    { title: feature4Title, desc: feature4Desc },
  ];

  return (
    <section
      id="features"
      className="relative py-20 lg:py-28"
      aria-labelledby="features-heading"
    >
      {/* Section background */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #0A0E1A 0%, #0D1220 50%, #0A0E1A 100%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-14 text-center">
          <h2
            id="features-heading"
            className="font-marketing mb-3 text-3xl font-bold text-white sm:text-4xl"
          >
            {featuresTitle}
          </h2>
          <p className="mx-auto max-w-xl text-base text-white/50">{featuresSubtitle}</p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {features.map((feature, i) => {
            const colors = accentColors[i % accentColors.length];
            return (
              <div
                key={i}
                className={`hover-card group rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors ${colors.border}`}
              >
                {/* Icon */}
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}
                >
                  {featureIcons[i]}
                </div>

                {/* Text */}
                <h3 className="font-marketing mb-2 text-lg font-bold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/55">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
