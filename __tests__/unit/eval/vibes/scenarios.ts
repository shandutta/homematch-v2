/**
 * EVAL-GATE — regression scenarios for the property-vibes LLM pipeline.
 *
 * Each scenario codifies a specific failure mode the prod audit
 * (.gstack/qa-reports/qa-report-prod-2026-05-13-full-tour.md, Section 1)
 * actually observed in the wild. The regression test runs every scenario
 * through the post-processor and asserts that the named hallucinations
 * get dropped and the named grounded tags survive. Adding a new fixture
 * here is the way to lock in any future prompt-iteration learning.
 *
 * Why offline-only: the post-processor is the regression bar. An online
 * eval would burn paid OpenRouter quota on every CI run and couple the
 * test suite to model availability. The audit's specific findings are
 * all expressible as input-availability assertions, which is exactly
 * what gateTagsAgainstInput / computeConfidence / dedupeEmotionalHooks
 * verify.
 */
import type { GateResult } from '@/lib/services/vibes/output-gating'

export interface VibesScenario {
  /** Short stable id used in test output and the failure-mode report. */
  id: string
  /** Audit reference line so a failing assertion has a paper trail. */
  auditReference: string
  /** Human-readable failure mode the scenario locks down. */
  description: string
  /** Per-property gating input. */
  input: {
    imageCount: number
    hasDescription: boolean
    hasAmenities: boolean
    yearBuilt: number | null
    lotSizeSqft: number | null
    price: number
    bedrooms: number
  }
  /** What the LLM emitted (the regression target). */
  llmTags: string[]
  /** Tags that MUST be dropped after gating. */
  mustDrop: string[]
  /** Tags that MUST survive gating. */
  mustKeep: string[]
  /** Optional bounds on the derived confidence score. */
  expectConfidence?: { min?: number; max?: number }
}

export const VIBES_SCENARIOS: readonly VibesScenario[] = [
  {
    id: 'walkable-no-walkscore',
    auditReference:
      'LLM-001: 4,663 "Walkable Neighborhood" tags emitted with no walkability data',
    description:
      'LLM emits Walkable Neighborhood — must drop (always-dropped until Walk Score is wired)',
    input: {
      imageCount: 6,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 1995,
      lotSizeSqft: 5000,
      price: 750_000,
      bedrooms: 3,
    },
    llmTags: ['Walkable Neighborhood', "Chef's Kitchen"],
    mustDrop: ['Walkable Neighborhood'],
    mustKeep: ["Chef's Kitchen"],
  },
  {
    id: 'remote-work-ready',
    auditReference: 'LLM-001: 6,469 "Remote Work Ready" tags',
    description:
      'LLM emits Remote Work Ready with no remote-work signal — must drop',
    input: {
      imageCount: 8,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 2005,
      lotSizeSqft: 6000,
      price: 900_000,
      bedrooms: 4,
    },
    llmTags: ['Remote Work Ready', 'Hardwood Throughout'],
    mustDrop: ['Remote Work Ready'],
    mustKeep: ['Hardwood Throughout'],
  },
  {
    id: 'pet-paradise-tiny-lot',
    auditReference: 'LLM-001: 4,120 "Pet Paradise" tags w/o yard data',
    description:
      'LLM emits Pet Paradise on a 600 sqft lot — must drop (lot below threshold)',
    input: {
      imageCount: 5,
      hasDescription: true,
      hasAmenities: false,
      yearBuilt: 2010,
      lotSizeSqft: 600,
      price: 525_000,
      bedrooms: 2,
    },
    llmTags: ['Pet Paradise', 'Cozy & Warm'],
    mustDrop: ['Pet Paradise'],
    mustKeep: ['Cozy & Warm'],
  },
  {
    id: 'pet-paradise-real-yard',
    auditReference: 'LLM-001 inverse: grounded yard tag survives',
    description:
      'LLM emits Pet Paradise on a 7000 sqft lot — must keep (lot above threshold)',
    input: {
      imageCount: 5,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 1998,
      lotSizeSqft: 7000,
      price: 850_000,
      bedrooms: 4,
    },
    llmTags: ['Pet Paradise', 'Garden Paradise'],
    mustDrop: [],
    mustKeep: ['Pet Paradise', 'Garden Paradise'],
  },
  {
    id: 'hardwood-single-image',
    auditReference:
      'LLM-001: "Hardwood Throughout" claimed when only 1 image is available',
    description:
      'LLM emits Hardwood Throughout with imageCount 1 — must drop (claim requires multi-room evidence)',
    input: {
      imageCount: 1,
      hasDescription: false,
      hasAmenities: false,
      yearBuilt: 1980,
      lotSizeSqft: 4000,
      price: 600_000,
      bedrooms: 3,
    },
    llmTags: ['Hardwood Throughout', 'Bright & Airy'],
    mustDrop: ['Hardwood Throughout'],
    mustKeep: ['Bright & Airy'],
  },
  {
    id: 'era-mismatch-mcm-on-new-build',
    auditReference: 'LLM-001: era tags applied to wrong year_built',
    description:
      'LLM emits Mid-Century Modern on a 2018 build — must drop (outside era range)',
    input: {
      imageCount: 10,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 2018,
      lotSizeSqft: 5500,
      price: 1_200_000,
      bedrooms: 4,
    },
    llmTags: ['Mid-Century Modern', 'Contemporary Lines'],
    mustDrop: ['Mid-Century Modern'],
    mustKeep: ['Contemporary Lines'],
  },
  {
    id: 'era-null-year-victorian',
    auditReference: 'LLM-001: era tags claimed when year_built is NULL',
    description:
      'LLM emits Victorian Character with year_built null — must drop',
    input: {
      imageCount: 4,
      hasDescription: false,
      hasAmenities: false,
      yearBuilt: null,
      lotSizeSqft: 3000,
      price: 700_000,
      bedrooms: 3,
    },
    llmTags: ['Victorian Character', 'Built-In Character'],
    mustDrop: ['Victorian Character'],
    mustKeep: ['Built-In Character'],
  },
  {
    id: 'first-time-buyer-1m-home',
    auditReference: 'LLM-001: "First-Time Buyer" applied to $1M+ homes',
    description:
      'LLM emits First-Time Buyer on a $1.2M property — must drop (no market context)',
    input: {
      imageCount: 6,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 2014,
      lotSizeSqft: 4200,
      price: 1_200_000,
      bedrooms: 3,
    },
    llmTags: ['First-Time Buyer', 'Bright & Airy'],
    mustDrop: ['First-Time Buyer'],
    mustKeep: ['Bright & Airy'],
  },
  {
    id: 'grounded-mid-century',
    auditReference: 'LLM-001 inverse: era tag survives when year_built fits',
    description:
      'LLM emits Mid-Century Modern on a 1962 build with 6 images — all tags must survive',
    input: {
      imageCount: 6,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 1962,
      lotSizeSqft: 6500,
      price: 1_100_000,
      bedrooms: 3,
    },
    llmTags: ['Mid-Century Modern', 'Hardwood Throughout', 'Garden Paradise'],
    mustDrop: [],
    mustKeep: ['Mid-Century Modern', 'Hardwood Throughout', 'Garden Paradise'],
  },
  {
    id: 'fully-grounded-confidence-high',
    auditReference:
      'CONFIDENCE-001: replace hardcoded 0.85 with input-completeness score',
    description: 'Every input signal present → confidence should be near 1.0',
    input: {
      imageCount: 12,
      hasDescription: true,
      hasAmenities: true,
      yearBuilt: 1992,
      lotSizeSqft: 6000,
      price: 800_000,
      bedrooms: 3,
    },
    llmTags: ['Contemporary Lines', "Chef's Kitchen"],
    mustDrop: [],
    mustKeep: ['Contemporary Lines', "Chef's Kitchen"],
    expectConfidence: { min: 0.95 },
  },
  {
    id: 'starved-input-confidence-low',
    auditReference:
      'CONFIDENCE-001: barren inputs should land below 0.5 so the audit query can filter them',
    description:
      'No description / no amenities / null year+lot / 1 image → confidence < 0.5',
    input: {
      imageCount: 1,
      hasDescription: false,
      hasAmenities: false,
      yearBuilt: null,
      lotSizeSqft: null,
      price: 400_000,
      bedrooms: 2,
    },
    llmTags: ['Cozy & Warm'],
    mustDrop: [],
    mustKeep: ['Cozy & Warm'],
    expectConfidence: { max: 0.5 },
  },
]

/** Per-scenario evaluation result. Returned for report rendering. */
export interface ScenarioEvaluation {
  scenario: VibesScenario
  gating: GateResult
  confidence: number
  passed: boolean
  failures: string[]
}
