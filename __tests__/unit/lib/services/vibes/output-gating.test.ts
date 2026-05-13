/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Casts: the gating functions accept narrowed types; this test deliberately
// passes through null/undefined/empty entries to verify defensive filtering.
/**
 * LLM-001 / CONFIDENCE-001 / LLM-TEMPLATING-001 tests for the output-gating
 * module. Each rule from the audit (Section 1 of
 * qa-report-prod-2026-05-13-full-tour.md) gets its own assertion so prompt
 * changes can't silently regress the gating.
 */
import {
  gateTagsAgainstInput,
  computeConfidence,
  dedupeEmotionalHooks,
  ALWAYS_DROPPED_TAGS,
  MULTI_IMAGE_REQUIRED_TAGS,
  LOT_DEPENDENT_TAGS,
  ERA_TAG_RANGES,
} from '@/lib/services/vibes/output-gating'

const baseInput = {
  imageCount: 12,
  hasDescription: true,
  hasAmenities: true,
  yearBuilt: 1960,
  lotSizeSqft: 5000,
  price: 750_000,
  bedrooms: 3,
}

describe('gateTagsAgainstInput', () => {
  it('handles empty / null / undefined input', () => {
    expect(gateTagsAgainstInput(null, baseInput)).toEqual({
      kept: [],
      dropped: [],
    })
    expect(gateTagsAgainstInput(undefined, baseInput)).toEqual({
      kept: [],
      dropped: [],
    })
    expect(gateTagsAgainstInput([], baseInput)).toEqual({
      kept: [],
      dropped: [],
    })
  })

  it('keeps tags that have no gating rule', () => {
    const r = gateTagsAgainstInput(
      ["Chef's Kitchen", 'Fireplace Focal Point'],
      baseInput
    )
    expect(r.kept).toEqual(["Chef's Kitchen", 'Fireplace Focal Point'])
    expect(r.dropped).toEqual([])
  })

  it('always drops tags that require absent input signals', () => {
    for (const tag of ALWAYS_DROPPED_TAGS) {
      const r = gateTagsAgainstInput([tag], baseInput)
      expect(r.kept).toEqual([])
      expect(r.dropped.map((d) => d.tag)).toEqual([tag])
    }
  })

  it('drops multi-image tags when image count is below 4', () => {
    const input = { ...baseInput, imageCount: 1 }
    for (const tag of MULTI_IMAGE_REQUIRED_TAGS) {
      const r = gateTagsAgainstInput([tag], input)
      expect(r.kept).toEqual([])
      expect(r.dropped[0]?.reason).toMatch(/requires >= 4 images/)
    }
  })

  it('keeps multi-image tags when image count is >= 4', () => {
    const input = { ...baseInput, imageCount: 8 }
    const tag = 'Hardwood Throughout'
    expect(gateTagsAgainstInput([tag], input).kept).toEqual([tag])
  })

  it('drops lot-dependent tags when lot_size_sqft < 2000', () => {
    const input = { ...baseInput, lotSizeSqft: 1000 }
    for (const tag of LOT_DEPENDENT_TAGS) {
      const r = gateTagsAgainstInput([tag], input)
      expect(r.kept).toEqual([])
      expect(r.dropped[0]?.reason).toMatch(/requires lot_size_sqft >= 2000/)
    }
  })

  it('drops lot-dependent tags when lot_size_sqft is null', () => {
    const input = { ...baseInput, lotSizeSqft: null }
    const r = gateTagsAgainstInput(['Pet Paradise'], input)
    expect(r.kept).toEqual([])
  })

  it('drops era tags when year_built is null', () => {
    const input = { ...baseInput, yearBuilt: null }
    for (const tag of Object.keys(ERA_TAG_RANGES)) {
      const r = gateTagsAgainstInput([tag], input)
      expect(r.kept).toEqual([])
      expect(r.dropped[0]?.reason).toMatch(/requires year_built/)
    }
  })

  it('drops era tags when year_built is out of range', () => {
    const r = gateTagsAgainstInput(['Mid-Century Modern'], {
      ...baseInput,
      yearBuilt: 1850,
    })
    expect(r.kept).toEqual([])
    const r2 = gateTagsAgainstInput(['Mid-Century Modern'], {
      ...baseInput,
      yearBuilt: 2010,
    })
    expect(r2.kept).toEqual([])
  })

  it('keeps era tags when year_built falls in the era window', () => {
    const r = gateTagsAgainstInput(['Mid-Century Modern'], {
      ...baseInput,
      yearBuilt: 1960,
    })
    expect(r.kept).toEqual(['Mid-Century Modern'])
  })

  it('drops non-string / empty entries', () => {
    const r = gateTagsAgainstInput(
      [
        '',
        '   ',
        null as unknown as string,
        undefined as unknown as string,
        "Chef's Kitchen",
      ],
      baseInput
    )
    expect(r.kept).toEqual(["Chef's Kitchen"])
    expect(r.dropped.length).toBe(4)
  })
})

describe('computeConfidence', () => {
  it('returns 1.0 (or near it) when every signal is present and image-rich', () => {
    const score = computeConfidence({ ...baseInput, imageCount: 20 })
    expect(score).toBeGreaterThanOrEqual(0.95)
  })

  it('drops to the floor when no optional signals are present', () => {
    const score = computeConfidence({
      imageCount: 0,
      hasDescription: false,
      hasAmenities: false,
      yearBuilt: null,
      lotSizeSqft: null,
      price: 0,
      bedrooms: 0,
    })
    // floor is 0.05 — distinguishable from genuinely absent confidence
    expect(score).toBe(0.05)
  })

  it('produces distinct values for distinct inputs (rules out the old hardcoded 0.85)', () => {
    const a = computeConfidence({
      ...baseInput,
      imageCount: 1,
      hasDescription: false,
    })
    const b = computeConfidence({
      ...baseInput,
      imageCount: 10,
      hasDescription: true,
    })
    expect(a).not.toBe(b)
    expect(b).toBeGreaterThan(a)
  })

  it('clamps image richness at 10', () => {
    const a = computeConfidence({ ...baseInput, imageCount: 10 })
    const b = computeConfidence({ ...baseInput, imageCount: 50 })
    expect(a).toBe(b)
  })
})

describe('dedupeEmotionalHooks', () => {
  it('returns [] for null / undefined / non-array', () => {
    expect(dedupeEmotionalHooks(null)).toEqual([])
    expect(dedupeEmotionalHooks(undefined)).toEqual([])
    expect(dedupeEmotionalHooks([] as string[])).toEqual([])
  })

  it('dedupes case-insensitively', () => {
    const out = dedupeEmotionalHooks([
      'That porch? Lifesaver for quiet mornings.',
      'that porch lifesaver for quiet mornings',
    ])
    expect(out).toEqual(['That porch? Lifesaver for quiet mornings.'])
  })

  it('dedupes when only punctuation / whitespace differs', () => {
    const out = dedupeEmotionalHooks([
      "Backyard's got room for a firepit. Your friends will thank you.",
      'Backyards got room for a firepit Your friends will thank you',
      "Backyard's got room for a firepit -- Your friends will thank you!",
    ])
    expect(out).toEqual([
      "Backyard's got room for a firepit. Your friends will thank you.",
    ])
  })

  it('drops empty / whitespace-only / non-string entries', () => {
    const out = dedupeEmotionalHooks([
      '',
      '   ',
      null as unknown as string,
      undefined as unknown as string,
      'The breakfast nook gets morning light.',
    ])
    expect(out).toEqual(['The breakfast nook gets morning light.'])
  })

  it('keeps distinct hooks in original order', () => {
    const out = dedupeEmotionalHooks([
      'Mudroom right off the garage.',
      'Double sinks in the primary bath.',
      'The bonus room off the garage.',
    ])
    expect(out).toEqual([
      'Mudroom right off the garage.',
      'Double sinks in the primary bath.',
      'The bonus room off the garage.',
    ])
  })
})
