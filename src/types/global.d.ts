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

    // Note: Google Maps types are declared in google-maps.ts
  }
}

export {}
