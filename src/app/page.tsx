import { HeroSection } from '@/components/marketing/HeroSection'
import { Header } from '@/components/marketing/Header'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HomeMatch - Swipe. Match. Move In.',
  description:
    'House hunting just became your favorite couples activity. Find your perfect home together with AI that learns what you both love.',
  keywords:
    'house hunting, real estate, couples, AI matching, property search, home finding',
  openGraph: {
    title: 'HomeMatch - Tinder for Houses',
    description: 'The modern way for couples to find their dream home',
    images: ['/og-image.jpg'],
    type: 'website',
    url: 'https://homematch.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HomeMatch - Swipe Right on Your Dream Home',
    description: 'House hunting for the modern couple',
    images: ['/twitter-image.jpg'],
  },
  alternates: {
    canonical: 'https://homematch.app',
  },
}

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Dynamically import below-the-fold components to reduce initial bundle/TTFB
  const [FeatureGrid, SwipeDemo, Footer, HowItWorks, CtaBand] = await Promise.all([
    (async () =>
      (await import('@/components/marketing/FeatureGrid')).FeatureGrid)(),
    (async () =>
      (await import('@/components/marketing/SwipeDemo')).SwipeDemo)(),
    (async () => (await import('@/components/marketing/Footer')).Footer)(),
    (async () =>
      (await import('@/components/marketing/HowItWorks')).HowItWorks)(),
    (async () => (await import('@/components/marketing/CtaBand')).CtaBand)(),
  ])

  // If user is already authenticated, redirect to validation page
  if (user) {
    redirect('/validation')
  }

  return (
    <>
      <Header />
      <HeroSection />
      <FeatureGrid />
      <HowItWorks />
      <SwipeDemo />
      <CtaBand />
      <Footer />
    </>
  )
}
