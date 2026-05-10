import { buildUserPrompt, SYSTEM_PROMPT } from './prompts'
import { buildUserPromptV2, SYSTEM_PROMPT_V2 } from './prompts-v2'
import { validateAndRedact } from './safety'
import {
  matchResultSchema,
  rankedPropertySchema,
  type MatchCandidateProperty,
  type MatchPreferences,
  type MatchRequest,
  type MatchResult,
  type RankedProperty,
} from './types'

export interface LLMClient {
  complete(args: {
    system: string
    user: string
    model?: string
  }): Promise<{ content: string; model: string }>
}

export type PromptVersion = '1' | '2'

export interface MatcherOptions {
  llmClient?: LLMClient
  llmEnabled?: boolean
  model?: string
  /** Which prompt template to use. Defaults to "1" (original). Use "2" for the
   *  structured rubric-based prompt with per-dimension score breakdown. */
  promptVersion?: PromptVersion
}

const DEFAULT_MODEL = 'qwen/qwen3-vl-8b-instruct'

function isLLMEnabled(opts: MatcherOptions): boolean {
  if (typeof opts.llmEnabled === 'boolean') return opts.llmEnabled
  return process.env.LLM_ENABLED === 'true'
}

/**
 * Heuristic ranker used when LLM mode is disabled (the default). Produces
 * the same shape as the LLM path so callers can swap modes without changes.
 */
export function mockRank(
  preferences: MatchPreferences,
  candidates: MatchCandidateProperty[],
  topK: number
): RankedProperty[] {
  const scored = candidates.map((candidate) => scoreCandidate(preferences, candidate))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK).map((entry, idx) => ({
    property_id: entry.candidate.id,
    rank: idx + 1,
    score: round(entry.score),
    rationale: entry.rationale,
    citations: entry.citations,
    concerns: entry.concerns,
  }))
}

interface ScoredCandidate {
  candidate: MatchCandidateProperty
  score: number
  rationale: string
  citations: RankedProperty['citations']
  concerns: string[]
}

function scoreCandidate(
  prefs: MatchPreferences,
  c: MatchCandidateProperty
): ScoredCandidate {
  const citations: RankedProperty['citations'] = []
  const concerns: string[] = []
  const hits: string[] = []
  let score = 0.5

  if (typeof prefs.price_max === 'number') {
    if (c.price <= prefs.price_max) {
      score += 0.15
      hits.push(`price within budget ($${c.price.toLocaleString()})`)
      citations.push({ field: 'price', evidence: String(c.price) })
    } else {
      concerns.push(
        `price $${c.price.toLocaleString()} exceeds max $${prefs.price_max.toLocaleString()}`
      )
      score -= 0.2
    }
  }
  if (typeof prefs.price_min === 'number' && c.price < prefs.price_min) {
    concerns.push(
      `price $${c.price.toLocaleString()} below min $${prefs.price_min.toLocaleString()}`
    )
    score -= 0.05
  }

  if (typeof prefs.bedrooms_min === 'number') {
    if (c.bedrooms >= prefs.bedrooms_min) {
      score += 0.1
      hits.push(`${c.bedrooms} bedrooms`)
      citations.push({ field: 'bedrooms', evidence: String(c.bedrooms) })
    } else {
      concerns.push(`${c.bedrooms} bedrooms < min ${prefs.bedrooms_min}`)
      score -= 0.15
    }
  }
  if (
    typeof prefs.bedrooms_max === 'number' &&
    c.bedrooms > prefs.bedrooms_max
  ) {
    concerns.push(`${c.bedrooms} bedrooms > max ${prefs.bedrooms_max}`)
    score -= 0.05
  }

  if (typeof prefs.bathrooms_min === 'number') {
    if (c.bathrooms >= prefs.bathrooms_min) {
      score += 0.05
      hits.push(`${c.bathrooms} bathrooms`)
      citations.push({ field: 'bathrooms', evidence: String(c.bathrooms) })
    } else {
      concerns.push(`${c.bathrooms} bathrooms < min ${prefs.bathrooms_min}`)
      score -= 0.1
    }
  }

  if (
    typeof prefs.square_feet_min === 'number' &&
    c.square_feet !== null
  ) {
    if (c.square_feet >= prefs.square_feet_min) {
      score += 0.05
      hits.push(`${c.square_feet} sqft`)
      citations.push({ field: 'square_feet', evidence: String(c.square_feet) })
    } else {
      concerns.push(
        `${c.square_feet} sqft < min ${prefs.square_feet_min}`
      )
      score -= 0.05
    }
  }

  if (prefs.property_types && prefs.property_types.length > 0) {
    if (c.property_type && prefs.property_types.includes(c.property_type)) {
      score += 0.1
      hits.push(`${c.property_type} matches preferred type`)
      citations.push({ field: 'property_type', evidence: c.property_type })
    } else {
      concerns.push(
        `property_type ${c.property_type ?? 'unknown'} not in preferred list`
      )
      score -= 0.1
    }
  }

  if (prefs.preferred_cities && prefs.preferred_cities.length > 0) {
    if (
      prefs.preferred_cities.some(
        (city) => city.toLowerCase() === c.city.toLowerCase()
      )
    ) {
      score += 0.05
      hits.push(`in ${c.city}`)
      citations.push({ field: 'city', evidence: c.city })
    }
  }

  const candidateAmenities = (c.amenities ?? []).map((a) => a.toLowerCase())
  if (prefs.must_have_amenities && prefs.must_have_amenities.length > 0) {
    const missing = prefs.must_have_amenities.filter(
      (a) => !candidateAmenities.includes(a.toLowerCase())
    )
    const matched = prefs.must_have_amenities.filter((a) =>
      candidateAmenities.includes(a.toLowerCase())
    )
    if (matched.length > 0) {
      score += 0.05 * matched.length
      hits.push(`has ${matched.join(', ')}`)
      citations.push({
        field: 'amenities',
        evidence: matched.join(', '),
      })
    }
    if (missing.length > 0) {
      concerns.push(`missing must-have amenities: ${missing.join(', ')}`)
      score -= 0.1 * missing.length
    }
  }
  if (prefs.nice_to_have_amenities && prefs.nice_to_have_amenities.length > 0) {
    const matched = prefs.nice_to_have_amenities.filter((a) =>
      candidateAmenities.includes(a.toLowerCase())
    )
    if (matched.length > 0) {
      score += 0.03 * matched.length
      hits.push(`bonus: ${matched.join(', ')}`)
      citations.push({
        field: 'amenities',
        evidence: matched.join(', '),
      })
    }
  }

  // Always include at least one citation so the result is grounded.
  if (citations.length === 0) {
    citations.push({ field: 'price', evidence: String(c.price) })
  }

  const rationale =
    hits.length > 0
      ? `Matches: ${hits.join('; ')}.`
      : `Baseline candidate at $${c.price.toLocaleString()} (${c.bedrooms}bd/${c.bathrooms}ba in ${c.city}).`

  return {
    candidate: c,
    score: clamp01(score),
    rationale,
    citations,
    concerns,
  }
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Parse and ground-check an LLM response. Drops any ranked entry whose
 * property_id is not in the candidate set, and renumbers ranks 1..N.
 */
export function parseLLMResponse(
  raw: string,
  candidates: MatchCandidateProperty[],
  topK: number
): RankedProperty[] {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (err) {
    throw new Error(
      `LLM returned non-JSON response: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null
  const root = isRecord(parsed) ? parsed.ranked : null
  if (!Array.isArray(root)) {
    throw new Error('LLM response missing "ranked" array')
  }

  const validIds = new Set(candidates.map((c) => c.id))
  const grounded: RankedProperty[] = []
  for (const entry of root) {
    const result = rankedPropertySchema.safeParse(entry)
    if (!result.success) continue
    if (!validIds.has(result.data.property_id)) continue
    grounded.push(result.data)
  }

  grounded.sort((a, b) => a.rank - b.rank)
  return grounded.slice(0, topK).map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }))
}

/**
 * Main matcher. Validates + redacts the request, then ranks via mock
 * heuristic (default) or via the injected LLM client when LLM_ENABLED=true.
 */
export async function match(
  input: unknown,
  opts: MatcherOptions = {}
): Promise<MatchResult> {
  const request: MatchRequest = validateAndRedact(input)
  const useLLM = isLLMEnabled(opts)

  const version: PromptVersion = opts.promptVersion ?? '1'

  if (!useLLM) {
    const ranked = mockRank(
      request.preferences,
      request.candidates,
      request.top_k
    )
    return matchResultSchema.parse({
      ranked,
      mode: 'mock',
      model: null,
      generated_at: new Date().toISOString(),
      candidate_count: request.candidates.length,
      truncated: ranked.length < request.candidates.length,
      prompt_version: version,
    })
  }

  if (!opts.llmClient) {
    throw new Error('LLM mode enabled but no llmClient was provided')
  }

  const systemPrompt = version === '2' ? SYSTEM_PROMPT_V2 : SYSTEM_PROMPT
  const userPrompt =
    version === '2'
      ? buildUserPromptV2({
          preferences: request.preferences,
          candidates: request.candidates,
          topK: request.top_k,
        })
      : buildUserPrompt({
          preferences: request.preferences,
          candidates: request.candidates,
          topK: request.top_k,
        })

  const model = opts.model || process.env.LLM_MODEL || DEFAULT_MODEL
  const { content, model: usedModel } = await opts.llmClient.complete({
    system: systemPrompt,
    user: userPrompt,
    model,
  })
  const ranked = parseLLMResponse(content, request.candidates, request.top_k)

  return matchResultSchema.parse({
    ranked,
    mode: 'llm',
    model: usedModel,
    generated_at: new Date().toISOString(),
    candidate_count: request.candidates.length,
    truncated: ranked.length < request.candidates.length,
    prompt_version: version,
  })
}
