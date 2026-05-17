'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Property } from '@/lib/schemas/property'
import { ExternalLink, MapPin } from 'lucide-react'
import {
  SecureMapLoader,
  useGoogleMapsLoader,
} from '@/components/shared/SecureMapLoader'
import { parsePostGISGeometry, isValidLatLng } from '@/lib/utils/coordinates'
import { getGoogleMapsMapId } from '@/lib/maps/config'

import type {
  GoogleMapInstance,
  GoogleAnyMarkerInstance,
} from '@/types/google-maps'

interface PropertyMapProps {
  property: Property
  className?: string
  zoom?: number
  showMarker?: boolean
}

const MARKER_PIN_SVG = `
  <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.45"/>
      </filter>
      <linearGradient id="marker-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    <path d="M18 1 C9.16 1 2 8.16 2 17 C2 28.5 18 43 18 43 C18 43 34 28.5 34 17 C34 8.16 26.84 1 18 1 Z"
          fill="url(#marker-fill)" stroke="#ffffff" stroke-width="1.75" filter="url(#marker-shadow)"/>
    <circle cx="18" cy="17" r="6.5" fill="#ffffff"/>
    <circle cx="18" cy="17" r="2.75" fill="#d97706"/>
  </svg>
`

function buildGoogleMapsLink(property: Property): string {
  const q = encodeURIComponent(
    [property.address, property.city, property.state, property.zip_code]
      .filter(Boolean)
      .join(', ')
  )
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

function escapeHtml(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildInfoWindowHtml(property: Property): string {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(property.price)

  const address = escapeHtml(property.address)
  const cityState = escapeHtml(
    [property.city, property.state].filter(Boolean).join(', ')
  )
  const zip = escapeHtml(property.zip_code)
  return `
    <div style="min-width:180px;max-width:240px;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;padding:4px 6px;">
      <div style="font-size:13px;font-weight:600;line-height:1.25;margin-bottom:2px;">${address}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${cityState}${zip ? ` &middot; ${zip}` : ''}</div>
      <div style="font-size:14px;font-weight:700;color:#b45309;">${formattedPrice}</div>
    </div>
  `
}

export function PropertyMap({
  property,
  className = '',
  zoom = 15,
  showMarker = true,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [isMapInitialized, setIsMapInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapsReady, setMapsReady] = useState(false)

  const parsedCoords = useMemo(
    () => parsePostGISGeometry(property.coordinates),
    [property.coordinates]
  )
  const hasValidCoordinates =
    Boolean(parsedCoords) && isValidLatLng(parsedCoords!)

  const { isLoaded: isGoogleLoaded, error: loaderError } = useGoogleMapsLoader()

  useEffect(() => {
    if (!hasValidCoordinates) return
    if (!mapRef.current) return
    const mapsApiReady =
      mapsReady || isGoogleLoaded || Boolean(window.google?.maps)
    if (!mapsApiReady) return
    if (!window.google?.maps) return

    setError(null)

    try {
      const coords = parsedCoords!
      const mapId = getGoogleMapsMapId()

      const map = new window.google.maps.Map(mapRef.current, {
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
        gestureHandling: 'cooperative',
        clickableIcons: false,
        backgroundColor: '#0f172a',
      })

      if (showMarker) {
        const title = property.address || 'Property'
        const marker = createPropertyMarker({
          coords,
          map,
          title,
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: buildInfoWindowHtml(property),
          maxWidth: 260,
        })

        marker.addListener('click', () => {
          infoWindow.open({ map, anchor: marker })
        })
      }

      setIsMapInitialized(true)

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current?.disconnect()
        resizeObserverRef.current = new ResizeObserver(() => {
          window.google?.maps?.event?.trigger?.(map, 'resize')
          map.setCenter(coords)
        })
        resizeObserverRef.current.observe(mapRef.current)
      }

      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          window.google?.maps?.event?.trigger?.(map, 'resize')
          map.setCenter(coords)
        })
      }
    } catch (err) {
      console.error('Error loading map:', err)
      const fallbackMessage =
        err instanceof Error ? err.message : 'Failed to load map'
      setError(fallbackMessage)
      setIsMapInitialized(false)
    }
  }, [
    hasValidCoordinates,
    isGoogleLoaded,
    mapsReady,
    parsedCoords,
    property,
    showMarker,
    zoom,
  ])

  useEffect(() => {
    setError(null)
    setIsMapInitialized(false)
  }, [property.id])

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect()
    }
  }, [])

  if (!hasValidCoordinates) {
    return (
      <MapFallback
        className={className}
        message="Map unavailable"
        property={property}
      />
    )
  }

  const isInitialLoading = !isMapInitialized && !error && !loaderError

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
        setIsMapInitialized(false)
      }}
    >
      <div
        className={`border-hm-stone-200 bg-hm-ivory-100 relative h-32 w-full overflow-hidden rounded-lg border ${className}`}
        style={{ minHeight: '128px' }}
        data-testid="property-map"
      >
        <div
          ref={mapRef}
          className={`absolute inset-0 rounded-lg transition-opacity duration-500 ${
            isMapInitialized ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!isMapInitialized}
        />

        {isInitialLoading && <MapLoadingShimmer />}

        {(loaderError || error) && (
          <MapErrorOverlay
            message={error ?? loaderError?.message ?? 'Unable to load map'}
            property={property}
          />
        )}
      </div>
    </SecureMapLoader>
  )
}

function MapLoadingShimmer() {
  return (
    <div
      className="bg-hm-ivory-100 absolute inset-0 flex items-center justify-center overflow-hidden"
      data-testid="property-map-skeleton"
      aria-busy="true"
    >
      <div className="absolute inset-0 animate-[shimmer_1.6s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_30%,rgba(194,129,65,0.16)_50%,transparent_70%)] bg-[length:200%_100%]" />
      <div className="border-hm-stone-200 relative flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1.5 backdrop-blur-sm">
        <span className="bg-hm-gold-400 h-2 w-2 animate-pulse rounded-full" />
        <span className="text-hm-stone-600 text-[11px] font-medium tracking-[0.18em] uppercase">
          Loading map
        </span>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

function MapErrorOverlay({
  message,
  property,
}: {
  message: string
  property: Property
}) {
  return (
    <div
      className="bg-hm-ivory-100/95 absolute inset-0 flex items-center justify-center px-4"
      data-testid="property-map-error"
    >
      <div className="text-center">
        <MapPin className="text-hm-gold-500 mx-auto mb-1.5 h-6 w-6" />
        <p className="text-hm-stone-700 text-xs font-medium">{message}</p>
        <a
          href={buildGoogleMapsLink(property)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-hm-gold-700 hover:text-hm-gold-800 mt-2 inline-flex items-center gap-1 text-[11px] font-semibold"
          aria-label="Open in Google Maps"
        >
          Open in Google Maps
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

function MapFallback({
  className,
  message,
  property,
}: {
  className: string
  message: string
  property: Property
}) {
  const hasAddressContext = Boolean(property.address || property.city)
  return (
    <div
      className={`border-hm-stone-200 bg-hm-ivory-100 relative h-32 w-full overflow-hidden rounded-lg border ${className}`}
      data-testid="property-map-fallback"
    >
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="text-center">
          <MapPin className="text-hm-stone-500 mx-auto mb-1.5 h-6 w-6" />
          <p className="text-hm-stone-600 text-xs font-medium">{message}</p>
          {hasAddressContext && (
            <a
              href={buildGoogleMapsLink(property)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-hm-gold-700 hover:text-hm-gold-800 mt-2 inline-flex items-center gap-1 text-[11px] font-semibold"
              aria-label="Open in Google Maps"
            >
              Open in Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function createPropertyMarker({
  coords,
  map,
  title,
}: {
  coords: { lat: number; lng: number }
  map: GoogleMapInstance
  title: string
}): GoogleAnyMarkerInstance {
  const maps = window.google?.maps
  if (!maps) {
    throw new Error('Google Maps API not available')
  }

  try {
    const mapId = getGoogleMapsMapId()
    const advancedMarkerCtor = maps.marker?.AdvancedMarkerElement
    if (mapId && advancedMarkerCtor) {
      const pinContent = createAdvancedMarkerContent()
      return new advancedMarkerCtor({
        position: coords,
        map,
        title,
        ...(pinContent ? { content: pinContent } : {}),
      })
    }
  } catch (error) {
    console.warn(
      '[PropertyMap] Advanced marker init failed, falling back',
      error
    )
  }

  return new maps.Marker({
    position: coords,
    map,
    title,
    animation: maps.Animation?.DROP,
    icon: {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(MARKER_PIN_SVG),
      scaledSize: new maps.Size(36, 44),
      anchor: new maps.Point(18, 44),
    },
  })
}

function createAdvancedMarkerContent(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const wrapper = document.createElement('div')
  wrapper.style.transform = 'translateY(-2px)'
  wrapper.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))'
  wrapper.innerHTML = MARKER_PIN_SVG
  return wrapper
}
