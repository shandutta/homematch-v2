import { describe, test, expect, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import polygonClipping from 'polygon-clipping'

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

const toClippingMultiPolygon = (bounds: any) => {
  if (!bounds) return []
  if (bounds.type === 'MultiPolygon') return bounds.coordinates
  if (bounds.type === 'Polygon') return [bounds.coordinates]
  return []
}

const clippingRingArea = (ring: number[][]) => {
  if (ring.length < 3) return 0
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i]!
    const next = ring[i + 1]!
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

const clippingPolygonArea = (polygon: number[][][]) => {
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

describe('Map boundaries API', () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54200'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const metro = `MECE Test Metro ${crypto.randomUUID()}`
  const insertedIds: string[] = []

  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

  afterAll(async () => {
    if (!supabase) return
    await supabase.from('neighborhoods').delete().eq('metro_area', metro)
  })

  test('returns precomputed MECE-safe boundaries', async () => {
    if (!supabase) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set for integration test')
    }

    const seedRows = [
      {
        id: crypto.randomUUID(),
        name: 'MECE Alpha',
        city: 'Testopolis',
        state: 'TS',
        metro_area: metro,
        bounds: toSquarePolygon(0, 0, 1, 1),
      },
      {
        id: crypto.randomUUID(),
        name: 'MECE Beta',
        city: 'Testopolis',
        state: 'TS',
        metro_area: metro,
        bounds: toSquarePolygon(0.5, 0.5, 1.5, 1.5),
      },
    ]

    insertedIds.push(...seedRows.map((row) => row.id))

    const { error: insertError } = await supabase
      .from('neighborhoods')
      .insert(seedRows)
    if (insertError) {
      throw new Error(insertError.message)
    }

    const response = await fetch(
      `http://localhost:3000/api/maps/metro-boundaries?metro=${encodeURIComponent(
        metro
      )}&debug=1`
    )

    expect(response.ok).toBe(true)
    const payload = await response.json()

    expect(payload.precomputed).toBe(true)
    expect(Array.isArray(payload.neighborhoods)).toBe(true)
    expect(payload.neighborhoods.length).toBe(2)
    expect(payload.debug?.overlapRemoved).toBe(0)

    const [first, second] = payload.neighborhoods
    const firstClip = toClippingMultiPolygon(first.bounds)
    const secondClip = toClippingMultiPolygon(second.bounds)
    const overlap = polygonClipping.intersection(firstClip, secondClip)
    const overlapArea = clippingMultiPolygonArea(overlap as number[][][][])

    expect(overlapArea).toBe(0)
  })
})
