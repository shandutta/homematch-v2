import polygonClipping from 'polygon-clipping'
import {
  parsePostGISPolygon,
  type LatLng,
  type PolygonRings,
} from '@/lib/utils/coordinates'

export type MapNeighborhoodInput = {
  id: string
  name: string
  city: string
  state: string
  bounds: unknown
}

export type MapNeighborhoodOutput = {
  id: string
  name: string
  city: string
  state: string
  bounds: {
    type: 'MultiPolygon'
    coordinates: number[][][][]
  }
}

type ClippingPoint = [number, number]
type ClippingRing = ClippingPoint[]
type ClippingPolygon = ClippingRing[]
type ClippingMultiPolygon = ClippingPolygon[]

const MAX_RING_POINTS = 900
const BASE_TOLERANCE = 0.0001
const MAX_TOLERANCE = 0.01

export function buildMeceNeighborhoods(rows: MapNeighborhoodInput[]) {
  const candidates = rows
    .map((row) => {
      const polygons = normalizePolygons(parsePostGISPolygon(row.bounds))
      if (polygons.length === 0) return null
      const simplified = simplifyPolygons(polygons)
      if (simplified.length === 0) return null
      return {
        row,
        polygons: simplified,
        area: polygonGroupArea(simplified),
      }
    })
    .filter(
      (
        value
      ): value is {
        row: MapNeighborhoodInput
        polygons: PolygonRings[]
        area: number
      } => Boolean(value)
    )

  const sorted = candidates.sort((a, b) => {
    if (a.area !== b.area) return a.area - b.area
    return a.row.name.localeCompare(b.row.name)
  })

  let occupied: ClippingMultiPolygon = []
  let overlapRemoved = 0
  const items: MapNeighborhoodOutput[] = sorted
    .map((entry) => {
      let polygons = entry.polygons
      if (occupied.length > 0) {
        const exclusive = subtractPolygonGroups(polygons, occupied)
        if (exclusive.length > 0) {
          polygons = exclusive
        } else {
          overlapRemoved += 1
          return null
        }
      }

      const clipping = toClippingMultiPolygon(polygons)
      occupied = unionMultiPolygons(occupied, clipping)

      return {
        id: entry.row.id,
        name: entry.row.name,
        city: entry.row.city,
        state: entry.row.state,
        bounds: toGeoJsonMultiPolygon(polygons),
      }
    })
    .filter((item): item is MapNeighborhoodOutput => Boolean(item))

  return {
    items,
    debug: {
      total: rows.length,
      parsed: candidates.length,
      overlapRemoved,
    },
  }
}

export function simplifyPolygons(polygons: PolygonRings[]): PolygonRings[] {
  return polygons
    .map((rings) =>
      rings
        .map((ring) => simplifyRingAdaptive(ring))
        .filter((ring) => ring.length >= 4)
    )
    .filter((rings) => rings.length > 0)
}

export function simplifyRingAdaptive(ring: LatLng[]): LatLng[] {
  if (ring.length <= MAX_RING_POINTS) return ring
  let tolerance = BASE_TOLERANCE
  let simplified = simplifyRing(ring, tolerance)

  while (simplified.length > MAX_RING_POINTS && tolerance < MAX_TOLERANCE) {
    tolerance *= 1.5
    simplified = simplifyRing(ring, tolerance)
  }

  return simplified.length >= 4 ? simplified : ring
}

export function simplifyRing(ring: LatLng[], tolerance: number): LatLng[] {
  if (ring.length < 4) return ring
  const closed =
    ring[0]?.lat === ring[ring.length - 1]?.lat &&
    ring[0]?.lng === ring[ring.length - 1]?.lng
  const points = closed ? ring.slice(0, -1) : ring.slice()
  const simplified = rdp(points, tolerance)
  if (simplified.length < 3) return ring
  const result = closed ? [...simplified, { ...simplified[0]! }] : simplified
  return result
}

export function rdp(points: LatLng[], tolerance: number): LatLng[] {
  if (points.length < 3) return points

  const first = points[0]!
  const last = points[points.length - 1]!
  let maxDistance = 0
  let index = 0

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i]!, first, last)
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }

  if (maxDistance > tolerance) {
    const left = rdp(points.slice(0, index + 1), tolerance)
    const right = rdp(points.slice(index), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [first, last]
}

export function perpendicularDistance(
  point: LatLng,
  start: LatLng,
  end: LatLng
) {
  const dx = end.lng - start.lng
  const dy = end.lat - start.lat
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.lng - start.lng, point.lat - start.lat)
  }
  const t =
    ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) /
    (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  const projLng = start.lng + clamped * dx
  const projLat = start.lat + clamped * dy
  return Math.hypot(point.lng - projLng, point.lat - projLat)
}

export function normalizePolygons(
  polygons: PolygonRings[] | null
): PolygonRings[] {
  if (!polygons) return []
  return polygons
    .map((rings) => rings.filter((ring) => ring.length >= 4))
    .filter((rings) => rings.length > 0)
}

export function toClippingRing(ring: LatLng[]): ClippingRing {
  return ring.map((point) => [point.lng, point.lat])
}

export function toClippingPolygon(rings: PolygonRings): ClippingPolygon {
  return rings.map((ring) => toClippingRing(ring))
}

export function toClippingMultiPolygon(
  polygons: PolygonRings[]
): ClippingMultiPolygon {
  return polygons.map((rings) => toClippingPolygon(rings))
}

export function fromClippingMultiPolygon(
  polygons: ClippingMultiPolygon
): PolygonRings[] {
  return polygons
    .map((polygon) =>
      polygon
        .map((ring) => closeRing(ring.map(([lng, lat]) => ({ lat, lng }))))
        .filter((ring): ring is LatLng[] => Boolean(ring))
    )
    .filter((rings) => rings.length > 0)
}

export function closeRing(ring: LatLng[]): LatLng[] | null {
  if (ring.length < 3) return null
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (!first || !last) return null
  if (first.lat !== last.lat || first.lng !== last.lng) {
    ring.push({ ...first })
  }
  return ring
}

export function subtractPolygonGroups(
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

export function unionMultiPolygons(
  first: ClippingMultiPolygon,
  second: ClippingMultiPolygon
): ClippingMultiPolygon {
  if (first.length === 0) return second
  if (second.length === 0) return first
  return polygonClipping.union(first, second)
}

export function polygonGroupArea(polygons: PolygonRings[]): number {
  return polygons.reduce((total, rings) => {
    const ringsArea = rings.reduce((sum, ring) => sum + ringArea(ring), 0)
    return total + Math.abs(ringsArea)
  }, 0)
}

export function ringArea(ring: LatLng[]): number {
  if (ring.length < 3) return 0
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i]!
    const next = ring[i + 1]!
    area += current.lng * next.lat - next.lng * current.lat
  }
  return area / 2
}

export function toGeoJsonMultiPolygon(
  polygons: PolygonRings[]
): MapNeighborhoodOutput['bounds'] {
  return {
    type: 'MultiPolygon',
    coordinates: polygons.map((rings) =>
      rings.map((ring) => ring.map((point) => [point.lng, point.lat]))
    ),
  }
}
