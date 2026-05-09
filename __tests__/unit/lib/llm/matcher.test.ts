import { describe, it, expect, jest } from '@jest/globals'
import {
  match,
  mockRank,
  parseLLMResponse,
  type LLMClient,
} from '@/lib/llm/matcher'
import { redactPII, validateAndRedact } from '@/lib/llm/safety'
import type {
  MatchCandidateProperty,
  MatchPreferences,
  MatchRequest,
} from '@/lib/llm/types'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'
const ID_C = '33333333-3333-4333-8333-333333333333'

const baseCandidate = (
  overrides: Partial<MatchCandidateProperty> = {}
): MatchCandidateProperty => ({
  id: ID_A,
  address: '1 Main St',
  city: 'Palo Alto',
  state: 'CA',
  zip_code: '94301',
  price: 800000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  amenities: ['garage'],
  year_built: 2005,
  description: null,
  ...overrides,
})

const basePrefs = (
  overrides: Partial<MatchPreferences> = {}
): MatchPreferences => ({
  price_max: 900000,
  bedrooms_min: 3,
  bathrooms_min: 2,
  property_types: ['single_family'],
  ...overrides,
})

const validRequest = (
  overrides: Partial<MatchRequest> = {}
): MatchRequest => ({
  preferences: basePrefs(),
  candidates: [baseCandidate()],
  top_k: 5,
  ...overrides,
})

describe('redactPII', () => {
  it('redacts email, phone, and URLs', () => {
    const input =
      'Contact agent jane@example.com or call (415) 555-1212. See https://example.com/listing.'
    const out = redactPII(input)
    expect(out).not.toContain('jane@example.com')
    expect(out).not.toContain('(415) 555-1212')
    expect(out).not.toContain('https://example.com')
    expect(out).toContain('[REDACTED]')
  })

  it('redacts SSN and credit card patterns', () => {
    const input = 'SSN 123-45-6789 card 4111 1111 1111 1111'
    const out = redactPII(input)
    expect(out).not.toContain('123-45-6789')
    expect(out).not.toContain('4111 1111 1111 1111')
  })

  it('passes through harmless strings unchanged', () => {
    expect(redactPII('Lovely 3-bed home with garage.')).toBe(
      'Lovely 3-bed home with garage.'
    )
  })
})

describe('validateAndRedact', () => {
  it('redacts PII from preferences.free_text and candidate descriptions', () => {
    const result = validateAndRedact({
      preferences: {
        ...basePrefs(),
        free_text: 'Email me at buyer@example.com',
      },
      candidates: [
        baseCandidate({
          description: 'Call agent at 415-555-1212 for a tour.',
        }),
      ],
      top_k: 3,
    })
    expect(result.preferences.free_text).not.toContain('buyer@example.com')
    expect(result.candidates[0].description).not.toContain('415-555-1212')
  })

  it('throws on invalid input', () => {
    expect(() => validateAndRedact({ candidates: [] })).toThrow()
  })
})

describe('mockRank', () => {
  it('returns ranked candidates with citations and stable rank order', () => {
    const candidates = [
      baseCandidate({ id: ID_A, price: 850000 }),
      baseCandidate({ id: ID_B, price: 750000, bedrooms: 4 }),
      baseCandidate({ id: ID_C, price: 1500000 }), // over budget
    ]
    const ranked = mockRank(basePrefs(), candidates, 3)
    expect(ranked).toHaveLength(3)
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].rank).toBe(2)
    expect(ranked[2].rank).toBe(3)
    for (const r of ranked) {
      expect(r.citations.length).toBeGreaterThan(0)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(1)
    }
    // Over-budget candidate should rank last and carry a price concern.
    const overBudget = ranked.find((r) => r.property_id === ID_C)!
    expect(overBudget.concerns.some((c) => c.includes('exceeds max'))).toBe(true)
  })

  it('respects top_k', () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      baseCandidate({ id: ID_A.replace(/1/g, String(i % 9 || 1)), price: 800000 + i * 1000 })
    )
    const ranked = mockRank(basePrefs(), candidates, 3)
    expect(ranked).toHaveLength(3)
  })
})

describe('match (mock mode)', () => {
  it('returns mode=mock when LLM_ENABLED is false', async () => {
    const result = await match(validRequest(), { llmEnabled: false })
    expect(result.mode).toBe('mock')
    expect(result.model).toBeNull()
    expect(result.candidate_count).toBe(1)
    expect(result.ranked).toHaveLength(1)
    expect(result.ranked[0].citations.length).toBeGreaterThan(0)
  })

  it('defaults to mock mode without LLM_ENABLED set', async () => {
    delete process.env.LLM_ENABLED
    const result = await match(validRequest())
    expect(result.mode).toBe('mock')
  })

  it('marks truncated=true when ranked.length < candidate count', async () => {
    const candidates = [
      baseCandidate({ id: ID_A }),
      baseCandidate({ id: ID_B }),
      baseCandidate({ id: ID_C }),
    ]
    const result = await match(
      { preferences: basePrefs(), candidates, top_k: 2 },
      { llmEnabled: false }
    )
    expect(result.truncated).toBe(true)
    expect(result.ranked).toHaveLength(2)
  })

  it('rejects malformed input via Zod', async () => {
    await expect(
      match({ preferences: {}, candidates: [], top_k: 1 })
    ).rejects.toThrow()
  })
})

describe('match (LLM mode)', () => {
  it('throws when LLM mode is enabled but no client is provided', async () => {
    await expect(
      match(validRequest(), { llmEnabled: true })
    ).rejects.toThrow(/no llmClient/)
  })

  it('calls the injected LLM client and parses its JSON response', async () => {
    const completeSpy = jest.fn(async () => ({
      content: JSON.stringify({
        ranked: [
          {
            property_id: ID_A,
            rank: 1,
            score: 0.92,
            rationale: 'Within budget; matches type.',
            citations: [{ field: 'price', evidence: '800000' }],
            concerns: [],
          },
        ],
      }),
      model: 'test-model',
    }))
    const llmClient: LLMClient = { complete: completeSpy }

    const result = await match(validRequest(), {
      llmEnabled: true,
      llmClient,
      model: 'test-model',
    })

    expect(result.mode).toBe('llm')
    expect(result.model).toBe('test-model')
    expect(result.ranked).toHaveLength(1)
    expect(result.ranked[0].property_id).toBe(ID_A)
    expect(completeSpy).toHaveBeenCalledTimes(1)
    const callArgs = completeSpy.mock.calls[0][0]
    expect(callArgs.system).toMatch(/HomeMatch/i)
    expect(callArgs.user).toContain(ID_A)
  })

  it('strips ranked entries whose property_id is not in candidates (anti-hallucination)', () => {
    const candidates = [baseCandidate({ id: ID_A })]
    const raw = JSON.stringify({
      ranked: [
        {
          property_id: ID_B, // hallucinated — not in candidates
          rank: 1,
          score: 0.99,
          rationale: 'Made up.',
          citations: [{ field: 'price', evidence: '0' }],
          concerns: [],
        },
        {
          property_id: ID_A,
          rank: 2,
          score: 0.8,
          rationale: 'Real candidate.',
          citations: [{ field: 'price', evidence: '800000' }],
          concerns: [],
        },
      ],
    })
    const ranked = parseLLMResponse(raw, candidates, 5)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].property_id).toBe(ID_A)
    expect(ranked[0].rank).toBe(1) // renumbered
  })

  it('strips ```json fences from LLM output', () => {
    const candidates = [baseCandidate({ id: ID_A })]
    const raw = [
      '```json',
      JSON.stringify({
        ranked: [
          {
            property_id: ID_A,
            rank: 1,
            score: 0.7,
            rationale: 'Fenced.',
            citations: [{ field: 'price', evidence: '800000' }],
            concerns: [],
          },
        ],
      }),
      '```',
    ].join('\n')
    const ranked = parseLLMResponse(raw, candidates, 5)
    expect(ranked).toHaveLength(1)
  })

  it('throws on non-JSON LLM output', () => {
    expect(() => parseLLMResponse('not json at all', [], 5)).toThrow(
      /non-JSON/
    )
  })

  it('throws when "ranked" is missing or not an array', () => {
    expect(() => parseLLMResponse('{"foo": "bar"}', [], 5)).toThrow(
      /ranked/
    )
  })

  it('drops entries that fail schema validation but keeps valid ones', () => {
    const candidates = [baseCandidate({ id: ID_A }), baseCandidate({ id: ID_B })]
    const raw = JSON.stringify({
      ranked: [
        {
          // Missing citations — should be dropped (citations required)
          property_id: ID_A,
          rank: 1,
          score: 0.9,
          rationale: 'No citations.',
          citations: [],
          concerns: [],
        },
        {
          property_id: ID_B,
          rank: 2,
          score: 0.7,
          rationale: 'Has citation.',
          citations: [{ field: 'bedrooms', evidence: '3' }],
          concerns: [],
        },
      ],
    })
    const ranked = parseLLMResponse(raw, candidates, 5)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].property_id).toBe(ID_B)
  })
})
