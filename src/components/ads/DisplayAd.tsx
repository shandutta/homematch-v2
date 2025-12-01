'use client'

import { useEffect, useRef, useState, useId } from 'react'

// Share the window declaration
declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>
  }
}

// Track pushed ads to prevent double-push in React Strict Mode
const pushedAdIds = new Set<string>()

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
  const adInstanceId = useId()

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (pushedAdIds.has(adInstanceId)) {
      return
    }

    const insElement = adRef.current?.querySelector('.adsbygoogle')
    if (!insElement) return

    if (insElement.getAttribute('data-adsbygoogle-status')) {
      pushedAdIds.add(adInstanceId)
      return
    }

    pushedAdIds.add(adInstanceId)

    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (error) {
      console.warn('AdSense failed to load:', error)
      pushedAdIds.delete(adInstanceId)
      setHasError(true)
    }
  }, [adInstanceId])

  if (hasError) return null

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
          data-ad-client="ca-pub-9556502662108721"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      )}
    </div>
  )
}

export default DisplayAd
