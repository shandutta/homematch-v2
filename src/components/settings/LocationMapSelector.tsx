'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import polygonClipping from 'polygon-clipping'
import { Button } from '@/components/ui/button'
import { SecureMapLoader } from '@/components/shared/SecureMapLoader'
import {
  parsePostGISPolygon,
  type LatLng,
  type PolygonRings,
} from '@/lib/utils/coordinates'
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

type PolygonBounds = {
  north: number
  south: number
  east: number
  west: number
}

type ClippingPoint = [number, number]
type ClippingRing = ClippingPoint[]
type ClippingPolygon = ClippingRing[]
type ClippingMultiPolygon = ClippingPolygon[]

type NeighborhoodShape = {
  neighborhood: NeighborhoodOption
  polygons: PolygonRings[]
  bounds: PolygonBounds
  clipping: ClippingMultiPolygon
}

type CityShape = {
  city: CityOption
  key: string
  polygons: PolygonRings[]
  bounds: PolygonBounds
  clipping: ClippingMultiPolygon
}

type NeighborhoodDebugInfo = {
  totalNeighborhoods: number
  parsedNeighborhoods: number
  skippedNeighborhoods: number
  overlapRemovedNeighborhoods: number
  rawNeighborhoodArea: number
  neighborhoodUnionArea: number
  neighborhoodOverlapArea: number
}

type CityDebugInfo = {
  totalCities: number
  rawCityArea: number
  cityUnionArea: number
  cityOverlapArea: number
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
const isMapDebug = process.env.NEXT_PUBLIC_MAP_DEBUG === 'true'

const logMapDebug = (
  message: string,
  payload?: Record<string, unknown> | null
) => {
  if (!isMapDebug) return
  if (payload) {
    console.log('[LocationMapSelector]', message, payload)
  } else {
    console.log('[LocationMapSelector]', message)
  }
}

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
  const neighborhoodPolygonsRef = useRef<Map<string, GooglePolygonInstance[]>>(
    new Map()
  )
  const cityPolygonsRef = useRef<Map<string, GooglePolygonInstance[]>>(
    new Map()
  )
  const drawingManagerRef = useRef<GoogleDrawingManagerInstance | null>(null)
  const fitBoundsRef = useRef(false)
  const overlayModeRef = useRef<OverlayMode>(overlayMode)
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState<DrawMode>(null)
  const updateDebugState = useCallback((next: Record<string, unknown>) => {
    if (!isMapDebug) return
    const typedWindow = window as typeof window & {
      __hmMapDebug?: Record<string, unknown>
    }
    typedWindow.__hmMapDebug = { ...(typedWindow.__hmMapDebug || {}), ...next }
  }, [])

  const selectedNeighborhoodSet = useMemo(
    () => new Set(selectedNeighborhoods),
    [selectedNeighborhoods]
  )

  const selectedCityKeys = useMemo(
    () => new Set(selectedCities.map(cityKey)),
    [selectedCities]
  )

  const neighborhoodAnalysis = useMemo<{
    shapes: NeighborhoodShape[]
    debug: NeighborhoodDebugInfo
    unionClipping: ClippingMultiPolygon
  }>(() => {
    const candidates = neighborhoods
      .map((neighborhood) => {
        const polygons = normalizePolygons(
          parsePostGISPolygon(neighborhood.bounds)
        )
        if (polygons.length === 0) return null
        const bounds = buildBoundsForPolygons(polygons)
        if (!bounds) return null
        return {
          neighborhood,
          polygons,
          bounds,
          area: polygonGroupArea(polygons),
          clipping: toClippingMultiPolygon(polygons),
        }
      })
      .filter((value): value is NeighborhoodShape & { area: number } =>
        Boolean(value)
      )

    const rawNeighborhoodArea = candidates.reduce(
      (total, shape) => total + shape.area,
      0
    )
    const neighborhoodUnionClipping =
      candidates.length > 0
        ? polygonClipping.union(...candidates.map((shape) => shape.clipping))
        : []
    const neighborhoodUnionArea = clippingMultiPolygonArea(
      neighborhoodUnionClipping
    )
    const neighborhoodOverlapArea = Math.max(
      0,
      rawNeighborhoodArea - neighborhoodUnionArea
    )

    const sorted = candidates.sort((a, b) => {
      if (a.area !== b.area) return a.area - b.area
      return a.neighborhood.name.localeCompare(b.neighborhood.name)
    })

    let occupied: ClippingMultiPolygon = []
    let overlapRemoved = 0

    const shapes = sorted
      .map((shape) => {
        let polygons = shape.polygons
        if (occupied.length > 0) {
          const exclusive = subtractPolygonGroups(polygons, occupied)
          if (exclusive.length > 0) {
            polygons = exclusive
          } else {
            overlapRemoved += 1
            return null
          }
        }

        const bounds = buildBoundsForPolygons(polygons)
        if (!bounds) return null

        const clipping = toClippingMultiPolygon(polygons)
        occupied = unionMultiPolygons(occupied, clipping)

        return {
          neighborhood: shape.neighborhood,
          polygons,
          bounds,
          clipping,
        }
      })
      .filter((value): value is NeighborhoodShape => Boolean(value))

    return {
      shapes,
      debug: {
        totalNeighborhoods: neighborhoods.length,
        parsedNeighborhoods: candidates.length,
        skippedNeighborhoods: neighborhoods.length - candidates.length,
        overlapRemovedNeighborhoods: overlapRemoved,
        rawNeighborhoodArea,
        neighborhoodUnionArea,
        neighborhoodOverlapArea,
      },
      unionClipping: neighborhoodUnionClipping,
    }
  }, [neighborhoods])

  const neighborhoodShapes = neighborhoodAnalysis.shapes

  const cityAnalysis = useMemo<{
    shapes: CityShape[]
    debug: CityDebugInfo
    unionClipping: ClippingMultiPolygon
  }>(() => {
    const grouped = new Map<
      string,
      { city: CityOption; polygons: PolygonRings[] }
    >()

    neighborhoodShapes.forEach(({ neighborhood, polygons }) => {
      const key = cityKey({
        city: neighborhood.city,
        state: neighborhood.state,
      })
      const existing = grouped.get(key) || {
        city: { city: neighborhood.city, state: neighborhood.state },
        polygons: [],
      }
      existing.polygons.push(...polygons)
      grouped.set(key, existing)
    })

    const sorted = Array.from(grouped.entries())
      .map(([key, entry]) => {
        if (entry.polygons.length === 0) return null

        let unioned = entry.polygons
        try {
          unioned = unionPolygonGroups(entry.polygons)
        } catch (error) {
          console.warn('[LocationMapSelector] Failed to union city polygons', {
            key,
            error,
          })
        }

        return {
          key,
          city: entry.city,
          unioned,
          area: polygonGroupArea(unioned),
        }
      })
      .filter(
        (
          value
        ): value is {
          key: string
          city: CityOption
          unioned: PolygonRings[]
          area: number
        } => Boolean(value)
      )
      .sort((a, b) => {
        if (a.area !== b.area) return a.area - b.area
        return a.key.localeCompare(b.key)
      })

    const rawCityArea = sorted.reduce((total, entry) => total + entry.area, 0)
    const cityUnionClipping =
      sorted.length > 0
        ? polygonClipping.union(
            ...sorted.map((entry) => toClippingMultiPolygon(entry.unioned))
          )
        : []
    const cityUnionArea = clippingMultiPolygonArea(cityUnionClipping)
    const cityOverlapArea = Math.max(0, rawCityArea - cityUnionArea)

    let occupied: ClippingMultiPolygon = []

    const shapes = sorted
      .map((entry) => {
        let polygons = entry.unioned
        if (occupied.length > 0) {
          const exclusive = subtractPolygonGroups(entry.unioned, occupied)
          if (exclusive.length > 0) {
            polygons = exclusive
          } else {
            return null
          }
        }

        const bounds = buildBoundsForPolygons(polygons)
        if (!bounds) return null

        const clipping = toClippingMultiPolygon(polygons)
        occupied = unionMultiPolygons(occupied, clipping)

        return {
          city: entry.city,
          key: entry.key,
          polygons,
          bounds,
          clipping,
        }
      })
      .filter((value): value is CityShape => Boolean(value))
    return {
      shapes,
      debug: {
        totalCities: sorted.length,
        rawCityArea,
        cityUnionArea,
        cityOverlapArea,
      },
      unionClipping: cityUnionClipping,
    }
  }, [neighborhoodShapes])

  const cityShapes = cityAnalysis.shapes

  useEffect(() => {
    updateDebugState({
      neighborhoodShapeCount: neighborhoodShapes.length,
      cityShapeCount: cityShapes.length,
      mapsReady,
      mapError,
      overlayMode,
      neighborhoodDebug: neighborhoodAnalysis.debug,
      cityDebug: cityAnalysis.debug,
      areaConsistency: {
        neighborhoodUnionArea: neighborhoodAnalysis.debug.neighborhoodUnionArea,
        cityUnionArea: cityAnalysis.debug.cityUnionArea,
        delta:
          neighborhoodAnalysis.debug.neighborhoodUnionArea -
          cityAnalysis.debug.cityUnionArea,
      },
    })
  }, [
    cityShapes.length,
    cityAnalysis.debug,
    mapError,
    mapsReady,
    neighborhoodShapes.length,
    neighborhoodAnalysis.debug,
    overlayMode,
    updateDebugState,
  ])

  const handleDrawSelection = useCallback(
    (ring: LatLng[]) => {
      const selectionRing = closeSelectionRing(ring)
      if (!selectionRing) return
      const selectionBounds = buildBoundsForRing(selectionRing)
      const selectionPolygon: PolygonRings = [selectionRing]
      const selectionPolygonClipping = toClippingMultiPolygon([
        selectionPolygon,
      ])

      const matchesShape = (shape: {
        bounds: PolygonBounds
        clipping: ClippingMultiPolygon
      }) => {
        if (!boundsOverlap(selectionBounds, shape.bounds)) return false
        return polygonsIntersect(selectionPolygonClipping, shape.clipping)
      }

      if (overlayModeRef.current === 'cities') {
        const matches = cityShapes.filter(matchesShape)
        if (matches.length > 0) {
          onBulkSelectCities(matches.map((match) => match.city))
        }
        return
      }

      const matches = neighborhoodShapes.filter(matchesShape)
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

      if (isMapDebug) {
        const rect = mapRef.current.getBoundingClientRect()
        const mapDiv = map.getDiv?.()
        const debugPayload = {
          mapId,
          rect,
          mapTypeId: map.getMapTypeId?.(),
          googleMapsVersion: window.google?.maps?.version,
          mapDivChildCount: mapDiv?.childElementCount ?? 0,
          mapDivCanvasCount: mapDiv
            ? mapDiv.querySelectorAll('canvas').length
            : 0,
        }
        logMapDebug('map created', debugPayload)
        updateDebugState({
          mapCreatedAt: new Date().toISOString(),
          ...debugPayload,
        })

        map.addListener('tilesloaded', () => {
          updateDebugState({ tilesLoadedAt: new Date().toISOString() })
          logMapDebug('tilesloaded')
        })
        map.addListener('idle', () => {
          updateDebugState({ idleAt: new Date().toISOString() })
          logMapDebug('idle')
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize map'
      setMapError(message)
      logMapDebug('map init error', {
        message,
        error: error instanceof Error ? error.stack : String(error),
      })
    }
  }, [mapsReady, updateDebugState])

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

    for (const [id, polygons] of neighborhoodPolygonsRef.current) {
      if (!nextIds.has(id)) {
        polygons.forEach((polygon) => polygon.setMap(null))
        neighborhoodPolygonsRef.current.delete(id)
      }
    }

    neighborhoodShapes.forEach((shape) => {
      const existing = neighborhoodPolygonsRef.current.get(
        shape.neighborhood.id
      )
      const selected = selectedNeighborhoodSet.has(shape.neighborhood.id)
      const options = {
        clickable: !disabled,
        ...NEIGHBORHOOD_STYLE,
        ...(selected ? NEIGHBORHOOD_SELECTED_STYLE : {}),
      }

      const nextPolygons: GooglePolygonInstance[] = []
      shape.polygons.forEach((polygonRings, index) => {
        const polygonOptions = {
          ...options,
          paths: polygonRings,
        }
        const existingPolygon = existing?.[index]
        if (existingPolygon) {
          existingPolygon.setOptions(polygonOptions)
          existingPolygon.setMap(overlayMode === 'neighborhoods' ? map : null)
          nextPolygons.push(existingPolygon)
          return
        }

        const polygon = new googleMaps.Polygon(polygonOptions)
        polygon.addListener('click', () => {
          if (disabled || overlayMode !== 'neighborhoods') return
          onToggleNeighborhood(shape.neighborhood)
        })
        polygon.setMap(overlayMode === 'neighborhoods' ? map : null)
        nextPolygons.push(polygon)
      })

      if (existing && existing.length > nextPolygons.length) {
        existing
          .slice(nextPolygons.length)
          .forEach((polygon) => polygon.setMap(null))
      }

      neighborhoodPolygonsRef.current.set(shape.neighborhood.id, nextPolygons)
    })

    if (!fitBoundsRef.current && neighborhoodShapes.length > 0) {
      const bounds = new googleMaps.LatLngBounds()
      neighborhoodShapes.forEach((shape) => {
        const { north, south, east, west } = shape.bounds
        bounds.extend({ lat: north, lng: east })
        bounds.extend({ lat: south, lng: west })
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

    for (const [key, polygons] of cityPolygonsRef.current) {
      if (!nextKeys.has(key)) {
        polygons.forEach((polygon) => polygon.setMap(null))
        cityPolygonsRef.current.delete(key)
      }
    }

    cityShapes.forEach((shape) => {
      const existing = cityPolygonsRef.current.get(shape.key)
      const selected = selectedCityKeys.has(shape.key)
      const options = {
        clickable: !disabled,
        ...CITY_STYLE,
        ...(selected ? CITY_SELECTED_STYLE : {}),
      }

      const nextPolygons: GooglePolygonInstance[] = []
      shape.polygons.forEach((polygonRings, index) => {
        const polygonOptions = {
          ...options,
          paths: polygonRings,
        }
        const existingPolygon = existing?.[index]
        if (existingPolygon) {
          existingPolygon.setOptions(polygonOptions)
          existingPolygon.setMap(overlayMode === 'cities' ? map : null)
          nextPolygons.push(existingPolygon)
          return
        }

        const polygon = new googleMaps.Polygon(polygonOptions)
        polygon.addListener('click', () => {
          if (disabled || overlayMode !== 'cities') return
          onToggleCity(shape.city)
        })
        polygon.setMap(overlayMode === 'cities' ? map : null)
        nextPolygons.push(polygon)
      })

      if (existing && existing.length > nextPolygons.length) {
        existing
          .slice(nextPolygons.length)
          .forEach((polygon) => polygon.setMap(null))
      }

      cityPolygonsRef.current.set(shape.key, nextPolygons)
    })
  }, [cityShapes, disabled, onToggleCity, overlayMode, selectedCityKeys])

  useEffect(() => {
    const neighborhoodPolygons = neighborhoodPolygonsRef.current
    const cityPolygons = cityPolygonsRef.current
    const drawingManager = drawingManagerRef.current

    return () => {
      neighborhoodPolygons.forEach((polygons) =>
        polygons.forEach((polygon) => polygon.setMap(null))
      )
      cityPolygons.forEach((polygons) =>
        polygons.forEach((polygon) => polygon.setMap(null))
      )
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
      drawSelection: (ring: LatLng[]) => {
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

function extractDrawnRing(event: unknown): LatLng[] {
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
    .filter((point: LatLng | null): point is LatLng => Boolean(point))
}

function normalizePolygons(polygons: PolygonRings[] | null): PolygonRings[] {
  if (!polygons) return []
  return polygons
    .map((rings) => rings.filter((ring) => ring.length >= 4))
    .filter((rings) => rings.length > 0)
}

function closeSelectionRing(ring: LatLng[]): LatLng[] | null {
  if (ring.length < 3) return null
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (!first || !last) return null
  if (first.lat === last.lat && first.lng === last.lng) {
    return ring
  }
  return [...ring, { ...first }]
}

function buildBoundsForRing(ring: LatLng[]): PolygonBounds {
  let north = -Infinity
  let south = Infinity
  let east = -Infinity
  let west = Infinity

  ring.forEach((point) => {
    north = Math.max(north, point.lat)
    south = Math.min(south, point.lat)
    east = Math.max(east, point.lng)
    west = Math.min(west, point.lng)
  })

  return { north, south, east, west }
}

function buildBoundsForPolygons(
  polygons: PolygonRings[]
): PolygonBounds | null {
  if (polygons.length === 0) return null
  let north = -Infinity
  let south = Infinity
  let east = -Infinity
  let west = Infinity

  polygons.forEach((rings) => {
    rings.forEach((ring) => {
      ring.forEach((point) => {
        north = Math.max(north, point.lat)
        south = Math.min(south, point.lat)
        east = Math.max(east, point.lng)
        west = Math.min(west, point.lng)
      })
    })
  })

  if (!Number.isFinite(north)) return null
  return { north, south, east, west }
}

function boundsOverlap(a: PolygonBounds, b: PolygonBounds) {
  return !(
    a.west > b.east ||
    a.east < b.west ||
    a.south > b.north ||
    a.north < b.south
  )
}

function toClippingRing(ring: LatLng[]): ClippingRing {
  return ring.map((point) => [point.lng, point.lat])
}

function toClippingPolygon(rings: PolygonRings): ClippingPolygon {
  return rings.map((ring) => toClippingRing(ring))
}

function toClippingMultiPolygon(
  polygons: PolygonRings[]
): ClippingMultiPolygon {
  return polygons.map((rings) => toClippingPolygon(rings))
}

function fromClippingMultiPolygon(
  polygons: ClippingMultiPolygon
): PolygonRings[] {
  return polygons
    .map((polygon) =>
      polygon
        .map((ring) =>
          closeSelectionRing(ring.map(([lng, lat]) => ({ lat, lng })))
        )
        .filter((ring): ring is LatLng[] => Boolean(ring))
    )
    .filter((rings) => rings.length > 0)
}

function unionPolygonGroups(polygons: PolygonRings[]): PolygonRings[] {
  if (polygons.length <= 1) return polygons
  const unioned = polygonClipping.union(
    ...polygons.map((polygon) => [toClippingPolygon(polygon)])
  )
  return normalizePolygons(fromClippingMultiPolygon(unioned))
}

function subtractPolygonGroups(
  polygons: PolygonRings[],
  clip: ClippingMultiPolygon
): PolygonRings[] {
  if (clip.length === 0) return polygons
  const diff = polygonClipping.difference(
    toClippingMultiPolygon(polygons),
    clip
  )
  return normalizePolygons(fromClippingMultiPolygon(diff))
}

function unionMultiPolygons(
  first: ClippingMultiPolygon,
  second: ClippingMultiPolygon
): ClippingMultiPolygon {
  if (first.length === 0) return second
  if (second.length === 0) return first
  return polygonClipping.union(first, second)
}

function polygonsIntersect(
  first: ClippingMultiPolygon,
  second: ClippingMultiPolygon
) {
  if (first.length === 0 || second.length === 0) return false
  try {
    const overlap = polygonClipping.intersection(first, second)
    return overlap.some((polygon) => polygon.some((ring) => ring.length >= 3))
  } catch (error) {
    console.warn('[LocationMapSelector] Failed to intersect polygons', error)
    return false
  }
}

function ringArea(ring: LatLng[]): number {
  if (ring.length < 3) return 0
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i]
    const next = ring[i + 1]
    area += current.lng * next.lat - next.lng * current.lat
  }
  return area / 2
}

function polygonGroupArea(polygons: PolygonRings[]): number {
  return polygons.reduce((total, rings) => {
    const ringsArea = rings.reduce((sum, ring) => sum + ringArea(ring), 0)
    return total + Math.abs(ringsArea)
  }, 0)
}

function clippingRingArea(ring: ClippingRing): number {
  if (ring.length < 3) return 0
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i]
    const next = ring[i + 1]
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

function clippingPolygonArea(polygon: ClippingPolygon): number {
  if (polygon.length === 0) return 0
  const outer = Math.abs(clippingRingArea(polygon[0]))
  const holes = polygon
    .slice(1)
    .reduce((sum, ring) => sum + Math.abs(clippingRingArea(ring)), 0)
  return Math.max(0, outer - holes)
}

function clippingMultiPolygonArea(polygons: ClippingMultiPolygon): number {
  return polygons.reduce(
    (total, polygon) => total + clippingPolygonArea(polygon),
    0
  )
}
