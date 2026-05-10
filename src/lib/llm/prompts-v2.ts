import type { MatchCandidateProperty, MatchPreferences } from './types'

/**
 * V2 system prompt — more structured than V1.
 *
 * Key improvements over V1:
 * - Explicit scoring rubric with per-dimension weights (adds up to 100 pts).
 * - Dedicated <user_preferences> and <property_features> XML sections so the
 *   model always receives data in a predictable layout.
 * - Stricter output contract with a top-level "meta" block that includes the
 *   prompt version, scoring breakdown, and elapsed_ms placeholder.
 * - Expanded citation field enum (adds "zip_code", "state").
 * - Clearer must-have vs nice-to-have penalty semantics.
 */
export const SYSTEM_PROMPT_V2 = `You are HomeMatch's property ranking assistant (prompt v2).

## Role
Rank a set of candidate homes against a household's stated preferences and return a strict JSON object with a structured scoring breakdown.

## Scoring Rubric (0-100 scale)
Each property receives a TOTAL score from 0 to 100 derived from the following dimensions. Apply the weights exactly as listed.

| Dimension          | Max Points | Hard requirement? |
|--------------------|------------|-------------------|
| Budget fit         | 30         | Yes               |
| Bedrooms fit       | 20         | Yes               |
| Bathrooms fit      | 10         | Yes               |
| Home type match    | 15         | Yes               |
| Location match     | 10         | No                |
| Must-have amenities| 10         | Yes (per missing) |
| Nice-to-have       | 5          | No                |

Scoring notes:
- Budget: 30 pts if price <= price_max AND price >= price_min. Deduct 10 pts per 5 % over price_max (floor 0). If price_max absent, award full 30 pts.
- Bedrooms: 20 pts if bedrooms >= bedrooms_min AND bedrooms <= bedrooms_max. Deduct 10 pts per bedroom short of minimum.
- Bathrooms: 10 pts if bathrooms >= bathrooms_min. Deduct 5 pts per 0.5 bath short.
- Home type: 15 pts if property_type in preferred list (or no preference). 0 pts otherwise.
- Location: 10 pts if city in preferred_cities (or no preference). Partial: 5 pts if state matches.
- Must-have amenities: award 10/N pts per matched must-have (N = count of must-haves). Deduct 10/N pts per missing must-have (floor 0).
- Nice-to-have amenities: 1 pt per matched nice-to-have (max 5 pts total).
- Final TOTAL = sum of dimension scores, clamped to [0, 100].

## Grounding Rules (non-negotiable)
1. GROUND every claim. You may only cite facts that appear verbatim in the candidate data. Never invent prices, square footage, amenities, schools, neighborhoods, or commute times.
2. CITE evidence. Each ranked property must include at least one citation with the source field name and the literal value from the candidate.
3. EXPLAIN concerns. If a property misses a hard preference, list it under "concerns". Do not silently downgrade.
4. NO PII. Do not echo emails, phone numbers, URLs, or names of individuals.
5. STRICT JSON. Output exactly one JSON object matching the schema below. No markdown fences, no prose outside the JSON.

## Output Schema
{
  "meta": {
    "prompt_version": "2",
    "scored_count": <integer — number of candidates scored>,
    "returned_count": <integer — number of entries in ranked array>
  },
  "ranked": [
    {
      "property_id": "<uuid>",
      "rank": <integer, 1-based, best first>,
      "score": <integer 0-100>,
      "score_breakdown": {
        "budget": <0-30>,
        "bedrooms": <0-20>,
        "bathrooms": <0-10>,
        "home_type": <0-15>,
        "location": <0-10>,
        "must_have_amenities": <0-10>,
        "nice_to_have_amenities": <0-5>
      },
      "rationale": "<2-4 sentences grounded in citations>",
      "citations": [
        { "field": "price|bedrooms|bathrooms|square_feet|property_type|amenities|year_built|city|state|zip_code|description", "evidence": "<literal value>" }
      ],
      "concerns": ["<missing hard preference, if any>"]
    }
  ]
}

If candidates is empty, return {"meta":{"prompt_version":"2","scored_count":0,"returned_count":0},"ranked":[]}.`

export interface BuildUserPromptV2Args {
  preferences: MatchPreferences
  candidates: MatchCandidateProperty[]
  topK: number
}

export function buildUserPromptV2({
  preferences,
  candidates,
  topK,
}: BuildUserPromptV2Args): string {
  const k = Math.min(topK, candidates.length)

  const prefBlock = buildPreferencesBlock(preferences)
  const candBlock = buildCandidatesBlock(candidates)

  return [
    `## Task`,
    `Score and rank the top ${k} of the ${candidates.length} candidate properties below.`,
    `Follow the scoring rubric in the system prompt exactly.`,
    ``,
    `<user_preferences>`,
    prefBlock,
    `</user_preferences>`,
    ``,
    `<property_candidates count="${candidates.length}">`,
    candBlock,
    `</property_candidates>`,
    ``,
    `Return the top ${k} entries ordered by score descending (rank 1 = best fit).`,
    `Output only valid JSON — no markdown, no prose outside the JSON object.`,
  ].join('\n')
}

function buildPreferencesBlock(prefs: MatchPreferences): string {
  const lines: string[] = []

  // Budget
  if (typeof prefs.price_min === 'number' || typeof prefs.price_max === 'number') {
    const min = typeof prefs.price_min === 'number' ? `$${prefs.price_min.toLocaleString()}` : 'no min'
    const max = typeof prefs.price_max === 'number' ? `$${prefs.price_max.toLocaleString()}` : 'no max'
    lines.push(`Budget: ${min} – ${max}`)
  } else {
    lines.push(`Budget: no preference`)
  }

  // Bedrooms
  if (typeof prefs.bedrooms_min === 'number' || typeof prefs.bedrooms_max === 'number') {
    const min = typeof prefs.bedrooms_min === 'number' ? prefs.bedrooms_min : 'any'
    const max = typeof prefs.bedrooms_max === 'number' ? prefs.bedrooms_max : 'any'
    lines.push(`Bedrooms: ${min} – ${max}`)
  }

  // Bathrooms
  if (typeof prefs.bathrooms_min === 'number' || typeof prefs.bathrooms_max === 'number') {
    const min = typeof prefs.bathrooms_min === 'number' ? prefs.bathrooms_min : 'any'
    const max = typeof prefs.bathrooms_max === 'number' ? prefs.bathrooms_max : 'any'
    lines.push(`Bathrooms: ${min} – ${max}`)
  }

  // Square feet
  if (typeof prefs.square_feet_min === 'number') {
    lines.push(`Min square feet: ${prefs.square_feet_min.toLocaleString()}`)
  }

  // Home types
  if (prefs.property_types && prefs.property_types.length > 0) {
    lines.push(`Preferred home types: ${prefs.property_types.join(', ')}`)
  }

  // Location
  if (prefs.preferred_cities && prefs.preferred_cities.length > 0) {
    lines.push(`Preferred cities: ${prefs.preferred_cities.join(', ')}`)
  }

  // Must-haves
  if (prefs.must_have_amenities && prefs.must_have_amenities.length > 0) {
    lines.push(`Must-have amenities: ${prefs.must_have_amenities.join(', ')}`)
  }

  // Nice-to-haves
  if (prefs.nice_to_have_amenities && prefs.nice_to_have_amenities.length > 0) {
    lines.push(`Nice-to-have amenities: ${prefs.nice_to_have_amenities.join(', ')}`)
  }

  // Free-text context
  if (prefs.free_text) {
    lines.push(`Additional context: ${prefs.free_text}`)
  }

  return lines.map((l) => `  ${l}`).join('\n')
}

function buildCandidatesBlock(candidates: MatchCandidateProperty[]): string {
  return candidates
    .map((c) =>
      [
        `  <property id="${c.id}">`,
        `    address: ${c.address}, ${c.city}, ${c.state} ${c.zip_code}`,
        `    price: $${c.price.toLocaleString()}`,
        `    bedrooms: ${c.bedrooms}`,
        `    bathrooms: ${c.bathrooms}`,
        `    square_feet: ${c.square_feet ?? 'unknown'}`,
        `    property_type: ${c.property_type ?? 'unknown'}`,
        `    year_built: ${c.year_built ?? 'unknown'}`,
        `    amenities: ${c.amenities && c.amenities.length > 0 ? c.amenities.join(', ') : 'none listed'}`,
        c.description ? `    description: ${c.description.slice(0, 500)}` : null,
        `  </property>`,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n')
}
