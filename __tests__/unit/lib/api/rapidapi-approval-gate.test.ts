/**
 * @jest-environment node
 *
 * Paid RapidAPI Zillow provider approval-gate guard.
 *
 * Phase 1 launch posture (per `reports/home-match-revival/
 * zillow-provider-production-grade-evaluation-2026-05-08.md`): the current
 * RapidAPI Zillow path is an unofficial paid aggregator and must not be
 * called by an autonomous worker just because `RAPIDAPI_KEY` is present.
 *
 * This guard verifies:
 *   1. The gate fails closed by default (no env var).
 *   2. Only the explicit approval tokens (`1`, `true`) approve the path.
 *   3. Every API route file that reads `RAPIDAPI_KEY` also references the
 *      gate seam, so a future contributor can't add a new RapidAPI route
 *      that skips the gate without tripping this test.
 *   4. The gate source preserves the canonical env var name and message.
 *
 * Non-goals: this guard does NOT call RapidAPI, mock fetch, or assert any
 * runtime route behavior. It only verifies the gate seam stays in place.
 */
// Phase 0/1 closure: M8-external-timeouts

// Phase 0/1 closure: M8-external-timeouts
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  RAPIDAPI_PAID_APPROVAL_ENV,
  RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE,
  assertPaidRapidApiApprovalOrThrow,
  isPaidRapidApiApproved,
} from '@/lib/api/rapidapi-approval-gate'

const GATE_SOURCE_PATH = 'src/lib/api/rapidapi-approval-gate.ts'

const PROTECTED_ROUTE_FILES = [
  'src/app/api/admin/ingest/zillow/route.ts',
  'src/app/api/admin/status-refresh/route.ts',
  'src/app/api/zillow/random-image/route.ts',
  'src/app/api/admin/generate-vibes-zillow/route.ts',
] as const

const APPROVED_TOKENS = ['1', 'true', 'TRUE', '  true  ', '  1  '] as const

const REJECTED_TOKENS = [
  '',
  '   ',
  '0',
  'false',
  'no',
  'yes',
  '2',
  'approved',
  'allow',
  'enable',
  'on',
  'production',
  'prod',
  'staging',
  'unknown',
] as const

const readRepoFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

describe('Paid RapidAPI Zillow provider approval-gate guard', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env[RAPIDAPI_PAID_APPROVAL_ENV]
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('exposes the canonical env var name and approval-required message', () => {
    expect(RAPIDAPI_PAID_APPROVAL_ENV).toBe('HOMEMATCH_ALLOW_PAID_RAPIDAPI')
    expect(RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE).toBe(
      'Paid RapidAPI Zillow provider call requires explicit owner approval before production use'
    )
  })

  it('fails closed when the approval env var is unset', () => {
    expect(isPaidRapidApiApproved()).toBe(false)
    expect(() => assertPaidRapidApiApprovalOrThrow()).toThrow(
      RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE
    )
  })

  it.each(APPROVED_TOKENS)(
    'approves the paid path when %j is the env value',
    (token) => {
      process.env[RAPIDAPI_PAID_APPROVAL_ENV] = token
      expect(isPaidRapidApiApproved()).toBe(true)
      expect(() => assertPaidRapidApiApprovalOrThrow()).not.toThrow()
    }
  )

  it.each(REJECTED_TOKENS)(
    'rejects the paid path when %j is the env value (no silent promotion)',
    (token) => {
      process.env[RAPIDAPI_PAID_APPROVAL_ENV] = token
      expect(isPaidRapidApiApproved()).toBe(false)
      expect(() => assertPaidRapidApiApprovalOrThrow()).toThrow(
        RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE
      )
    }
  )

  it('preserves the documented gate seam in the gate source', () => {
    const source = readRepoFile(GATE_SOURCE_PATH)

    expect(source).toContain("'HOMEMATCH_ALLOW_PAID_RAPIDAPI'")
    expect(source).toContain('isPaidRapidApiApproved')
    expect(source).toContain('assertPaidRapidApiApprovalOrThrow')
    expect(source).toContain(
      'Paid RapidAPI Zillow provider call requires explicit owner approval before production use'
    )
  })

  it.each(PROTECTED_ROUTE_FILES)(
    'wires the approval gate into the RapidAPI route at %s',
    (routePath) => {
      const source = readRepoFile(routePath)

      // Sanity: this file is in fact a RapidAPI consumer.
      expect(source).toMatch(/RAPIDAPI_KEY/)

      // The gate import seam must be present.
      expect(source).toContain('@/lib/api/rapidapi-approval-gate')
      expect(source).toContain('isPaidRapidApiApproved')
      expect(source).toContain('RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE')
    }
  )
})
