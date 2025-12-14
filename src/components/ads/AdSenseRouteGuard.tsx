'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { AdSenseScript } from '@/components/ads/AdSenseScript'

const AD_ELIGIBLE_PREFIXES = ['/dashboard']

export function AdSenseRouteGuard() {
  const pathname = usePathname()

  const shouldLoadAds = useMemo(
    () => AD_ELIGIBLE_PREFIXES.some((prefix) => pathname?.startsWith(prefix)),
    [pathname]
  )

  if (!shouldLoadAds) return null

  return <AdSenseScript />
}

export default AdSenseRouteGuard
