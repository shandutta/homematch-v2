'use client'

import dynamic from 'next/dynamic'
import { useCookieConsent } from '@/lib/cookies/use-cookie-consent'

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((mod) => mod.SpeedInsights),
  { ssr: false }
)

export function AnalyticsGate() {
  const { consent } = useCookieConsent()

  if (!consent?.analytics) return null

  return <SpeedInsights />
}
