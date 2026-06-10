/**
 * EVAL-GATE — snapshot the rendered user prompt for a canonical property.
 *
 * Prior to this, every prompt iteration shipped blind. By snapshotting
 * the rendered user prompt for a stable canonical input, any future
 * edit to prompts.ts surfaces as a snapshot diff in code review. The
 * snapshot is intentionally tied to a single fixture so it stays
 * readable; richer behavioral tests live in regression-eval.test.ts.
 */
import { buildUserPrompt } from '@/lib/services/vibes/prompts'

describe('EVAL-GATE: user prompt snapshot', () => {
  test('renders stable output for the canonical fixture', () => {
    const prompt = buildUserPrompt(
      {
        address: '100 Eval Way',
        city: 'Snapshotville',
        state: 'CA',
        price: 875_000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1850,
        propertyType: 'single_family',
        yearBuilt: 1972,
        lotSizeSqft: 5500,
        amenities: ['kitchen island', 'two-car garage', 'central air'],
        description:
          'Charming mid-century single-story with sunny breakfast nook. Email seller at agent@example.com.',
      },
      6
    )

    // Spot-check the canonical structure so future edits are surfaced as
    // a snapshot diff. We avoid asserting on the entire blob (LLM
    // instructions evolve more often than the structure does).
    expect(prompt).toMatchSnapshot('canonical-property-prompt')
  })

  test('PII is redacted from descriptions', () => {
    const prompt = buildUserPrompt(
      {
        address: '100 PII Lane',
        city: 'Redactville',
        state: 'CA',
        price: 500_000,
        bedrooms: 2,
        bathrooms: 1,
        squareFeet: 1200,
        propertyType: 'condo',
        yearBuilt: 2000,
        lotSizeSqft: null,
        amenities: null,
        description:
          'Call (415) 555-1234 or email agent@example.com or visit https://example.com',
      },
      4
    )
    expect(prompt).not.toContain('agent@example.com')
    expect(prompt).not.toContain('(415) 555-1234')
    expect(prompt).not.toContain('https://example.com')
    expect(prompt).toContain('[REDACTED]')
  })

  test('pushes generated copy toward evidence instead of hype', () => {
    const prompt = buildUserPrompt(
      {
        address: '100 Evidence Way',
        city: 'Snapshotville',
        state: 'CA',
        price: 875_000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1850,
        propertyType: 'single_family',
        yearBuilt: 1972,
        lotSizeSqft: 5500,
        amenities: ['office nook', 'deck', 'two-car garage'],
        description: 'Single-story home with office nook and rear deck.',
      },
      6
    )

    expect(prompt).toContain('extract buyer-relevant evidence and fit signals')
    expect(prompt).toContain('Name evidence before any lifestyle implication')
    expect(prompt).toContain(
      'Every reason must cite a feature, room, layout, score, or neighborhood fact'
    )
    expect(prompt).toContain('NO: quotes, dream, perfect, magical')
  })
})
