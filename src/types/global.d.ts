/**
 * Global type declarations for the Window interface
 * This extends the Window interface with analytics and monitoring properties
 */

import type { JSX as ReactJSX } from 'react'
import type { GtagFunction, SentryHub, PostHogFunction } from './analytics'

declare global {
  namespace JSX {
    type Element = ReactJSX.Element
    /* eslint-disable @typescript-eslint/no-empty-object-type */
    interface ElementClass extends ReactJSX.ElementClass {}
    interface ElementAttributesProperty
      extends ReactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute
      extends ReactJSX.ElementChildrenAttribute {}
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T>
      extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
    /* eslint-enable @typescript-eslint/no-empty-object-type */
  }

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

    // Debug state for map selection
    __hmMapDebug?: Record<string, unknown>

    // Performance budget helpers (Playwright)
    __hmPerf?: {
      lcp: number
      cls: number
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
