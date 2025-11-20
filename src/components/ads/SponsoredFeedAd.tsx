'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

type Props = {
  slotId?: string
  className?: string
}

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const defaultSlotId = process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT

export function SponsoredFeedAd({ slotId, className }: Props) {
  const pushedRef = useRef(false)
  const resolvedSlotId = slotId || defaultSlotId

  useEffect(() => {
    if (!clientId || !resolvedSlotId || pushedRef.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushedRef.current = true
    } catch {
      // ignore in dev/ssr
    }
  }, [resolvedSlotId])

  const showPlaceholder = !clientId || !resolvedSlotId

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm',
        'min-h-[260px]',
        className
      )}
    >
      {clientId && resolvedSlotId && (
        <>
          <Script
            id="adsbygoogle-init"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
          <ins
            className="adsbygoogle block w-full"
            style={{ display: 'block', minHeight: 260 }}
            data-ad-client={clientId}
            data-ad-slot={resolvedSlotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      )}

      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-center text-sm text-slate-500">
          Set NEXT_PUBLIC_ADSENSE_CLIENT and NEXT_PUBLIC_ADSENSE_FEED_SLOT to load the sponsored feed ad.
        </div>
      )}
    </div>
  )
}
