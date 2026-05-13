/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Cast: the helper takes a SupabaseClient<Database> with a deeply-typed
// fluent builder, but the test only exercises the from→select→in chain.
// A minimal stub typed as the full client would require re-deriving the
// generated types; the casts here are local to the test file.
/**
 * Tests for NEIGHBORHOOD-VIBES-WIRE — confirms the helper joins
 * properties → neighborhoods → neighborhood_vibes and produces the
 * NeighborhoodVibesContext shape the prompt expects.
 */
import { buildNeighborhoodContextMap } from '@/lib/services/vibes/neighborhood-context-builder'

type SelectFn = jest.Mock

interface StubResponse {
  data: unknown[] | null
}

const stubFrom = (responses: Record<string, StubResponse>) => {
  return jest.fn((table: string) => {
    const select: SelectFn = jest.fn(() => ({
      in: jest.fn(async () => responses[table] ?? { data: [] }),
    }))
    return { select }
  })
}

describe('buildNeighborhoodContextMap', () => {
  it('returns empty map when no property has a neighborhood_id', async () => {
    const supabase = { from: jest.fn() } as unknown as Parameters<
      typeof buildNeighborhoodContextMap
    >[0]
    const result = await buildNeighborhoodContextMap(supabase, [
      { id: 'p1', neighborhood_id: null },
    ])
    expect(result.size).toBe(0)
  })

  it('skips properties whose neighborhood has no vibe row', async () => {
    const from = stubFrom({
      neighborhood_vibes: { data: [] },
      neighborhoods: {
        data: [{ id: 'n1', name: 'Foo', walk_score: 80, transit_score: 60 }],
      },
    })
    const supabase = { from } as unknown as Parameters<
      typeof buildNeighborhoodContextMap
    >[0]
    const result = await buildNeighborhoodContextMap(supabase, [
      { id: 'p1', neighborhood_id: 'n1' },
    ])
    expect(result.size).toBe(0)
  })

  it('joins vibes with neighborhood meta and maps to property ids', async () => {
    const from = stubFrom({
      neighborhood_vibes: {
        data: [
          {
            neighborhood_id: 'n1',
            tagline: 'Quiet streets, good coffee',
            neighborhood_themes: [
              { name: 'Walkable', whyItMatters: 'flat sidewalks everywhere' },
            ],
            local_highlights: [
              {
                name: 'Roast House',
                category: 'cafe',
                whyItMatters: 'best espresso in the metro',
              },
            ],
            resident_fits: [
              { profile: 'remote worker', reason: 'plenty of WFH cafes' },
            ],
          },
        ],
      },
      neighborhoods: {
        data: [
          {
            id: 'n1',
            name: 'Cascade Heights',
            walk_score: 85,
            transit_score: 70,
          },
        ],
      },
    })
    const supabase = { from } as unknown as Parameters<
      typeof buildNeighborhoodContextMap
    >[0]
    const result = await buildNeighborhoodContextMap(supabase, [
      { id: 'p1', neighborhood_id: 'n1' },
      { id: 'p2', neighborhood_id: 'n1' },
      { id: 'p3', neighborhood_id: null },
    ])
    expect(result.size).toBe(2)
    const ctx = result.get('p1')
    expect(ctx?.neighborhoodName).toBe('Cascade Heights')
    expect(ctx?.tagline).toBe('Quiet streets, good coffee')
    expect(ctx?.walkScore).toBe(85)
    expect(ctx?.transitScore).toBe(70)
    expect(ctx?.themes).toEqual([
      { name: 'Walkable', whyItMatters: 'flat sidewalks everywhere' },
    ])
    expect(ctx?.localHighlights).toHaveLength(1)
    expect(ctx?.residentFits).toHaveLength(1)
    expect(result.get('p2')).toEqual(ctx)
    expect(result.has('p3')).toBe(false)
  })

  it('drops malformed JSON entries silently', async () => {
    const from = stubFrom({
      neighborhood_vibes: {
        data: [
          {
            neighborhood_id: 'n1',
            tagline: 'ok',
            neighborhood_themes: [
              { name: 'Walkable' }, // missing whyItMatters
              { name: 'Quiet', whyItMatters: 'leafy side streets' },
              null,
              'garbage',
            ],
            local_highlights: 'not an array',
            resident_fits: null,
          },
        ],
      },
      neighborhoods: {
        data: [{ id: 'n1', name: 'X', walk_score: null, transit_score: null }],
      },
    })
    const supabase = { from } as unknown as Parameters<
      typeof buildNeighborhoodContextMap
    >[0]
    const result = await buildNeighborhoodContextMap(supabase, [
      { id: 'p1', neighborhood_id: 'n1' },
    ])
    const ctx = result.get('p1')
    expect(ctx?.themes).toEqual([
      { name: 'Quiet', whyItMatters: 'leafy side streets' },
    ])
    expect(ctx?.localHighlights).toEqual([])
    expect(ctx?.residentFits).toEqual([])
    expect(ctx?.walkScore).toBeNull()
    expect(ctx?.transitScore).toBeNull()
  })
})
