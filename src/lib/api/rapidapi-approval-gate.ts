/**
 * Paid Zillow / RapidAPI provider approval gate.
 *
 * The current Zillow listing provider routes call an unofficial paid
 * RapidAPI host (`us-housing-market-data1.p.rapidapi.com`) per the
 * 2026-05-08 provider evaluation report. Until owner approval explicitly
 * promotes that path, no autonomous worker may issue billable calls just
 * because `RAPIDAPI_KEY` happens to be present in the environment.
 *
 * The gate is a single env var, `HOMEMATCH_ALLOW_PAID_RAPIDAPI`, that must
 * equal `1` or `true` (case-insensitive, trimmed) for the paid provider
 * routes to proceed. Anything else fails closed.
 *
 * This file does NOT issue any outbound call. It only inspects the env.
 */

export const RAPIDAPI_PAID_APPROVAL_ENV = 'HOMEMATCH_ALLOW_PAID_RAPIDAPI'

export const RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE =
  'Paid RapidAPI Zillow provider call requires explicit owner approval before production use'

const APPROVED_TOKENS: ReadonlySet<string> = new Set(['1', 'true'])

export function isPaidRapidApiApproved(): boolean {
  const raw = process.env[RAPIDAPI_PAID_APPROVAL_ENV]
  if (typeof raw !== 'string') return false
  return APPROVED_TOKENS.has(raw.trim().toLowerCase())
}

export function assertPaidRapidApiApprovalOrThrow(): void {
  if (!isPaidRapidApiApproved()) {
    throw new Error(RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE)
  }
}
