'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>
  }
}

interface InFeedAdProps {
  /** Position in the feed (for tracking) */
  position?: number
  /** Custom class name for the container */
  className?: string
}

/**
 * Google AdSense In-Feed Ad Component
 *
 * Displays a sponsored ad that matches the property card style.
 * Appears between property listings in the grid.
 */
export function InFeedAd({ position = 0, className = '' }: InFeedAdProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    // Check if this specific ins element already has an ad or is pending
    const insElement = adRef.current?.querySelector('.adsbygoogle')
    if (!insElement) return

    // Check if already processed (either by Google or by us in a previous mount)
    if (
      insElement.getAttribute('data-adsbygoogle-status') ||
      insElement.getAttribute('data-ad-push-pending')
    ) {
      setIsLoaded(!!insElement.getAttribute('data-adsbygoogle-status'))
      return
    }

    // Mark as pending BEFORE pushing (persists across Strict Mode remounts)
    insElement.setAttribute('data-ad-push-pending', 'true')

    try {
      // Push the ad to be loaded
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      setIsLoaded(true)
    } catch (error) {
      console.warn('AdSense failed to load:', error)
      insElement.removeAttribute('data-ad-push-pending')
      setHasError(true)
    }
  }, [])

  // Don't render anything if there's an error (graceful degradation)
  if (hasError) {
    return null
  }

  return (
    <div
      ref={adRef}
      className={`bg-card rounded-token-xl shadow-token-lg relative flex flex-col overflow-hidden border border-white/10 transition-all ${className}`}
      data-ad-position={position}
    >
      {/* Sponsored label */}
      <div className="absolute top-3 right-3 z-10">
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/70 uppercase backdrop-blur-sm">
          Sponsored
        </span>
      </div>

      {/* Ad container */}
      <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center p-4">
        {!isLoaded && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        )}

        {/* Google AdSense In-feed Ad */}
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            height: isLoaded ? 'auto' : '0',
            minHeight: isLoaded ? '250px' : '0',
          }}
          data-ad-format="fluid"
          data-ad-layout-key="-fb+5w+4e-db+86"
          data-ad-client="ca-pub-9556502662108721"
          data-ad-slot="3059335227"
        />
      </div>

      {/* Bottom label */}
      <div className="border-t border-white/5 bg-white/5 px-4 py-2">
        <p className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
          Partner content
        </p>
      </div>
    </div>
  )
}

export default InFeedAd
