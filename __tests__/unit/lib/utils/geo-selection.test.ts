// Phase 0/1 closure: P0-maps-auth-hardening
import {
// Phase 0/1 closure: P0-maps-auth-hardening

  convexHull,
  isPointInPolygon,
  polygonCentroid,
  type GeoPoint,
} from '@/lib/utils/geo-selection'

const sortPoints = (points: GeoPoint[]) =>
  [...points].sort((a, b) => (a.lng !== b.lng ? a.lng - b.lng : a.lat - b.lat))

describe('geo-selection utilities', () => {
  describe('convexHull', () => {
    it('returns the same single point', () => {
      const points: GeoPoint[] = [{ lat: 1, lng: 1 }]
      expect(convexHull(points)).toEqual(points)
    })

    it('returns both points for a 2-point input', () => {
      const points: GeoPoint[] = [
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ]
      expect(convexHull(points)).toHaveLength(2)
    })

    it('deduplicates identical points before building hull', () => {
      const points: GeoPoint[] = [
        { lat: 1, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ]
      const hull = convexHull(points)
      expect(hull).toHaveLength(2)
    })

    it('builds the hull for a square (4 corners)', () => {
      const square: GeoPoint[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ]
      const hull = convexHull(square)
      expect(hull).toHaveLength(4)
      expect(sortPoints(hull)).toEqual(sortPoints(square))
    })

    it('drops interior points from the hull', () => {
      const points: GeoPoint[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
        { lat: 5, lng: 5 }, // interior — should be dropped
      ]
      const hull = convexHull(points)
      expect(hull).toHaveLength(4)
      const interior = { lat: 5, lng: 5 }
      expect(hull).not.toContainEqual(interior)
    })

    it('handles collinear points correctly', () => {
      const points: GeoPoint[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 5 },
        { lat: 0, lng: 10 },
      ]
      const hull = convexHull(points)
      // Collinear points form a degenerate hull — implementation-specific length,
      // but should at least not throw and should be ≤ 3 points.
      expect(hull.length).toBeLessThanOrEqual(3)
    })
  })

  describe('polygonCentroid', () => {
    it('returns null for fewer than 3 points', () => {
      expect(polygonCentroid([])).toBeNull()
      expect(polygonCentroid([{ lat: 0, lng: 0 }])).toBeNull()
      expect(
        polygonCentroid([
          { lat: 0, lng: 0 },
          { lat: 1, lng: 1 },
        ])
      ).toBeNull()
    })

    it('computes centroid of a square as its center', () => {
      const square: GeoPoint[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ]
      const centroid = polygonCentroid(square)
      expect(centroid).not.toBeNull()
      expect(centroid!.lng).toBeCloseTo(5, 5)
      expect(centroid!.lat).toBeCloseTo(5, 5)
    })

    it('returns the mean point for a degenerate (zero-area) polygon', () => {
      const collinear: GeoPoint[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 5 },
        { lat: 0, lng: 10 },
      ]
      const centroid = polygonCentroid(collinear)
      expect(centroid).not.toBeNull()
      expect(centroid!.lng).toBeCloseTo(5, 5)
      expect(centroid!.lat).toBeCloseTo(0, 5)
    })

    it('computes centroid of a triangle', () => {
      const triangle: GeoPoint[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 6 },
        { lat: 6, lng: 0 },
      ]
      const centroid = polygonCentroid(triangle)
      expect(centroid).not.toBeNull()
      expect(centroid!.lng).toBeCloseTo(2, 5)
      expect(centroid!.lat).toBeCloseTo(2, 5)
    })
  })

  describe('isPointInPolygon', () => {
    const square: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
      { lat: 10, lng: 0 },
    ]

    it('returns false for fewer than 3 polygon points', () => {
      expect(isPointInPolygon({ lat: 0, lng: 0 }, [])).toBe(false)
      expect(isPointInPolygon({ lat: 0, lng: 0 }, [{ lat: 0, lng: 0 }])).toBe(
        false
      )
    })

    it('returns true for a point clearly inside', () => {
      expect(isPointInPolygon({ lat: 5, lng: 5 }, square)).toBe(true)
    })

    it('returns false for a point clearly outside', () => {
      expect(isPointInPolygon({ lat: 50, lng: 50 }, square)).toBe(false)
      expect(isPointInPolygon({ lat: -1, lng: 5 }, square)).toBe(false)
    })

    it('handles points near edges deterministically', () => {
      // Just inside
      expect(isPointInPolygon({ lat: 0.01, lng: 5 }, square)).toBe(true)
      // Just outside
      expect(isPointInPolygon({ lat: -0.01, lng: 5 }, square)).toBe(false)
    })

    it('detects points inside a non-square polygon', () => {
      const triangle: GeoPoint[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 5 },
      ]
      expect(isPointInPolygon({ lat: 2, lng: 5 }, triangle)).toBe(true)
      expect(isPointInPolygon({ lat: 9, lng: 0 }, triangle)).toBe(false)
    })
  })
})
