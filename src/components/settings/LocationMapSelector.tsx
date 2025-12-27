'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SecureMapLoader } from '@/components/shared/SecureMapLoader'
import { parsePostGISPolygon, type LatLng } from '@/lib/utils/coordinates'
import {
  convexHull,
  isPointInPolygon,
  polygonCentroid,
  type GeoPoint,
} from '@/lib/utils/geo-selection'
import { getGoogleMapsMapId } from '@/lib/maps/config'
import type {
  CityOption,
  NeighborhoodOption,
} from '@/lib/services/locations-client'
import type {
  GoogleDrawingManagerInstance,
  GoogleMapInstance,
  GooglePolygonInstance,
} from '@/types/google-maps'
import { Loader2, MapPin, Pencil, Square, X } from 'lucide-react'

type OverlayMode = 'neighborhoods' | 'cities'
type DrawMode = 'polygon' | 'rectangle' | null

type LocationMapSelectorProps = {
  neighborhoods: NeighborhoodOption[]
  selectedNeighborhoods: string[]
  selectedCities: CityOption[]
  overlayMode: OverlayMode
  onToggleNeighborhood: (neighborhood: NeighborhoodOption) => void
  onToggleCity: (city: CityOption) => void
  onBulkSelectNeighborhoods: (neighborhoods: NeighborhoodOption[]) => void
  onBulkSelectCities: (cities: CityOption[]) => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

type NeighborhoodShape = {
  neighborhood: NeighborhoodOption
  rings: LatLng[][]
  centroid: GeoPoint | null
}

type CityShape = {
  city: CityOption
  key: string
  hull: GeoPoint[]
  centroid: GeoPoint | null
}

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }

const NEIGHBORHOOD_STYLE = {
  strokeColor: '#64748b',
  strokeOpacity: 0.7,
  strokeWeight: 1,
  fillColor: '#1f2937',
  fillOpacity: 0.2,
}

const NEIGHBORHOOD_SELECTED_STYLE = {
  strokeColor: '#f59e0b',
  strokeOpacity: 0.95,
  strokeWeight: 2,
  fillColor: '#f59e0b',
  fillOpacity: 0.35,
}

const CITY_STYLE = {
  strokeColor: '#38bdf8',
  strokeOpacity: 0.7,
  strokeWeight: 2,
  fillColor: '#0ea5e9',
  fillOpacity: 0.15,
}

const CITY_SELECTED_STYLE = {
  strokeColor: '#22c55e',
  strokeOpacity: 0.9,
  strokeWeight: 2.5,
  fillColor: '#22c55e',
  fillOpacity: 0.35,
}

const DRAW_POLYGON_STYLE = {
  strokeColor: '#f97316',
  strokeOpacity: 0.9,
  strokeWeight: 2,
  fillColor: '#f97316',
  fillOpacity: 0.15,
}

const DRAW_RECTANGLE_STYLE = {
  strokeColor: '#38bdf8',
  strokeOpacity: 0.9,
  strokeWeight: 2,
  fillColor: '#38bdf8',
  fillOpacity: 0.1,
}

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

export function LocationMapSelector({
  neighborhoods,
  selectedNeighborhoods,
  selectedCities,
  overlayMode,
  onToggleNeighborhood,
  onToggleCity,
  onBulkSelectNeighborhoods,
  onBulkSelectCities,
  disabled = false,
  loading = false,
  className = '',
}: LocationMapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null)
  const neighborhoodPolygonsRef = useRef<Map<string, GooglePolygonInstance>>(
    new Map()
  )
  const cityPolygonsRef = useRef<Map<string, GooglePolygonInstance>>(new Map())
  const drawingManagerRef = useRef<GoogleDrawingManagerInstance | null>(null)
  const fitBoundsRef = useRef(false)
  const overlayModeRef = useRef<OverlayMode>(overlayMode)
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState<DrawMode>(null)

  const selectedNeighborhoodSet = useMemo(
    () => new Set(selectedNeighborhoods),
    [selectedNeighborhoods]
  )

  const selectedCityKeys = useMemo(
    () => new Set(selectedCities.map(cityKey)),
    [selectedCities]
  )

  const neighborhoodShapes = useMemo<NeighborhoodShape[]>(() => {
    return neighborhoods
      .map((neighborhood) => {
        const rings = parsePostGISPolygon(neighborhood.bounds)
        if (!rings || rings.length === 0) return null
        const centroid = polygonCentroid(rings[0] || [])
        return { neighborhood, rings, centroid }
      })
      .filter((value): value is NeighborhoodShape => Boolean(value))
  }, [neighborhoods])

  const cityShapes = useMemo<CityShape[]>(() => {
    const grouped = new Map<string, { city: CityOption; points: GeoPoint[] }>()

    neighborhoodShapes.forEach(({ neighborhood, rings }) => {
      const key = cityKey({
        city: neighborhood.city,
        state: neighborhood.state,
      })
      const existing = grouped.get(key) || {
        city: { city: neighborhood.city, state: neighborhood.state },
        points: [],
      }
      rings.forEach((ring) => {
        ring.forEach((point) => {
          existing.points.push(point)
        })
      })
      grouped.set(key, existing)
    })

    return Array.from(grouped.entries())
      .map(([key, entry]) => {
        const hull = convexHull(entry.points)
        if (hull.length < 3) return null
        return {
          city: entry.city,
          key,
          hull,
          centroid: polygonCentroid(hull),
        }
      })
      .filter((value): value is CityShape => Boolean(value))
  }, [neighborhoodShapes])

  const handleDrawSelection = useCallback(
    (ring: GeoPoint[]) => {
      if (!ring.length) return

      if (overlayModeRef.current === 'cities') {
        const matches = cityShapes.filter((city) => {
          if (!city.centroid) return false
          return isPointInPolygon(city.centroid, ring)
        })
        if (matches.length > 0) {
          onBulkSelectCities(matches.map((match) => match.city))
        }
        return
      }

      const matches = neighborhoodShapes.filter((shape) => {
        const centroid = shape.centroid
        if (!centroid) return false
        return isPointInPolygon(centroid, ring)
      })
      if (matches.length > 0) {
        onBulkSelectNeighborhoods(matches.map((match) => match.neighborhood))
      }
    },
    [
      cityShapes,
      neighborhoodShapes,
      onBulkSelectCities,
      onBulkSelectNeighborhoods,
    ]
  )

  useEffect(() => {
    overlayModeRef.current = overlayMode
  }, [overlayMode])

  useEffect(() => {
    fitBoundsRef.current = false
  }, [neighborhoods])

  useEffect(() => {
    if (!mapsReady) return
    if (!mapRef.current) return
    const googleMaps = window.google?.maps
    if (!googleMaps) return
    if (mapInstanceRef.current) return

    try {
      const mapId = getGoogleMapsMapId()
      const mapCtor = googleMaps.Map
      if (typeof mapCtor !== 'function') {
        throw new Error('Google Maps API not ready')
      }

      const map = new mapCtor(mapRef.current, {
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize map'
      setMapError(message)
    }
  }, [mapsReady])

  useEffect(() => {
    const map = mapInstanceRef.current
    const googleMaps = window.google?.maps
    if (!map || !googleMaps) return

    const drawing = googleMaps.drawing
    if (!drawing?.DrawingManager) return

    if (!drawingManagerRef.current) {
      const manager = new drawing.DrawingManager({
        drawingControl: false,
        polygonOptions: DRAW_POLYGON_STYLE,
        rectangleOptions: DRAW_RECTANGLE_STYLE,
      })

      manager.addListener('overlaycomplete', (event) => {
        const ring = extractDrawnRing(event)
        if (ring.length > 0) {
          handleDrawSelection(ring)
        }

        const overlayEvent = event as DrawingOverlayEvent
        overlayEvent.overlay?.setMap?.(null)

        manager.setDrawingMode(null)
        setDrawMode(null)
      })

      manager.setMap(map)
      drawingManagerRef.current = manager
    } else {
      drawingManagerRef.current.setMap(map)
    }
  }, [handleDrawSelection, mapsReady])

  useEffect(() => {
    const manager = drawingManagerRef.current
    const drawing = window.google?.maps?.drawing
    if (!manager || !drawing) return
    if (disabled) {
      manager.setDrawingMode(null)
      setDrawMode(null)
      return
    }

    const overlayType = drawing.OverlayType
    if (drawMode === 'polygon') {
      manager.setDrawingMode(overlayType?.POLYGON || 'polygon')
    } else if (drawMode === 'rectangle') {
      manager.setDrawingMode(overlayType?.RECTANGLE || 'rectangle')
    } else {
      manager.setDrawingMode(null)
    }
  }, [disabled, drawMode])

  useEffect(() => {
    const map = mapInstanceRef.current
    const googleMaps = window.google?.maps
    if (!map || !googleMaps) return

    const nextIds = new Set(
      neighborhoodShapes.map((shape) => shape.neighborhood.id)
    )

    for (const [id, polygon] of neighborhoodPolygonsRef.current) {
      if (!nextIds.has(id)) {
        polygon.setMap(null)
        neighborhoodPolygonsRef.current.delete(id)
      }
    }

    neighborhoodShapes.forEach((shape) => {
      const existing = neighborhoodPolygonsRef.current.get(
        shape.neighborhood.id
      )
      const selected = selectedNeighborhoodSet.has(shape.neighborhood.id)
      const options = {
        paths: shape.rings,
        clickable: !disabled,
        ...NEIGHBORHOOD_STYLE,
        ...(selected ? NEIGHBORHOOD_SELECTED_STYLE : {}),
      }

      if (existing) {
        existing.setOptions(options)
        existing.setMap(overlayMode === 'neighborhoods' ? map : null)
        return
      }

      const polygon = new googleMaps.Polygon(options)
      polygon.addListener('click', () => {
        if (disabled || overlayMode !== 'neighborhoods') return
        onToggleNeighborhood(shape.neighborhood)
      })
      polygon.setMap(overlayMode === 'neighborhoods' ? map : null)
      neighborhoodPolygonsRef.current.set(shape.neighborhood.id, polygon)
    })

    if (!fitBoundsRef.current && neighborhoodShapes.length > 0) {
      const bounds = new googleMaps.LatLngBounds()
      neighborhoodShapes.forEach((shape) => {
        shape.rings.forEach((ring) => {
          ring.forEach((point) => bounds.extend(point))
        })
      })
      map.fitBounds?.(bounds)
      fitBoundsRef.current = true
    }
  }, [
    disabled,
    neighborhoodShapes,
    onToggleNeighborhood,
    overlayMode,
    selectedNeighborhoodSet,
  ])

  useEffect(() => {
    const map = mapInstanceRef.current
    const googleMaps = window.google?.maps
    if (!map || !googleMaps) return

    const nextKeys = new Set(cityShapes.map((shape) => shape.key))

    for (const [key, polygon] of cityPolygonsRef.current) {
      if (!nextKeys.has(key)) {
        polygon.setMap(null)
        cityPolygonsRef.current.delete(key)
      }
    }

    cityShapes.forEach((shape) => {
      const existing = cityPolygonsRef.current.get(shape.key)
      const selected = selectedCityKeys.has(shape.key)
      const options = {
        paths: shape.hull,
        clickable: !disabled,
        ...CITY_STYLE,
        ...(selected ? CITY_SELECTED_STYLE : {}),
      }

      if (existing) {
        existing.setOptions(options)
        existing.setMap(overlayMode === 'cities' ? map : null)
        return
      }

      const polygon = new googleMaps.Polygon(options)
      polygon.addListener('click', () => {
        if (disabled || overlayMode !== 'cities') return
        onToggleCity(shape.city)
      })
      polygon.setMap(overlayMode === 'cities' ? map : null)
      cityPolygonsRef.current.set(shape.key, polygon)
    })
  }, [cityShapes, disabled, onToggleCity, overlayMode, selectedCityKeys])

  useEffect(() => {
    const neighborhoodPolygons = neighborhoodPolygonsRef.current
    const cityPolygons = cityPolygonsRef.current
    const drawingManager = drawingManagerRef.current

    return () => {
      neighborhoodPolygons.forEach((polygon) => polygon.setMap(null))
      cityPolygons.forEach((polygon) => polygon.setMap(null))
      neighborhoodPolygons.clear()
      cityPolygons.clear()
      drawingManager?.setMap(null)
    }
  }, [])

  useEffect(() => {
    if (!isTestMode) return
    const hooks = {
      selectNeighborhood: (id: string) => {
        const match = neighborhoods.find((item) => item.id === id)
        if (match) onToggleNeighborhood(match)
      },
      selectCity: (key: string) => {
        const match = cityShapes.find((item) => item.key === key)
        if (match) onToggleCity(match.city)
      },
      drawSelection: (ring: GeoPoint[]) => {
        handleDrawSelection(ring)
      },
    }
    ;(
      window as typeof window & { __homematchMapTestHooks?: typeof hooks }
    ).__homematchMapTestHooks = hooks

    return () => {
      delete (
        window as typeof window & { __homematchMapTestHooks?: typeof hooks }
      ).__homematchMapTestHooks
    }
  }, [
    cityShapes,
    handleDrawSelection,
    neighborhoods,
    onToggleCity,
    onToggleNeighborhood,
  ])

  const hasPolygonData = neighborhoodShapes.length > 0

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
        data-testid="location-map"
      >
        <div ref={mapRef} className="absolute inset-0" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={drawMode === 'polygon' ? 'secondary' : 'outline'}
            onClick={() =>
              setDrawMode(drawMode === 'polygon' ? null : 'polygon')
            }
            disabled={disabled}
            className="border-white/10 bg-slate-900/70 text-xs text-white/80 hover:bg-slate-900/90"
            data-testid="map-draw-polygon"
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Draw area
          </Button>
          <Button
            type="button"
            size="sm"
            variant={drawMode === 'rectangle' ? 'secondary' : 'outline'}
            onClick={() =>
              setDrawMode(drawMode === 'rectangle' ? null : 'rectangle')
            }
            disabled={disabled}
            className="border-white/10 bg-slate-900/70 text-xs text-white/80 hover:bg-slate-900/90"
            data-testid="map-draw-rectangle"
          >
            <Square className="mr-1 h-3.5 w-3.5" />
            Draw box
          </Button>
          {drawMode && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDrawMode(null)}
              disabled={disabled}
              className="text-xs text-white/70 hover:text-white"
              data-testid="map-draw-cancel"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>

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

        {!loading && !mapError && !hasPolygonData && (
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

        <div className="pointer-events-none absolute right-3 bottom-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
          {overlayMode === 'cities'
            ? 'Click city overlays to toggle selection.'
            : 'Click neighborhoods to toggle selection.'}
        </div>
      </div>
    </SecureMapLoader>
  )
}

function cityKey(city: CityOption) {
  return `${city.city.toLowerCase()}|${city.state.toLowerCase()}`
}

type LatLngLike = {
  lat: number | (() => number)
  lng: number | (() => number)
}

type BoundsLike = {
  getNorthEast?: () => LatLngLike
  getSouthWest?: () => LatLngLike
}

type PathLike = {
  getArray?: () => LatLngLike[]
}

type DrawingOverlayEvent = {
  type?: string
  overlay?: {
    getBounds?: () => BoundsLike
    getPath?: () => PathLike | LatLngLike[]
    setMap?: (map: GoogleMapInstance | null) => void
  }
}

const isLatLngLike = (value: unknown): value is LatLngLike => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { lat?: unknown; lng?: unknown }
  const latOk =
    typeof candidate.lat === 'number' || typeof candidate.lat === 'function'
  const lngOk =
    typeof candidate.lng === 'number' || typeof candidate.lng === 'function'
  return latOk && lngOk
}

function extractDrawnRing(event: unknown): GeoPoint[] {
  if (!event || typeof event !== 'object') return []
  const overlayEvent = event as DrawingOverlayEvent

  if (overlayEvent.type === 'rectangle' || overlayEvent.type === 'RECTANGLE') {
    const bounds = overlayEvent.overlay?.getBounds?.()
    const northEast = bounds?.getNorthEast?.()
    const southWest = bounds?.getSouthWest?.()
    if (!northEast || !southWest) return []
    const north =
      typeof northEast.lat === 'function' ? northEast.lat() : northEast.lat
    const east =
      typeof northEast.lng === 'function' ? northEast.lng() : northEast.lng
    const south =
      typeof southWest.lat === 'function' ? southWest.lat() : southWest.lat
    const west =
      typeof southWest.lng === 'function' ? southWest.lng() : southWest.lng

    if ([north, east, south, west].some((value) => value === undefined)) {
      return []
    }

    return [
      { lat: north, lng: west },
      { lat: north, lng: east },
      { lat: south, lng: east },
      { lat: south, lng: west },
    ]
  }

  const path = overlayEvent.overlay?.getPath?.()
  const points = Array.isArray(path) ? path : path?.getArray?.() || []

  if (!Array.isArray(points)) return []

  return points
    .map((point) => {
      if (!isLatLngLike(point)) return null
      const lat = typeof point.lat === 'function' ? point.lat() : point.lat
      const lng = typeof point.lng === 'function' ? point.lng() : point.lng
      if (typeof lat !== 'number' || typeof lng !== 'number') return null
      return { lat, lng }
    })
    .filter((point: GeoPoint | null): point is GeoPoint => Boolean(point))
}
