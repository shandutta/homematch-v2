import type { MatchCandidateProperty, MatchPreferences } from './types'

export const SYSTEM_PROMPT = `You are HomeMatch's property ranking assistant.

Your job: rank a candidate set of homes against a household's stated preferences and return a strict JSON object.

Rules — non-negotiable:
1. GROUND every claim. You may only cite facts that appear verbatim in the candidate JSON. Never invent prices, square footage, amenities, schools, neighborhoods, or commute times.
2. CITE evidence. Each ranked property must include at least one citation with the source field name and the literal value you read from the candidate.
3. SCORE conservatively. Use 0.0–1.0. Reserve >=0.85 for properties that match all hard preferences (price, beds, baths, property_type) AND at least one nice-to-have.
4. EXPLAIN concerns. If a property misses a hard preference, list it under "concerns" — do not silently downgrade.
5. NO PII. Do not echo emails, phone numbers, URLs, or names of individuals from descriptions.
6. STRICT JSON. Output exactly one JSON object matching the requested schema. No markdown fences, no prose outside the JSON.

If candidates is empty, return {"ranked": []}.`

export interface BuildUserPromptArgs {
  preferences: MatchPreferences
  candidates: MatchCandidateProperty[]
  topK: number
}

export function buildUserPrompt({
  preferences,
  candidates,
  topK,
}: BuildUserPromptArgs): string {
  const k = Math.min(topK, candidates.length)
  return [
    `Rank the top ${k} candidates by fit against these preferences.`,
    '',
    'PREFERENCES (JSON):',
    JSON.stringify(preferences, null, 2),
    '',
    `CANDIDATES (JSON, ${candidates.length} items):`,
    JSON.stringify(candidates, null, 2),
    '',
    'Return JSON of the form:',
    '{',
    '  "ranked": [',
    '    {',
    '      "property_id": "<uuid from candidates>",',
    '      "rank": 1,',
    '      "score": 0.0-1.0,',
    '      "rationale": "<2-3 sentences, grounded in citations>",',
    '      "citations": [',
    '        { "field": "price|bedrooms|bathrooms|square_feet|property_type|amenities|year_built|city|description", "evidence": "<literal value from candidate>" }',
    '      ],',
    '      "concerns": ["<missing hard preference, if any>"]',
    '    }',
    '  ]',
    '}',
    '',
    `Return at most ${k} entries, ordered by rank ascending (best first).`,
  ].join('\n')
}
