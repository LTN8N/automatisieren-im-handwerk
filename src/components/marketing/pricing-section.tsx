import Link from "next/link";

interface PricingSectionProps {
  locale: string;
  pricingTitle: string;
  pricingSubtitle: string;
  pricingPerMonth: string;
  pricingBestValue: string;
  plan1Name: string;
  plan1Desc: string;
  plan1Price: string;
  plan1Feature1: string;
  plan1Feature2: string;
  plan1Feature3: string;
  plan1Feature4: string;
  plan1Cta: string;
  plan2Name: string;
  plan2Desc: string;
  plan2Price: string;
  plan2Feature1: string;
  plan2Feature2: string;
  plan2Feature3: string;
  plan2Feature4: string;
  plan2Feature5: string;
  plan2Cta: string;
  plan3Name: string;
  plan3Desc: string;
  plan3Price: string;
  plan3Feature1: string;
  plan3Feature2: string;
  plan3Feature3: string;
  plan3Feature4: string;
  plan3Feature5: string;
  plan3Cta: string;
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PricingSection({
  locale,
  pricingTitle,
  pricingSubtitle,
  pricingPerMonth,
  pricingBestValue,
  plan1Name,
  plan1Desc,
  plan1Price,
  plan1Feature1,
  plan1Feature2,
  plan1Feature3,
  plan1Feature4,
  plan1Cta,
  plan2Name,
  plan2Desc,
  plan2Price,
  plan2Feature1,
  plan2Feature2,
  plan2Feature3,
  plan2Feature4,
  plan2Feature5,
  plan2Cta,
  plan3Name,
  plan3Desc,
  plan3Price,
  plan3Feature1,
  plan3Feature2,
  plan3Feature3,
  plan3Feature4,
  plan3Feature5,
  plan3Cta,
}: PricingSectionProps) {
  const plans = [
    {
      name: plan1Name,
      desc: plan1Desc,
      price: plan1Price,
      isMonthly: false,
      features: [plan1Feature1, plan1Feature2, plan1Feature3, plan1Feature4],
      cta: plan1Cta,
      ctaLink: `/${locale}/register`,
      isPro: false,
      ctaStyle: "border border-white/15 text-white hover:border-white/30 hover:bg-white/5",
    },
    {
      name: plan2Name,
      desc: plan2Desc,
      price: plan2Price,
      isMonthly: true,
      features: [plan2Feature1, plan2Feature2, plan2Feature3, plan2Feature4, plan2Feature5],
      cta: plan2Cta,
      ctaLink: `/${locale}/register`,
      isPro: true,
      ctaStyle: "bg-blue-500 text-white hover:bg-blue-400",
    },
    {
      name: plan3Name,
      desc: plan3Desc,
      price: plan3Price,
      isMonthly: false,
      features: [plan3Feature1, plan3Feature2, plan3Feature3, plan3Feature4, plan3Feature5],
      cta: plan3Cta,
      ctaLink: `/${locale}/login`,
      isPro: false,
      ctaStyle: "border border-white/15 text-white hover:border-white/30 hover:bg-white/5",
    },
  ];

  return (
    <section
      id="pricing"
      className="relative py-20 lg:py-28"
      aria-labelledby="pricing-heading"
    >
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #0A0E1A 0%, #0D1220 50%, #0A0E1A 100%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-14 text-center">
          <h2
            id="pricing-heading"
            className="font-marketing mb-3 text-3xl font-bold text-white sm:text-4xl"
          >
            {pricingTitle}
          </h2>
          <p className="mx-auto max-w-md text-base text-white/50">{pricingSubtitle}</p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.isPro
                  ? "pricing-card-pro"
                  : "border-white/8 bg-white/[0.03]"
              }`}
            >
              {/* Best value badge */}
              {plan.isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                    {pricingBestValue}
                  </span>
                </div>
              )}

              {/* Plan info */}
              <div className="mb-6">
                <h3 className="font-marketing mb-1 text-lg font-bold text-white">
                  {plan.name}
                </h3>
                <p className="text-xs text-white/45">{plan.desc}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.isMonthly ? (
                  <div className="flex items-baseline gap-1">
                    <span className="font-marketing text-4xl font-extrabold text-white">
                      €{plan.price}
                    </span>
                    <span className="text-sm text-white/45">{pricingPerMonth}</span>
                  </div>
                ) : (
                  <div className="flex items-baseline">
                    <span className="font-marketing text-3xl font-extrabold text-white">
                      {plan.price}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="mb-8 flex flex-1 flex-col gap-3" role="list">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex-shrink-0 ${plan.isPro ? "text-blue-400" : "text-emerald-400"}`}
                    >
                      <CheckIcon />
                    </span>
                    <span className="text-sm text-white/65">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.ctaLink}
                className={`inline-flex min-h-[48px] items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all active:scale-95 ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
