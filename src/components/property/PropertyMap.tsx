'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Property } from '@/lib/schemas/property'
import { MapPin, Loader2 } from 'lucide-react'
import {
  SecureMapLoader,
  useGoogleMapsLoader,
} from '@/components/shared/SecureMapLoader'
import { parsePostGISGeometry, isValidLatLng } from '@/lib/utils/coordinates'

import type {
  GoogleMapInstance,
  GoogleMarkerInstance,
  GoogleInfoWindowInstance,
} from '@/types/google-maps'

// Extend Window interface for Google Maps to satisfy TS during SSR/type-check.
// The actual Google Maps script populates window.google at runtime in the browser.

interface PropertyMapProps {
  property: Property
  className?: string
  zoom?: number
  showMarker?: boolean
}

export function PropertyMap({
  property,
  className = '',
  zoom = 15,
  showMarker = true,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapsReady, setMapsReady] = useState(false)

  const parsedCoords = useMemo(
    () => parsePostGISGeometry(property.coordinates),
    [property.coordinates]
  )
  const hasValidCoordinates =
    Boolean(parsedCoords) && isValidLatLng(parsedCoords!)

  // Listen for global maps script load (for cases where another map loaded first)
  const { isLoaded: isGoogleLoaded, error: loaderError } = useGoogleMapsLoader()

  useEffect(() => {
    if (!hasValidCoordinates) return
    if (!mapRef.current) return
    if (!mapsReady && !isGoogleLoaded) return
    if (!window.google?.maps) return

    setIsLoading(true)
    setError(null)

    try {
      const coords = parsedCoords!

      const map = new window.google.maps.Map(mapRef.current, {
        center: coords,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      if (showMarker) {
        const marker = new window.google.maps.Marker({
          position: coords,
          map,
          title: property.address || 'Property',
          icon: {
            url:
              'data:image/svg+xml;charset=UTF-8,' +
              encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
                <circle cx="16" cy="16" r="6" fill="#ffffff"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          },
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-3 max-w-xs">
              <h3 class="font-semibold text-sm mb-1">${property.address}</h3>
              <p class="text-xs text-gray-600">${property.city}, ${property.state}</p>
              <p class="text-xs font-bold text-blue-600 mt-1">$${property.price.toLocaleString()}</p>
            </div>
          `,
        })

        ;(marker as GoogleMarkerInstance).addListener('click', () => {
          ;(infoWindow as GoogleInfoWindowInstance).open(
            map as GoogleMapInstance,
            marker as GoogleMarkerInstance
          )
        })
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Error loading map:', err)
      const fallbackMessage =
        err instanceof Error ? err.message : 'Failed to load map'
      setError(fallbackMessage)
      setIsLoading(false)
    }
  }, [
    hasValidCoordinates,
    isGoogleLoaded,
    mapsReady,
    parsedCoords,
    property.address,
    property.city,
    property.price,
    property.state,
    showMarker,
    zoom,
  ])

  if (!hasValidCoordinates) {
    return (
      <div
        className={`relative h-32 w-full overflow-hidden rounded-lg bg-slate-800/50 ${className}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="mx-auto mb-1 h-6 w-6 text-slate-500" />
            <p className="text-xs text-slate-400">Map unavailable</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SecureMapLoader
      onLoad={() => {
        setMapsReady(true)
        setError(null)
      }}
      onError={(loadError) => {
        console.error('Map loader error:', loadError)
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load mapping service'
        setError(message)
        setIsLoading(false)
      }}
    >
      <div
        className={`relative h-32 w-full overflow-hidden rounded-lg border ${className}`}
        style={{ minHeight: '128px' }}
      >
        <div ref={mapRef} className="absolute inset-0 rounded-lg" />

        {(isLoading || !mapsReady) && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/60">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {loaderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
            <div className="text-center">
              <MapPin className="mx-auto mb-1 h-6 w-6 text-slate-500" />
              <p className="text-xs text-slate-400">
                {loaderError.message ?? 'Map unavailable'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
            <div className="text-center">
              <MapPin className="mx-auto mb-1 h-6 w-6 text-slate-500" />
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          </div>
        )}
      </div>
    </SecureMapLoader>
  )
}
