'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SecureMapLoader } from '@/components/shared/SecureMapLoader'
import { parsePostGISPolygon, type LatLng } from '@/lib/utils/coordinates'
import { getGoogleMapsMapId } from '@/lib/maps/config'
import type { NeighborhoodOption } from '@/lib/services/locations-client'
import type {
  GoogleMapInstance,
  GooglePolygonInstance,
} from '@/types/google-maps'
import { Loader2, MapPin } from 'lucide-react'

type LocationMapSelectorProps = {
  neighborhoods: NeighborhoodOption[]
  selectedNeighborhoods: string[]
  onToggleNeighborhood: (neighborhood: NeighborhoodOption) => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }

const UNSELECTED_STYLE = {
  strokeColor: '#64748b',
  strokeOpacity: 0.7,
  strokeWeight: 1,
  fillColor: '#1f2937',
  fillOpacity: 0.2,
}

const SELECTED_STYLE = {
  strokeColor: '#f59e0b',
  strokeOpacity: 0.95,
  strokeWeight: 2,
  fillColor: '#f59e0b',
  fillOpacity: 0.35,
}

export function LocationMapSelector({
  neighborhoods,
  selectedNeighborhoods,
  onToggleNeighborhood,
  disabled = false,
  loading = false,
  className = '',
}: LocationMapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null)
  const polygonsRef = useRef<Map<string, GooglePolygonInstance>>(new Map())
  const fitBoundsRef = useRef(false)
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const polygonData = useMemo(() => {
    return neighborhoods
      .map((neighborhood) => {
        const rings = parsePostGISPolygon(neighborhood.bounds)
        if (!rings || rings.length === 0) return null
        return { neighborhood, rings }
      })
      .filter(
        (
          value
        ): value is { neighborhood: NeighborhoodOption; rings: LatLng[][] } =>
          Boolean(value)
      )
  }, [neighborhoods])

  const selectedSet = useMemo(
    () => new Set(selectedNeighborhoods),
    [selectedNeighborhoods]
  )

  useEffect(() => {
    if (!mapsReady) return
    if (!mapRef.current) return
    if (!window.google?.maps) return
    if (mapInstanceRef.current) return

    const mapId = getGoogleMapsMapId()
    const map = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 9,
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
    })

    mapInstanceRef.current = map
  }, [mapsReady])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.google?.maps) return

    const nextIds = new Set(polygonData.map((item) => item.neighborhood.id))

    for (const [id, polygon] of polygonsRef.current) {
      if (!nextIds.has(id)) {
        polygon.setMap(null)
        polygonsRef.current.delete(id)
      }
    }

    for (const { neighborhood, rings } of polygonData) {
      const existing = polygonsRef.current.get(neighborhood.id)
      const selected = selectedSet.has(neighborhood.id)
      const options = {
        paths: rings,
        clickable: !disabled,
        ...UNSELECTED_STYLE,
        ...(selected ? SELECTED_STYLE : {}),
      }

      if (existing) {
        existing.setOptions(options)
        continue
      }

      const polygon = new window.google.maps.Polygon(options)
      polygon.addListener('click', () => {
        if (disabled) return
        onToggleNeighborhood(neighborhood)
      })
      polygon.setMap(map)
      polygonsRef.current.set(neighborhood.id, polygon)
    }

    if (!fitBoundsRef.current && polygonData.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      polygonData.forEach(({ rings }) => {
        rings.forEach((ring) => {
          ring.forEach((point) => bounds.extend(point))
        })
      })
      map.fitBounds?.(bounds)
      fitBoundsRef.current = true
    }
  }, [disabled, mapsReady, onToggleNeighborhood, polygonData, selectedSet])

  useEffect(() => {
    const polygons = polygonsRef.current
    return () => {
      polygons.forEach((polygon) => polygon.setMap(null))
      polygons.clear()
    }
  }, [])

  return (
    <SecureMapLoader
      onLoad={() => {
        setMapsReady(true)
        setMapError(null)
      }}
      onError={(error) => {
        setMapError(error.message)
      }}
    >
      <div
        className={`relative h-96 w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] ${className}`}
      >
        <div ref={mapRef} className="absolute inset-0" />

        {(loading || !mapsReady) && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading map...
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <div className="text-center text-sm text-slate-300">
              <MapPin className="mx-auto mb-2 h-5 w-5 text-slate-400" />
              {mapError}
            </div>
          </div>
        )}

        {!loading && !mapError && polygonData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <div className="text-center text-sm text-slate-300">
              <MapPin className="mx-auto mb-2 h-5 w-5 text-slate-400" />
              No neighborhood boundaries available yet.
            </div>
          </div>
        )}

        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-center text-sm text-slate-200">
            Map selection is disabled while all cities are selected.
          </div>
        )}

        <div className="pointer-events-none absolute top-3 left-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
          Click neighborhoods to toggle selection.
        </div>
      </div>
    </SecureMapLoader>
  )
}
