/**
 * Global type declarations for the Window interface
 * This extends the Window interface with analytics and monitoring properties
 */

import type { GtagFunction, SentryHub, PostHogFunction } from './analytics'

declare global {
  interface Window {
    // Analytics
    gtag?: GtagFunction
    Sentry?: SentryHub
    posthog?: PostHogFunction

    // Performance monitoring
    __REACT_HYDRATION_TIME__?: number
    webVitals?: {
      onCLS?: (metric: unknown) => void
      onFID?: (metric: unknown) => void
      onFCP?: (metric: unknown) => void
      onLCP?: (metric: unknown) => void
      onTTFB?: (metric: unknown) => void
      onINP?: (metric: unknown) => void
    }

    // Optional global toast API (used on marketing/landing pages)
    toast?: (options: {
      title: string
      description?: string
      variant?: string
    }) => void

    // iOS haptic feedback hooks
    hapticFeedback?: Partial<Record<string, () => void>>
    webkitAudioContext?: typeof AudioContext

    // AdSense global queue
    adsbygoogle?: Array<Record<string, unknown>>

    // Map test hooks (used in Playwright/unit tests)
    __homematchMapTestHooks?: {
      selectCity?: (key: string) => void
      drawSelection?: (ring: unknown) => void
    }

    // Google Maps loader callback
    initGoogleMaps?: () => void

    // Note: Google Maps types are declared in google-maps.ts
  }

  interface Navigator {
    connection?: {
      saveData?: boolean
      effectiveType?: string
    }
  }

  interface DeviceMotionEventConstructor {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }
}

export {}
