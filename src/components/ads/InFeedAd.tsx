'use client'

import { useEffect, useRef, useState, useId } from 'react'

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>
  }
}

// Global Set to track which ad instances have been pushed
// This persists across React re-renders and Strict Mode double-mounting
const pushedAdIds = new Set<string>()

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
  // Use React's useId for a stable unique ID across renders
  const adInstanceId = useId()

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    // Check if we've already pushed for this specific ad instance
    if (pushedAdIds.has(adInstanceId)) {
      setIsLoaded(true)
      return
    }

    const insElement = adRef.current?.querySelector('.adsbygoogle')
    if (!insElement) return

    // Check if Google has already processed this element
    if (insElement.getAttribute('data-adsbygoogle-status')) {
      setIsLoaded(true)
      pushedAdIds.add(adInstanceId)
      return
    }

    // Mark as pushed BEFORE calling push to prevent duplicate calls
    pushedAdIds.add(adInstanceId)

    try {
      // Push the ad to be loaded
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      setIsLoaded(true)
    } catch (error) {
      console.warn('AdSense failed to load:', error)
      pushedAdIds.delete(adInstanceId)
      setHasError(true)
    }
  }, [adInstanceId])

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

      {/* Ad container - sized to match PropertyCard height */}
      <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center p-4">
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
            minHeight: isLoaded ? '380px' : '0',
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
