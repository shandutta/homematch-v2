import { redirect } from 'next/navigation'
import { Header } from '@/components/marketing/Header'
import { HeroSection } from '@/components/marketing/HeroSection'
import {
  createPublicRouteMetadata,
  createWebsiteJsonLd,
} from '@/lib/seo/route-metadata'
import { getOptionalServerUser } from '@/lib/supabase/optional-user'

export const metadata = createPublicRouteMetadata({
  title: 'HomeMatch — Collaborative Home Search for Couples & Households',
  description:
    'Collaborative home search for couples and households. Swipe, match, and decide on properties together with AI-powered home matching that learns what you care about.',
})

const websiteJsonLd = createWebsiteJsonLd()

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const user = await getOptionalServerUser()

  // Dynamically import below-the-fold components to reduce initial bundle/TTFB
  const [{ FeatureGrid }, { Footer }, { HowItWorks }, { CtaBand }] =
    await Promise.all([
      import('@/components/marketing/FeatureGrid'),
      import('@/components/marketing/Footer'),
      import('@/components/marketing/HowItWorks'),
      import('@/components/marketing/CtaBand'),
    ])

  // If user is already authenticated, send them straight to the dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HeroSection loggedIn={Boolean(user)} />

      {/* Unified light pattern wrapper for FeatureGrid + HowItWorks */}
      <section className="relative isolate">
        {/* Single shared background across the three sections (continuous layers) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full">
          <div
            className="absolute inset-x-0 top-0 h-full"
            style={{
              background:
                'radial-gradient(1200px 600px at 50% -10%, rgba(2,26,68,0.06) 0%, rgba(2,26,68,0.03) 35%, rgba(255,255,255,1) 65%)',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-full opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(2,26,68,0.08) 0px, rgba(2,26,68,0.08) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(2,26,68,0.08) 0px, rgba(2,26,68,0.08) 1px, transparent 1px, transparent 28px)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-full opacity-[0.06]"
            style={{
              backgroundImage:
                'radial-gradient(600px 300px at 80% 0%, rgba(41,227,255,0.12) 0%, rgba(41,227,255,0) 60%), radial-gradient(700px 320px at 15% 0%, rgba(6,58,158,0.10) 0%, rgba(6,58,158,0) 60%)',
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
