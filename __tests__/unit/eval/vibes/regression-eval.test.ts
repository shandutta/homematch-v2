/**
 * EVAL-GATE — regression test for the property-vibes pipeline.
 *
 * Each scenario in VIBES_SCENARIOS encodes a specific failure mode the
 * audit caught. This suite drives every scenario through
 * gateTagsAgainstInput + computeConfidence and asserts the named drops /
 * keeps / confidence bounds. Each scenario contributes one test case so
 * a failing fixture is immediately attributable.
 *
 * Also includes an "audit summary" test that renders a one-line
 * per-scenario report. Useful for CI logs when prompt iterations land
 * — readers can see which scenarios changed without digging into Jest
 * output.
 */
import {
  computeConfidence,
  dedupeEmotionalHooks,
  gateTagsAgainstInput,
} from '@/lib/services/vibes/output-gating'
import {
  VIBES_SCENARIOS,
  type ScenarioEvaluation,
  type VibesScenario,
} from './scenarios'

function evaluate(scenario: VibesScenario): ScenarioEvaluation {
  const gating = gateTagsAgainstInput(scenario.llmTags, scenario.input)
  const confidence = computeConfidence(scenario.input)

  const failures: string[] = []
  for (const tag of scenario.mustDrop) {
    if (!gating.dropped.some((d) => d.tag === tag)) {
      failures.push(`expected drop of "${tag}" but it survived`)
    }
  }
  for (const tag of scenario.mustKeep) {
    if (!gating.kept.includes(tag)) {
      failures.push(`expected "${tag}" to survive but it was dropped`)
    }
  }
  if (scenario.expectConfidence?.min !== undefined) {
    if (confidence < scenario.expectConfidence.min) {
      failures.push(
        `confidence ${confidence} below min ${scenario.expectConfidence.min}`
      )
    }
  }
  if (scenario.expectConfidence?.max !== undefined) {
    if (confidence > scenario.expectConfidence.max) {
      failures.push(
        `confidence ${confidence} above max ${scenario.expectConfidence.max}`
      )
    }
  }

  return {
    scenario,
    gating,
    confidence,
    passed: failures.length === 0,
    failures,
  }
}

describe('EVAL-GATE: vibes regression scenarios', () => {
  for (const scenario of VIBES_SCENARIOS) {
    test(`[${scenario.id}] ${scenario.description}`, () => {
      const result = evaluate(scenario)
      // Top-level expect so the jest/expect-expect rule sees an
      // assertion; the structured throw below is what actually drives
      // the meaningful failure output.
      expect(result.passed || result.failures.length > 0).toBe(true)
      if (!result.passed) {
        const dropReport = result.gating.dropped
          .map((d) => `  - ${d.tag} (${d.reason})`)
          .join('\n')
        const keepReport = result.gating.kept.map((t) => `  - ${t}`).join('\n')
        throw new Error(
          `Scenario "${scenario.id}" failed:\n` +
            `  audit ref: ${scenario.auditReference}\n` +
            `  failures: ${result.failures.join('; ')}\n` +
            `  confidence: ${result.confidence}\n` +
            `  kept:\n${keepReport}\n` +
            `  dropped:\n${dropReport}`
        )
      }
    })
  }

  test('renders a single-line summary per scenario for CI logs', () => {
    const lines = VIBES_SCENARIOS.map((scenario) => {
      const r = evaluate(scenario)
      return `${r.passed ? 'PASS' : 'FAIL'} ${scenario.id} (conf=${r.confidence}, kept=${r.gating.kept.length}, dropped=${r.gating.dropped.length})`
    })
    // Surface the report in test output without polluting passing builds:
    if (process.env.VIBES_EVAL_REPORT === '1') {
      console.log('\n[VIBES-EVAL]\n' + lines.join('\n'))
    }
    expect(lines.every((l) => l.startsWith('PASS'))).toBe(true)
  })
})

describe('EVAL-GATE: dedupeEmotionalHooks regression', () => {
  test('drops near-duplicate hooks (audit LLM-TEMPLATING-001)', () => {
    const input = [
      "Backyard's got room for a firepit. Your friends will thank you.",
      "Backyard's got room for a firepit—your friends will thank you!",
      'The mudroom right off the garage is a lifesaver with kids and dogs.',
    ]
    const out = dedupeEmotionalHooks(input)
    expect(out).toHaveLength(2)
    expect(out[0]).toContain('firepit')
    expect(out[1]).toContain('mudroom')
  })

  test('handles empty / null input', () => {
    expect(dedupeEmotionalHooks(null)).toEqual([])
    expect(dedupeEmotionalHooks(undefined)).toEqual([])
    expect(dedupeEmotionalHooks([])).toEqual([])
    expect(dedupeEmotionalHooks(['', '  '])).toEqual([])
  })
})

describe('EVAL-GATE: computeConfidence anchors', () => {
  test('returns >= floor of 0.05 even on totally barren input', () => {
    expect(
      computeConfidence({
        imageCount: 0,
        hasDescription: false,
        hasAmenities: false,
        yearBuilt: null,
        lotSizeSqft: null,
        price: 100_000,
        bedrooms: 1,
      })
    ).toBeGreaterThanOrEqual(0.05)
  })

  test('saturates at 1.0 for fully-loaded input', () => {
    const score = computeConfidence({
      imageCount: 20,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 1990,
      lotSizeSqft: 5000,
      price: 800_000,
      bedrooms: 3,
    })
    expect(score).toBeGreaterThanOrEqual(0.95)
    expect(score).toBeLessThanOrEqual(1)
  })
})
