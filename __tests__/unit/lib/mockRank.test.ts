/**
 * Unit tests for taste-aware heuristic scorer (mockRank + computeTasteBonus).
 *
 * Covers three scenarios:
 *  1. Perfect match — all preferences satisfied, high walk_score → top score
 *  2. Partial match — some preferences met, moderate walk_score → mid score
 *  3. No match     — no preferences met, zero walk_score → low score
 */
import { describe, it, expect } from '@jest/globals'
import { mockRank, computeTasteBonus } from '@/lib/llm/matcher'
import type { MatchCandidateProperty, MatchPreferences } from '@/lib/llm/types'

const ID_PERFECT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ID_PARTIAL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ID_NOMATCH = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const basePrefs = (): MatchPreferences => ({
  price_max: 800000,
  bedrooms_min: 3,
  bathrooms_min: 2,
})

const perfectCandidate = (): MatchCandidateProperty => ({
  id: ID_PERFECT,
  address: '1 Perfect St',
  city: 'Austin',
  state: 'TX',
  zip_code: '78701',
  price: 750000, // within budget
  bedrooms: 4, // ≥ min 3
  bathrooms: 3, // ≥ min 2
  square_feet: 2000,
  property_type: 'single_family',
  amenities: [],
  year_built: 2015,
  description: null,
  walk_score: 90, // high walk score → max taste bonus contribution
})

const partialCandidate = (): MatchCandidateProperty => ({
  id: ID_PARTIAL,
  address: '2 Partial Ave',
  city: 'Austin',
  state: 'TX',
  zip_code: '78702',
  price: 900000, // over budget → price weight does NOT apply
  bedrooms: 3, // meets min exactly
  bathrooms: 2, // meets min exactly
  square_feet: 1500,
  property_type: 'condo',
  amenities: [],
  year_built: 2010,
  description: null,
  walk_score: 50, // moderate walk score
})

const noMatchCandidate = (): MatchCandidateProperty => ({
  id: ID_NOMATCH,
  address: '3 Miss Lane',
  city: 'Austin',
  state: 'TX',
  zip_code: '78703',
  price: 1200000, // over budget
  bedrooms: 1, // below min 3
  bathrooms: 1, // below min 2
  square_feet: 600,
  property_type: 'condo',
  amenities: [],
  year_built: 1990,
  description: null,
  walk_score: 0, // no walk score contribution
})

// ─── computeTasteBonus ───────────────────────────────────────────────────────

describe('computeTasteBonus', () => {
  it('perfect match: all taste weights contribute → bonus > 0', () => {
    const bonus = computeTasteBonus(basePrefs(), perfectCandidate())
    expect(bonus).toBeGreaterThan(0)
    // bedroom(10) + bathroom(5) + price(15) + walk_score(90*2=180) = 210 pts → > 0
    expect(bonus).toBeCloseTo((10 + 5 + 15 + 90 * 2) / 430, 5)
  })

  it('partial match: bedroom/bathroom match but price over-budget → smaller bonus', () => {
    const bonus = computeTasteBonus(basePrefs(), partialCandidate())
    // bedroom(10) + bathroom(5) + walk_score(50*2=100) = 115 pts (no price)
    expect(bonus).toBeCloseTo((10 + 5 + 50 * 2) / 430, 5)
  })

  it('no match: all preferences missed → zero bonus', () => {
    const bonus = computeTasteBonus(basePrefs(), noMatchCandidate())
    // price over-budget, beds < min, baths < min, walk_score = 0
    expect(bonus).toBe(0)
  })

  it('candidate without walk_score field: still scores bedroom/bathroom/price', () => {
    const candidate: MatchCandidateProperty = {
      ...perfectCandidate(),
      walk_score: undefined,
    }
    const bonus = computeTasteBonus(basePrefs(), candidate)
    // bedroom(10) + bathroom(5) + price(15) = 30 pts, no walk contribution
    expect(bonus).toBeCloseTo(30 / 430, 5)
  })
})

// ─── mockRank with taste weights ────────────────────────────────────────────

describe('mockRank taste-aware heuristic', () => {
  it('perfect match: ranks highest among all three candidates', () => {
    const candidates = [
      noMatchCandidate(),
      partialCandidate(),
      perfectCandidate(),
    ]
    const [first] = mockRank(basePrefs(), candidates, 3)
    expect(first.property_id).toBe(ID_PERFECT)
    expect(first.score).toBeGreaterThan(0.5)
  })

  it('partial match: ranks above no-match candidate', () => {
    const candidates = [noMatchCandidate(), partialCandidate()]
    const ranked = mockRank(basePrefs(), candidates, 2)
    expect(ranked[0].property_id).toBe(ID_PARTIAL)
    expect(ranked[1].property_id).toBe(ID_NOMATCH)
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('no match: receives the lowest score and carries concern annotations', () => {
    const candidates = [
      perfectCandidate(),
      partialCandidate(),
      noMatchCandidate(),
    ]
    const ranked = mockRank(basePrefs(), candidates, 3)
    const last = ranked[ranked.length - 1]
    expect(last.property_id).toBe(ID_NOMATCH)
    expect(last.concerns.length).toBeGreaterThan(0)
  })

  it('walk_score is reflected in citations for candidates that have it', () => {
    const candidates = [perfectCandidate()]
    const [result] = mockRank(basePrefs(), candidates, 1)
    const hasCitation = result.citations.some((c) =>
      c.evidence.includes('walk_score')
    )
    expect(hasCitation).toBe(true)
  })

  it('scores are clamped to [0, 1] regardless of taste bonus magnitude', () => {
    const candidates = [
      perfectCandidate(),
      partialCandidate(),
      noMatchCandidate(),
    ]
    const ranked = mockRank(basePrefs(), candidates, 3)
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(1)
    }
  })
})
