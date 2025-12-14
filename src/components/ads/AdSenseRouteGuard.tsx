'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { AdSenseScript } from '@/components/ads/AdSenseScript'

const AD_ELIGIBLE_PATHS = new Set([
  '/dashboard',
  '/dashboard/liked',
  '/dashboard/passed',
  '/dashboard/viewed',
])

const AD_ELIGIBLE_PREFIXES = ['/dashboard/properties']

const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== 'false'

function isAdEligiblePath(pathname?: string) {
  if (!pathname || !ADSENSE_ENABLED) return false

  const normalizedPath = pathname.replace(/\/?$/, '') || '/'

  return (
    AD_ELIGIBLE_PATHS.has(normalizedPath) ||
    AD_ELIGIBLE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
  )
}

export function AdSenseRouteGuard() {
  const pathname = usePathname()

  const shouldLoadAds = useMemo(() => isAdEligiblePath(pathname), [pathname])

  if (!shouldLoadAds) return null

  return <AdSenseScript />
}

export default AdSenseRouteGuard
