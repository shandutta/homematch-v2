'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useCookieConsent } from '@/lib/cookies/use-cookie-consent'

export function AnalyticsGate() {
  const { consent } = useCookieConsent()

  if (!consent?.analytics) return null

  return <SpeedInsights />
}
