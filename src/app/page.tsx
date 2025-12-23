import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Header } from '@/components/marketing/Header'
import { HeroSection } from '@/components/marketing/HeroSection'
import { createClient } from '@/lib/supabase/server'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

export const metadata: Metadata = {
  title: 'HomeMatch - Swipe. Match. Move In.',
  description:
    'House hunting just became your favorite shared activity. Find a home that works for your household with AI that learns what you care about.',
  keywords:
    'house hunting, real estate, roommates, household, AI matching, property search, home finding',
  openGraph: {
    title: 'HomeMatch - Swipeable Home Search',
    description: 'The modern way for households to find a home together',
    images: [`${siteUrl}/og-image.jpg`],
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HomeMatch - Swipe to Find Your Next Home',
    description: 'House hunting for modern households',
    images: [`${siteUrl}/twitter-image.jpg`],
  },
  alternates: {
    canonical: siteUrl,
  },
}

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: siteUrl,
    name: 'HomeMatch',
    description:
      'HomeMatch helps households swipe, match, and find a home together with collaborative search.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
