import { describe, expect, test, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { NeighborhoodService } from '@/lib/services/properties/neighborhood'
import type { Database } from '@/types/database'

describe('NeighborhoodService metro area queries', () => {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54200'
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const shouldRun = Boolean(supabaseKey)

  const supabase = shouldRun
    ? createClient<Database>(supabaseUrl, supabaseKey as string)
    : null

  const neighborhoodService = new NeighborhoodService({
    createClient: async () => supabase!,
  })

  const runId = crypto.randomUUID().slice(0, 8)
  const metroArea = `PW Metro ${runId}`
  const neighborhoodIds = [crypto.randomUUID(), crypto.randomUUID()]

  beforeAll(async () => {
    if (!shouldRun || !supabase) {
      console.log('Skipping metro area integration tests: missing Supabase key')
      return
    }

    const createdAt = new Date().toISOString()
    const [idA, idB] = neighborhoodIds

    const { error } = await supabase.from('neighborhoods').insert([
      {
        id: idA,
        name: `PW Metro Neighborhood ${runId} A`,
        city: `PW Metro City ${runId} A`,
        state: 'CA',
        metro_area: metroArea,
        bounds:
          'SRID=4326;POLYGON((-122.42 37.78, -122.41 37.78, -122.41 37.77, -122.42 37.77, -122.42 37.78))',
        created_at: createdAt,
      },
      {
        id: idB,
        name: `PW Metro Neighborhood ${runId} B`,
        city: `PW Metro City ${runId} B`,
        state: 'CA',
        metro_area: metroArea,
        bounds:
          'SRID=4326;POLYGON((-122.45 37.76, -122.44 37.76, -122.44 37.75, -122.45 37.75, -122.45 37.76))',
        created_at: createdAt,
      },
    ])

    if (error) throw new Error(error.message)
  })

  afterAll(async () => {
    if (!shouldRun || !supabase) return

    const { error } = await supabase
      .from('neighborhoods')
      .delete()
      .in('id', neighborhoodIds)

    if (error) {
      console.warn('Failed to clean up metro area test neighborhoods', error)
    }
  })

  test('returns neighborhoods for a metro area', async () => {
    if (!shouldRun) {
      console.log('Skipping metro area integration test: missing Supabase key')
      return
    }

    const results =
      await neighborhoodService.getNeighborhoodsByMetroArea(metroArea)

    expect(results.length).toBeGreaterThanOrEqual(2)
    const ids = results.map((item) => item.id)
    neighborhoodIds.forEach((id) => expect(ids).toContain(id))
  })
})
