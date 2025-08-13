'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

interface SecureMapLoaderProps {
  children: React.ReactNode
  onLoad?: () => void
  onError?: (error: Error) => void
}

// Global state to track if Google Maps is loaded
let isGoogleMapsLoaded = false
let isGoogleMapsLoading = false
const loadPromise = new Promise<void>((resolve, reject) => {
  if (typeof window !== 'undefined') {
    (window as any).__googleMapsResolve = resolve
    ;(window as any).__googleMapsReject = reject
  }
})

/**
 * Secure Google Maps loader component that:
 * 1. Uses Next.js Script component for optimal loading
 * 2. Implements proper error handling
 * 3. Prevents multiple loading attempts
 * 4. Provides loading state management
 */
export function SecureMapLoader({ children, onLoad, onError }: SecureMapLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (isGoogleMapsLoaded) {
      setIsLoaded(true)
      onLoad?.()
      return
    }

    // Wait for loading promise if already loading
    if (isGoogleMapsLoading) {
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
    }
  }, [onLoad, onError])

  const handleLoad = () => {
    // Verify Google Maps API is actually available
    if (!window.google?.maps) {
      const error = new Error('Google Maps API not available after load')
      setError(error)
      onError?.(error)
      ;(window as any).__googleMapsReject?.(error)
      return
    }

    isGoogleMapsLoaded = true
    isGoogleMapsLoading = false
    setIsLoaded(true)
    onLoad?.()
    ;(window as any).__googleMapsResolve?.()
  }

  const handleError = (e: any) => {
    isGoogleMapsLoading = false
    const error = new Error(`Failed to load Google Maps script: ${e.message || 'Unknown error'}`)
    setError(error)
    onError?.(error)
    ;(window as any).__googleMapsReject?.(error)
  }

  const handleLoadStart = () => {
    isGoogleMapsLoading = true
  }

  // Don't load script if already loaded or loading
  if (isGoogleMapsLoaded || isGoogleMapsLoading) {
    return <>{isLoaded ? children : <MapLoadingFallback />}</>
  }

  // Validate API key is available
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured')
    return <MapErrorFallback error="Maps service unavailable" />
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`}
        strategy="afterInteractive"
        onLoad={handleLoad}
        onError={handleError}
        onReady={handleLoadStart}
      />
      {isLoaded ? children : error ? <MapErrorFallback error={error.message} /> : <MapLoadingFallback />}
    </>
  )
}

function MapLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-32 w-full bg-gray-100 rounded-lg">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading map...</span>
      </div>
    </div>
  )
}

function MapErrorFallback({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-32 w-full bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="text-red-500 text-sm mb-1">⚠️ Map Unavailable</div>
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
    if (isGoogleMapsLoaded) {
      setIsLoaded(true)
      return
    }

    if (isGoogleMapsLoading) {
      loadPromise
        .then(() => setIsLoaded(true))
        .catch(setError)
    }
  }, [])

  return { isLoaded, error }
}