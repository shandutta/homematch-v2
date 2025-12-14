import { type NeighborhoodVibesOutput } from '@/lib/schemas/neighborhood-vibes'

export interface NeighborhoodContext {
  neighborhoodId: string
  name: string
  city: string
  state: string
  metroArea?: string | null
  medianPrice?: number | null
  walkScore?: number | null
  transitScore?: number | null
  sampleProperties: Array<{
    address: string
    price?: number | null
    bedrooms?: number | null
    bathrooms?: number | null
    propertyType?: string | null
  }>
}

export function buildNeighborhoodVibePrompt(context: NeighborhoodContext): {
  systemPrompt: string
  userPrompt: string
} {
  const { name, city, state, metroArea, medianPrice, walkScore, transitScore } =
    context

  const stats: string[] = []
  if (medianPrice)
    stats.push(`Median price: $${Math.round(medianPrice).toLocaleString()}`)
  if (walkScore != null) stats.push(`Walk Score: ${walkScore}`)
  if (transitScore != null) stats.push(`Transit Score: ${transitScore}`)
  if (metroArea) stats.push(`Metro area: ${metroArea}`)

  const sampleProps = context.sampleProperties
    .slice(0, 12)
    .map((p) =>
      [
        p.address,
        p.price ? `$${Math.round(p.price).toLocaleString()}` : null,
        p.bedrooms ? `${p.bedrooms}bd` : null,
        p.bathrooms ? `${p.bathrooms}ba` : null,
        p.propertyType,
      ]
        .filter(Boolean)
        .join(' · ')
    )
    .filter(Boolean)

  const systemPrompt = `You are a real-estate storyteller who creates short, vivid neighborhood vibes.
- Keep it concise and concrete—avoid generic phrases.
- Write in a friendly, confident tone that feels like a local showing a friend around.
- Avoid overhyping or making up attractions. Use the provided context only.`

  const userPrompt = `Neighborhood: ${name} (${city}, ${state})
${stats.length ? `Stats: ${stats.join(' | ')}` : 'Stats: n/a'}
Sample listings (for texture, not for sales copy):
${sampleProps.length ? sampleProps.map((p) => `- ${p}`).join('\n') : '- No listings available, focus on location vibe'}

Return JSON strictly matching this shape:
{
  "tagline": "short hook (8-140 chars)",
  "vibeStatement": "1-2 sentence feel of daily life here",
  "neighborhoodThemes": [
    {"name": "theme", "whyItMatters": "reason", "intensity": 0.0-1.0}
  ],
  "localHighlights": [
    {"name": "spot or perk", "category": "e.g. food, nature, commute, culture", "whyItMatters": "specific benefit"}
  ],
  "residentFits": [
    {"profile": "who thrives here", "reason": "why"}
  ],
  "suggestedTags": ["3-8 short tags"]
}`

  return { systemPrompt, userPrompt }
}

export type NeighborhoodVibePromptResult = NeighborhoodVibesOutput
