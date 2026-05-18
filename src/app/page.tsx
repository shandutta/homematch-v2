import { Header } from '@/components/marketing/Header'
import { HeroSection } from '@/components/marketing/HeroSection'
import {
  createPublicRouteMetadata,
  createWebsiteJsonLd,
} from '@/lib/seo/route-metadata'

export const metadata = createPublicRouteMetadata({
  title: 'HomeMatch — Collaborative Home Search for Couples & Households',
  description:
    'Collaborative home search for couples and households. Swipe, match, and decide on properties together with AI-powered home matching that learns what you care about.',
})

const websiteJsonLd = createWebsiteJsonLd()

// Static marketing page. Signed-in visitors are redirected to /dashboard by
// middleware before they ever reach here, so this page does no per-request
// auth work — it is prerendered at build time and served from the CDN.
export default async function LandingPage() {
  // Dynamically import below-the-fold components to reduce initial bundle/TTFB
  const [{ FeatureGrid }, { Footer }, { HowItWorks }, { CtaBand }] =
    await Promise.all([
      import('@/components/marketing/FeatureGrid'),
      import('@/components/marketing/Footer'),
      import('@/components/marketing/HowItWorks'),
      import('@/components/marketing/CtaBand'),
    ])

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HeroSection />

      {/* Unified light pattern wrapper for FeatureGrid + HowItWorks */}
      <section className="relative isolate">
        {/* Single shared background across the three sections (continuous layers) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full">
          <div
            className="absolute inset-x-0 top-0 h-full"
            style={{
              background:
                'radial-gradient(1200px 600px at 50% -10%, rgba(183,121,31,0.06) 0%, rgba(183,121,31,0.03) 35%, rgba(251,247,239,1) 65%)',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-full opacity-50"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(95,85,77,0.05) 0px, rgba(95,85,77,0.05) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(95,85,77,0.05) 0px, rgba(95,85,77,0.05) 1px, transparent 1px, transparent 40px)',
              backgroundSize: '40px 40px',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-full opacity-[0.06]"
            style={{
              backgroundImage:
                'radial-gradient(600px 300px at 80% 0%, rgba(210,154,53,0.12) 0%, rgba(210,154,53,0) 60%), radial-gradient(700px 320px at 15% 0%, rgba(146,95,22,0.10) 0%, rgba(146,95,22,0) 60%)',
            }}
            aria-hidden
          />
        </div>

        <FeatureGrid />
        <HowItWorks />
      </section>
      <CtaBand />
      <Footer />
    </>
  )
}
