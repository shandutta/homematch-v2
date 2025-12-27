import { describe, expect, test } from '@jest/globals'
import { parsePostGISPolygon } from '@/lib/utils/coordinates'

describe('parsePostGISPolygon', () => {
  test('parses GeoJSON polygon coordinates', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-122.42, 37.78],
          [-122.41, 37.78],
          [-122.41, 37.77],
          [-122.42, 37.77],
          [-122.42, 37.78],
        ],
      ],
    }

    const rings = parsePostGISPolygon(polygon)
    expect(rings).not.toBeNull()
    expect(rings?.[0]?.[0]).toEqual({ lat: 37.78, lng: -122.42 })
  })

  test('parses Postgres polygon string', () => {
    const polygon =
      '((-122.42,37.78),(-122.41,37.78),(-122.41,37.77),(-122.42,37.77),(-122.42,37.78))'
    const rings = parsePostGISPolygon(polygon)
    expect(rings).not.toBeNull()
    expect(rings?.[0]).toHaveLength(5)
  })

  test('parses GeoJSON MultiPolygon using first polygon', () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-122.42, 37.78],
            [-122.41, 37.78],
            [-122.41, 37.77],
            [-122.42, 37.77],
            [-122.42, 37.78],
          ],
        ],
        [
          [
            [-122.4, 37.7],
            [-122.39, 37.7],
            [-122.39, 37.69],
            [-122.4, 37.69],
            [-122.4, 37.7],
          ],
        ],
      ],
    }

    const rings = parsePostGISPolygon(multi)
    expect(rings).not.toBeNull()
    expect(rings?.[0]?.[0]).toEqual({ lat: 37.78, lng: -122.42 })
  })

  test('returns null for invalid input', () => {
    expect(parsePostGISPolygon('invalid')).toBeNull()
  })
})
