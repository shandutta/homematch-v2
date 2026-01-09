'use client'

import { useEffect, useRef, useState } from 'react'
import { Property } from '@/lib/schemas/property'
import { MapPin, Loader2 } from 'lucide-react'
import { getGoogleMapsMapId } from '@/lib/maps/config'
import { parsePostGISGeometry, isValidLatLng } from '@/lib/utils/coordinates'

import type { GoogleMapInstance } from '@/types/google-maps'

// Extend Window interface for Google Maps to satisfy TS during SSR/type-check.
// The actual Google Maps script populates window.google at runtime in the browser.

interface EnhancedPropertyMapProps {
  property: Property
  className?: string
  zoom?: number
  showMarker?: boolean
}

export function EnhancedPropertyMap({
  property,
  className = '',
  zoom = 15,
  showMarker = true,
}: EnhancedPropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current || !property.coordinates) return

    // Check if Google Maps is loaded
    if (!window.google?.maps) {
      setError('Google Maps not loaded')
      setIsLoading(false)
      return
    }

    try {
      const coords = parsePostGISGeometry(property.coordinates)

      if (!coords || !isValidLatLng(coords)) {
        setError('No coordinates available')
        setIsLoading(false)
        return
      }

      const mapId = getGoogleMapsMapId()

      // Create map with proper typing
      const map: GoogleMapInstance = new window.google.maps.Map(
        mapRef.current,
        {
          center: coords,
          zoom,
          ...(mapId ? { mapId } : {}),
          ...(!mapId
            ? {
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
              }
            : {}),
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }
      )

      // Add marker
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

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-3 max-w-xs">
              <h3 class="font-semibold text-sm mb-1">${property.address}</h3>
              <p class="text-xs text-gray-600">${property.city}, ${property.state}</p>
              <p class="text-xs font-bold text-blue-600 mt-1">$${property.price.toLocaleString()}</p>
            </div>
          `,
        })

        marker.addListener('click', () => {
          infoWindow.open(map, marker)
        })
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Error loading map:', err)
      setError('Failed to load map')
      setIsLoading(false)
    }
  }, [
    property.coordinates,
    zoom,
    showMarker,
    property.address,
    property.city,
    property.price,
    property.state,
  ])

  if (isLoading) {
    return (
      <div
        className={`relative h-32 w-full overflow-hidden rounded-lg bg-gray-100 ${className}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error || !property.coordinates) {
    return (
      <div
        className={`relative h-32 w-full overflow-hidden rounded-lg bg-gray-100 ${className}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="mx-auto mb-1 h-6 w-6 text-gray-400" />
            <p className="text-xs text-gray-600">
              {error || 'Map unavailable'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className={`h-32 w-full rounded-lg border ${className}`}
      style={{ minHeight: '128px' }}
    />
  )
}
