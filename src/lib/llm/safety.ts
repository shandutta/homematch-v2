import {
  matchRequestSchema,
  type MatchCandidateProperty,
  type MatchPreferences,
  type MatchRequest,
} from './types'

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g
const CREDIT_CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g
const URL_RE = /\bhttps?:\/\/\S+/gi

const REDACTION = '[REDACTED]'

/**
 * Strip PII from a free-text string before sending it to an LLM.
 * Order matters: SSN/credit-card patterns are matched before phone numbers
 * because they overlap on shorter digit runs.
 */
export function redactPII(input: string): string {
  if (!input) return input
  return input
    .replace(URL_RE, REDACTION)
    .replace(EMAIL_RE, REDACTION)
    .replace(SSN_RE, REDACTION)
    .replace(CREDIT_CARD_RE, REDACTION)
    .replace(PHONE_RE, REDACTION)
}

function redactPreferences(prefs: MatchPreferences): MatchPreferences {
  return {
    ...prefs,
    free_text: prefs.free_text ? redactPII(prefs.free_text) : prefs.free_text,
  }
}

function redactCandidate(
  candidate: MatchCandidateProperty
): MatchCandidateProperty {
  return {
    ...candidate,
    description: candidate.description
      ? redactPII(candidate.description)
      : candidate.description,
  }
}

/**
 * Validate the incoming MatchRequest, then redact PII from free-text fields
 * (preferences.free_text and candidate descriptions). Structured fields
 * (price, address, etc.) are left intact — they are required for grounding.
 */
export function validateAndRedact(input: unknown): MatchRequest {
  const parsed = matchRequestSchema.parse(input)
  return {
    ...parsed,
    preferences: redactPreferences(parsed.preferences),
    candidates: parsed.candidates.map(redactCandidate),
  }
}
