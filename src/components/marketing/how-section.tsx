interface HowSectionProps {
  howTitle: string;
  howSubtitle: string;
  step1Number: string;
  step1Title: string;
  step1Desc: string;
  step2Number: string;
  step2Title: string;
  step2Desc: string;
  step3Number: string;
  step3Title: string;
  step3Desc: string;
}

const stepIcons = [
  // Microphone
  (
    <svg
      key="microphone"
      width="24"
      height="24"
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
  // Sparkles / AI
  (
    <svg
      key="sparkles"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3c-1 2.5-4 4-4 4s3 1.5 4 4c1-2.5 4-4 4-4s-3-1.5-4-4z" />
      <path d="M5 14c-.7 1.7-2.3 2.7-2.3 2.7s1.6.9 2.3 2.6c.7-1.7 2.3-2.6 2.3-2.6S5.7 15.7 5 14z" />
      <path d="M19 14c-.7 1.7-2.3 2.7-2.3 2.7s1.6.9 2.3 2.6c.7-1.7 2.3-2.6 2.3-2.6s-1.6-1-2.3-2.7z" />
    </svg>
  ),
  // Send
  (
    <svg
      key="send"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" x2="11" y1="2" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
];

export function HowSection({
  howTitle,
  howSubtitle,
  step1Number,
  step1Title,
  step1Desc,
  step2Number,
  step2Title,
  step2Desc,
  step3Number,
  step3Title,
  step3Desc,
}: HowSectionProps) {
  const steps = [
    { number: step1Number, title: step1Title, desc: step1Desc },
    { number: step2Number, title: step2Title, desc: step2Desc },
    { number: step3Number, title: step3Title, desc: step3Desc },
  ];

  return (
    <section
      id="how"
      className="relative py-20 lg:py-28"
      aria-labelledby="how-heading"
    >
      {/* Decorative gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-16 text-center">
          <h2
            id="how-heading"
            className="font-marketing mb-3 text-3xl font-bold text-white sm:text-4xl"
          >
            {howTitle}
          </h2>
          <p className="mx-auto max-w-lg text-base text-white/50">{howSubtitle}</p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-0">
          {steps.map((step, i) => (
            <div key={i} className="step-connector flex gap-6 pb-10 last:pb-0">
              {/* Left: number circle + connector line */}
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-blue-500/50 bg-blue-500/15 text-blue-400">
                  {stepIcons[i]}
                </div>
              </div>

              {/* Right: content */}
              <div className="flex-1 pb-2 pt-2">
                <div className="mb-1 flex items-center gap-3">
                  <span className="font-marketing text-xs font-bold tracking-widest text-blue-500/70">
                    {step.number}
                  </span>
                  <h3 className="font-marketing text-xl font-bold text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-white/55">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
