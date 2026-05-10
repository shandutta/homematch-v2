import {
  matchRequestSchema,
  type MatchCandidateProperty,
  type MatchPreferences,
  type MatchRequest,
  type RankedProperty,
} from './types'

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g
const CREDIT_CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g
const URL_RE = /\bhttps?:\/\/\S+/gi

const REDACTION = '[REDACTED]'

// Prompt injection patterns that an attacker might slip into free-text fields
// to override the system prompt or extract data.
const INJECTION_PATTERNS = [
  /Ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /You\s+are\s+now\s+(an?\s+)?/i,
  /Forget\s+(all\s+)?(previous|your)\s+(instructions|training|prompt)/i,
  /System\s*:\s*You\s+are/i,
  /New\s+system\s+prompt\s*:/i,
  /Override\s+(the\s+)?system\s+(prompt|instructions)/i,
  /Disregard\s+(all\s+)?(your\s+)?(previous\s+)?(instructions|constraints)/i,
  /Act\s+as\s+(if\s+you\s+are|a\s+different)/i,
  /\[INST\]|<<SYS>>|<\/SYS>|\[\/INST\]/, // LLM instruction markers
  /<\|im_start\|>|<\|im_end\|>/, // ChatML markers
  /<system>|<\/system>/, // XML-style injection
  /Output\s+(your\s+)?system\s+prompt/i,
  /Print\s+(your\s+)?instructions/i,
  /Reveal\s+(your\s+)?(system\s+)?prompt/i,
  /What\s+(is|are)\s+your\s+instructions/i,
]

/**
 * Detect prompt injection attempts in free-text input.
 * Returns true if the text contains patterns that attempt to override
 * system instructions or extract the system prompt.
 */
export function detectPromptInjection(input: string): boolean {
  if (!input) return false
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

/**
 * Highest-risk injection patterns that warrant full redaction
 * rather than just detection. When these are matched, the entire
 * free-text field is redacted.
 */
const SEVERE_INJECTION_PATTERNS = [
  /Ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /System\s*:\s*You\s+are/i,
  /New\s+system\s+prompt\s*:/i,
  /\[INST\]|<<SYS>>/,
  /<\|im_start\|>/,
  /<system>/,
]

/**
 * Sanitize free-text by redacting the entire field if it contains
 * severe injection patterns. Otherwise, just redact PII.
 *
 * Returns { sanitized, redacted }: redacted=true means the full
 * field was replaced with REDACTION due to injection risk.
 */
export function sanitizeFreeText(input: string): {
  sanitized: string
  redacted: boolean
} {
  if (!input) return { sanitized: input, redacted: false }

  if (SEVERE_INJECTION_PATTERNS.some((p) => p.test(input))) {
    return { sanitized: REDACTION, redacted: true }
  }

  return { sanitized: redactPII(input), redacted: false }
}

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

/**
 * Scan LLM output for PII that should not be present.
 * Scans the extracted text fields (rationale, concerns, citations)
 * rather than the raw JSON to avoid false positives on UUIDs.
 *
 * Returns the original string if clean, or a redacted version
 * with a warning logged. The output is always returned (never
 * discarded) — callers handle warnings.
 */
export function scanRankedForPII(
  ranked: RankedProperty[]
): { piiWarnings: string[] } {
  const warnings: string[] = []

  for (const entry of ranked) {
    const textToScan = [
      entry.rationale,
      ...entry.concerns,
      ...entry.citations.map((c) => c.evidence),
    ].join('\n')

    if (EMAIL_RE.test(textToScan))
      warnings.push('LLM output contains email address(es)')
    if (PHONE_RE.test(textToScan))
      warnings.push('LLM output contains phone number(s)')
    if (SSN_RE.test(textToScan))
      warnings.push('LLM output contains SSN pattern(s)')
    if (CREDIT_CARD_RE.test(textToScan))
      warnings.push('LLM output contains credit-card pattern(s)')
    if (URL_RE.test(textToScan))
      warnings.push('LLM output contains URL(s)')
  }

  return { piiWarnings: Array.from(new Set(warnings)) }
}

function redactPreferences(prefs: MatchPreferences): MatchPreferences {
  const freeTextResult = prefs.free_text
    ? sanitizeFreeText(prefs.free_text)
    : null
  return {
    ...prefs,
    free_text: freeTextResult ? freeTextResult.sanitized : prefs.free_text,
  }
}

function redactCandidate(
  candidate: MatchCandidateProperty
): MatchCandidateProperty {
  const descResult = candidate.description
    ? sanitizeFreeText(candidate.description)
    : null
  return {
    ...candidate,
    description: descResult
      ? descResult.sanitized
      : candidate.description,
  }
}

/**
 * Validate the incoming MatchRequest, then redact PII and sanitize against
 * prompt injection from free-text fields (preferences.free_text and candidate
 * descriptions). Structured fields (price, address, etc.) are left intact —
 * they are required for grounding.
 */
export function validateAndRedact(input: unknown): MatchRequest {
  const parsed = matchRequestSchema.parse(input)
  return {
    ...parsed,
    preferences: redactPreferences(parsed.preferences),
    candidates: parsed.candidates.map(redactCandidate),
  }
}
