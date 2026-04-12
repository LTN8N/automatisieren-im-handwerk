export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HowSection } from "@/components/marketing/how-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function MarketingPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("marketing");

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <MarketingNav
        locale={locale}
        navFeatures={t("navFeatures")}
        navPricing={t("navPricing")}
        loginButton={t("loginButton")}
        cta={t("cta")}
        appName={t("appName")}
      />

      <HeroSection
        locale={locale}
        heroSubtitle={t("heroSubtitle")}
        heroTitle={t("heroTitle")}
        heroHighlight={t("heroHighlight")}
        heroDescription={t("heroDescription")}
        cta={t("cta")}
        heroSecondary={t("heroSecondary")}
        stat1Value={t("stat1Value")}
        stat1Label={t("stat1Label")}
        stat2Value={t("stat2Value")}
        stat2Label={t("stat2Label")}
        stat3Value={t("stat3Value")}
        stat3Label={t("stat3Label")}
        mockBadge={t("mockBadge")}
        mockTitle={t("mockTitle")}
        mockCustomer={t("mockCustomer")}
        mockItem1={t("mockItem1")}
        mockItem1Price={t("mockItem1Price")}
        mockItem2={t("mockItem2")}
        mockItem2Price={t("mockItem2Price")}
        mockItem3={t("mockItem3")}
        mockItem3Price={t("mockItem3Price")}
        mockTotal={t("mockTotal")}
        mockTotalPrice={t("mockTotalPrice")}
      />

      <FeaturesSection
        featuresTitle={t("featuresTitle")}
        featuresSubtitle={t("featuresSubtitle")}
        feature1Title={t("feature1Title")}
        feature1Desc={t("feature1Desc")}
        feature2Title={t("feature2Title")}
        feature2Desc={t("feature2Desc")}
        feature3Title={t("feature3Title")}
        feature3Desc={t("feature3Desc")}
        feature4Title={t("feature4Title")}
        feature4Desc={t("feature4Desc")}
      />

      <HowSection
        howTitle={t("howTitle")}
        howSubtitle={t("howSubtitle")}
        step1Number={t("step1Number")}
        step1Title={t("step1Title")}
        step1Desc={t("step1Desc")}
        step2Number={t("step2Number")}
        step2Title={t("step2Title")}
        step2Desc={t("step2Desc")}
        step3Number={t("step3Number")}
        step3Title={t("step3Title")}
        step3Desc={t("step3Desc")}
      />

      <PricingSection
        locale={locale}
        pricingTitle={t("pricingTitle")}
        pricingSubtitle={t("pricingSubtitle")}
        pricingPerMonth={t("pricingPerMonth")}
        pricingBestValue={t("pricingBestValue")}
        plan1Name={t("plan1Name")}
        plan1Desc={t("plan1Desc")}
        plan1Price={t("plan1Price")}
        plan1Feature1={t("plan1Feature1")}
        plan1Feature2={t("plan1Feature2")}
        plan1Feature3={t("plan1Feature3")}
        plan1Feature4={t("plan1Feature4")}
        plan1Cta={t("plan1Cta")}
        plan2Name={t("plan2Name")}
        plan2Desc={t("plan2Desc")}
        plan2Price={t("plan2Price")}
        plan2Feature1={t("plan2Feature1")}
        plan2Feature2={t("plan2Feature2")}
        plan2Feature3={t("plan2Feature3")}
        plan2Feature4={t("plan2Feature4")}
        plan2Feature5={t("plan2Feature5")}
        plan2Cta={t("plan2Cta")}
        plan3Name={t("plan3Name")}
        plan3Desc={t("plan3Desc")}
        plan3Price={t("plan3Price")}
        plan3Feature1={t("plan3Feature1")}
        plan3Feature2={t("plan3Feature2")}
        plan3Feature3={t("plan3Feature3")}
        plan3Feature4={t("plan3Feature4")}
        plan3Feature5={t("plan3Feature5")}
        plan3Cta={t("plan3Cta")}
      />

      <CtaSection
        locale={locale}
        ctaTitle={t("ctaTitle")}
        ctaDesc={t("ctaDesc")}
        ctaButton={t("ctaButton")}
      />

      <MarketingFooter
        locale={locale}
        appName={t("appName")}
        footerTagline={t("footerTagline")}
        footerRights={t("footerRights")}
        footerImpressum={t("footerImpressum")}
        footerDatenschutz={t("footerDatenschutz")}
        footerKontakt={t("footerKontakt")}
      />
    </div>
  );
}
