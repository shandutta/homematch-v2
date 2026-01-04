'use client'

import Script from 'next/script'
import { ADSENSE_ENABLED, ADSENSE_SRC } from '@/lib/adsense'
import { useCookieConsent } from '@/lib/cookies/use-cookie-consent'

export function AdSenseGate() {
  const { consent } = useCookieConsent()

  const shouldLoad =
    ADSENSE_ENABLED &&
    process.env.NODE_ENV === 'production' &&
    Boolean(consent?.advertising)

  if (!shouldLoad) return null

  return (
    <Script
      id="adsbygoogle-init"
      async
      src={ADSENSE_SRC}
      crossOrigin="anonymous"
    />
  )
}
