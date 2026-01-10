import polygonClipping from 'polygon-clipping'
import {
  buildMeceNeighborhoods,
  simplifyRingAdaptive,
  type MapNeighborhoodInput,
} from '@/lib/maps/geometry'

type Point = [number, number]
type RingCoordinates = Point[]
type PolygonCoordinates = RingCoordinates[]
type MultiPolygonCoordinates = PolygonCoordinates[]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isCoordinatePair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  isNumber(value[0]) &&
  isNumber(value[1])

const isRing = (value: unknown): value is RingCoordinates =>
  Array.isArray(value) && value.every(isCoordinatePair)

const isPolygonCoordinates = (value: unknown): value is PolygonCoordinates =>
  Array.isArray(value) && value.every(isRing)

const isMultiPolygonCoordinates = (
  value: unknown
): value is MultiPolygonCoordinates =>
  Array.isArray(value) && value.every(isPolygonCoordinates)

const isPolygonBounds = (
  value: unknown
): value is { type: 'Polygon'; coordinates: PolygonCoordinates } =>
  isRecord(value) &&
  value.type === 'Polygon' &&
  isPolygonCoordinates(value.coordinates)

const isMultiPolygonBounds = (
  value: unknown
): value is { type: 'MultiPolygon'; coordinates: MultiPolygonCoordinates } =>
  isRecord(value) &&
  value.type === 'MultiPolygon' &&
  isMultiPolygonCoordinates(value.coordinates)

const toSquarePolygon = (
  west: number,
  south: number,
  east: number,
  north: number
) => ({
  type: 'Polygon',
  coordinates: [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ],
})

const toClippingMultiPolygon = (bounds: unknown) => {
  if (isMultiPolygonBounds(bounds)) return bounds.coordinates
  if (isPolygonBounds(bounds)) return [bounds.coordinates]
  return []
}

const clippingRingArea = (ring: RingCoordinates) => {
  if (ring.length < 3) return 0
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i]!
    const next = ring[i + 1]!
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

const clippingPolygonArea = (polygon: PolygonCoordinates) => {
  if (polygon.length === 0) return 0
  const outer = Math.abs(clippingRingArea(polygon[0]!))
  const holes = polygon
    .slice(1)
    .reduce((sum, ring) => sum + Math.abs(clippingRingArea(ring)), 0)
  return Math.max(0, outer - holes)
}

const clippingMultiPolygonArea = (multi: number[][][][]) => {
  return multi.reduce(
    (total, polygon) => total + clippingPolygonArea(polygon),
    0
  )
}

const buildDenseRing = (pointsPerEdge: number) => {
  const ring: { lat: number; lng: number }[] = []
  for (let i = 0; i <= pointsPerEdge; i += 1) {
    ring.push({ lat: 0, lng: i / pointsPerEdge })
  }
  for (let i = 1; i <= pointsPerEdge; i += 1) {
    ring.push({ lat: i / pointsPerEdge, lng: 1 })
  }
  for (let i = pointsPerEdge - 1; i >= 0; i -= 1) {
    ring.push({ lat: 1, lng: i / pointsPerEdge })
  }
  for (let i = pointsPerEdge - 1; i > 0; i -= 1) {
    ring.push({ lat: i / pointsPerEdge, lng: 0 })
  }
  ring.push({ ...ring[0]! })
  return ring
}

test('simplifyRingAdaptive reduces dense rings while staying closed', () => {
  const ring = buildDenseRing(300)
  const simplified = simplifyRingAdaptive(ring)

  expect(simplified.length).toBeLessThan(ring.length)
  expect(simplified[0]).toEqual(simplified[simplified.length - 1])
})

test('buildMeceNeighborhoods removes overlap between neighborhoods', () => {
  const rows: MapNeighborhoodInput[] = [
    {
      id: 'n1',
      name: 'Alpha',
      city: 'Testopolis',
      state: 'TS',
      bounds: toSquarePolygon(0, 0, 1, 1),
    },
    {
      id: 'n2',
      name: 'Beta',
      city: 'Testopolis',
      state: 'TS',
      bounds: toSquarePolygon(0.5, 0.5, 1.5, 1.5),
    },
  ]

  const result = buildMeceNeighborhoods(rows)
  expect(result.items).toHaveLength(2)

  const [first, second] = result.items
  const firstClip = toClippingMultiPolygon(first!.bounds)
  const secondClip = toClippingMultiPolygon(second!.bounds)

  const overlap = polygonClipping.intersection(firstClip, secondClip)
  if (!isMultiPolygonCoordinates(overlap)) {
    throw new Error('Expected overlap to be a multipolygon')
  }
  const overlapArea = clippingMultiPolygonArea(overlap)

  expect(overlapArea).toBe(0)
})
