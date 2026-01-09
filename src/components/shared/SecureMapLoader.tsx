'use client'

import { useEffect, useState, useCallback } from 'react'

interface SecureMapLoaderProps {
  children: React.ReactNode
  onLoad?: () => void
  onError?: (error: Error) => void
}

// Global state to track if Google Maps is loaded
let isGoogleMapsLoaded = false
let isGoogleMapsLoading = false
let loadPromise: Promise<void> | null = null
const isMapDebug = process.env.NEXT_PUBLIC_MAP_DEBUG === 'true'

const logMapLoader = (
  message: string,
  payload?: Record<string, unknown> | null
) => {
  if (!isMapDebug) return
  if (payload) {
    console.log('[SecureMapLoader]', message, payload)
  } else {
    console.log('[SecureMapLoader]', message)
  }
}

// Test helper to reset loader state safely between unit tests
export function __resetSecureMapLoaderStateForTests() {
  if (process.env.NODE_ENV !== 'test') return
  isGoogleMapsLoaded = false
  isGoogleMapsLoading = false
  loadPromise = null
}

const isMapsApiReady = () =>
  typeof window !== 'undefined' &&
  typeof window.google?.maps?.Map === 'function'

/**
 * Secure Google Maps loader component that:
 * 1. Loads Google Maps script through secure server proxy
 * 2. Implements proper error handling without API key exposure
 * 3. Prevents multiple loading attempts
 * 4. Provides loading state management
 * 5. No client-side API key exposure
 */
export function SecureMapLoader({
  children,
  onLoad,
  onError,
}: SecureMapLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded)
  const [error, setError] = useState<Error | null>(null)

  const startSecureMapLoad = useCallback(async () => {
    isGoogleMapsLoading = true

    try {
      // Create promise for this loading attempt
      loadPromise = new Promise<void>((resolve, reject) => {
        logMapLoader('starting script load', {
          hasGoogleMaps: Boolean(window.google?.maps),
        })
        // Set up global callback for Google Maps
        window.initGoogleMaps = () => {
          logMapLoader('initGoogleMaps called', {
            hasGoogleMaps: Boolean(window.google?.maps),
            mapCtor: typeof window.google?.maps?.Map,
          })
          if (!isMapsApiReady()) {
            const error = new Error('Google Maps API not available after load')
            setError(error)
            onError?.(error)
            reject(error)
            return
          }

          isGoogleMapsLoaded = true
          isGoogleMapsLoading = false
          setIsLoaded(true)
          onLoad?.()
          logMapLoader('maps ready')
          resolve()
        }

        // Create and load the script through our secure proxy
        const script = document.createElement('script')
        script.src = '/api/maps/proxy-script'
        script.async = true
        script.defer = true

        script.onload = () => {
          logMapLoader('proxy script loaded')
          // Script loaded successfully
        }

        script.onerror = () => {
          isGoogleMapsLoading = false
          const error = new Error('Failed to load Google Maps script')
          setError(error)
          onError?.(error)
          logMapLoader('proxy script error', { message: error.message })
          reject(error)
        }

        document.head.appendChild(script)
      })

      await loadPromise
    } catch (err) {
      isGoogleMapsLoading = false
      const error =
        err instanceof Error ? err : new Error('Unknown error loading maps')
      setError(error)
      onError?.(error)
    }
  }, [onLoad, onError])

  useEffect(() => {
    if (isMapsApiReady()) {
      logMapLoader('maps already available')
      isGoogleMapsLoaded = true
      setIsLoaded(true)
      onLoad?.()
      return
    }

    if (isGoogleMapsLoaded && isMapsApiReady()) {
      logMapLoader('maps already loaded flag set')
      setIsLoaded(true)
      onLoad?.()
      return
    }

    // Wait for loading promise if already loading
    if (isGoogleMapsLoading && loadPromise) {
      logMapLoader('awaiting existing load promise')
      loadPromise
        .then(() => {
          setIsLoaded(true)
          onLoad?.()
        })
        .catch((err) => {
          const error = new Error(`Google Maps failed to load: ${err.message}`)
          setError(error)
          onError?.(error)
        })
      return
    }

    // Start loading process
    if (!isGoogleMapsLoading) {
      startSecureMapLoad()
    }
  }, [onLoad, onError, startSecureMapLoad])

  // Show appropriate state
  if (error) {
    return <MapErrorFallback error={error.message} />
  }

  if (isLoaded) {
    return <>{children}</>
  }

  return <MapLoadingFallback />
}

function MapLoadingFallback() {
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-lg bg-gray-100">
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading map...</span>
      </div>
    </div>
  )
}

function MapErrorFallback({ error }: { error: string }) {
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-lg bg-gray-100">
      <div className="text-center">
        <div className="mb-1 text-sm text-red-500">⚠️ Map Unavailable</div>
        <div className="text-xs text-gray-600">{error}</div>
      </div>
    </div>
  )
}

// Utility function to check if Google Maps is loaded
export function isGoogleMapsAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.maps)
}

// Hook for components that need to wait for Google Maps
export function useGoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps) {
      isGoogleMapsLoaded = true
      setIsLoaded(true)
      return
    }

    if (isGoogleMapsLoaded) {
      setIsLoaded(true)
      return
    }

    if (isGoogleMapsLoading && loadPromise) {
      loadPromise.then(() => setIsLoaded(true)).catch(setError)
    }
  }, [])

  return { isLoaded, error }
}
