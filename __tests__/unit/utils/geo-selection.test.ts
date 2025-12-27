import { describe, expect, test } from '@jest/globals'
import {
  convexHull,
  isPointInPolygon,
  polygonCentroid,
} from '@/lib/utils/geo-selection'

describe('convexHull', () => {
  test('returns the outer hull for a square with interior points', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0.5, lng: 0.5 },
    ]

    const hull = convexHull(points)
    const keys = hull.map((point) => `${point.lat},${point.lng}`)

    expect(hull).toHaveLength(4)
    expect(keys).toEqual(expect.arrayContaining(['0,0', '0,1', '1,1', '1,0']))
  })
})

describe('polygonCentroid', () => {
  test('returns the centroid of a rectangle', () => {
    const ring = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 },
    ]

    const centroid = polygonCentroid(ring)
    expect(centroid).not.toBeNull()
    expect(centroid?.lat).toBeCloseTo(1)
    expect(centroid?.lng).toBeCloseTo(1)
  })
})

describe('isPointInPolygon', () => {
  test('returns true when point is inside polygon', () => {
    const ring = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 4 },
      { lat: 4, lng: 4 },
      { lat: 4, lng: 0 },
    ]

    expect(isPointInPolygon({ lat: 2, lng: 2 }, ring)).toBe(true)
  })

  test('returns false when point is outside polygon', () => {
    const ring = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 4 },
      { lat: 4, lng: 4 },
      { lat: 4, lng: 0 },
    ]

    expect(isPointInPolygon({ lat: 5, lng: 5 }, ring)).toBe(false)
  })
})
