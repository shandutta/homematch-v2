'use client'

import { useEffect, useRef, useState } from 'react'

// Share the window declaration
declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>
  }
}

interface DisplayAdProps {
  /** The AdSense ad unit ID (e.g., "1234567890") */
  slot: string
  /** The format of the ad */
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical'
  /** Custom class name for the container */
  className?: string
  /** Whether the ad should be responsive */
  responsive?: boolean
  /** Inline styles for the ins element */
  style?: React.CSSProperties
  /** Optional label to show above the ad */
  label?: string
}

export function DisplayAd({
  slot,
  format = 'auto',
  className = '',
  responsive = true,
  style = {},
  label,
}: DisplayAdProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const [hasError, setHasError] = useState(false)
  // Track if pushed in this instance (persist across Strict Mode remount)
  const isPushed = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isPushed.current) return

    const insElement = adRef.current?.querySelector('.adsbygoogle')
    if (!insElement) return

    if (insElement.getAttribute('data-adsbygoogle-status')) {
      isPushed.current = true
      return
    }

    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      isPushed.current = true
    } catch (error) {
      console.warn('AdSense failed to load:', error)
      setHasError(true)
    }
  }, [])

  if (hasError) return null

  const publisherId =
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || 'ca-pub-9556502662108721'

  return (
    <div
      ref={adRef}
      className={`bg-card flex flex-col items-center justify-center overflow-hidden ${className}`}
    >
      {label && (
        <div className="mb-2 w-full text-center text-xs text-gray-400 uppercase tracking-wider">
          {label}
        </div>
      )}

      {process.env.NODE_ENV === 'development' ? (
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-gray-400">
          <span className="font-mono text-xs">Ad Slot: {slot}</span>
          <span className="text-xs">({format})</span>
        </div>
      ) : (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', ...style }}
          data-ad-client={publisherId}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      )}
    </div>
  )
}

export default DisplayAd
