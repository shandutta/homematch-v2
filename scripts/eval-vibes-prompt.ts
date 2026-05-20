#!/usr/bin/env tsx
/**
 * Mechanical eval harness for the property-vibes LLM prompt.
 *
 * Loads a fixed set of 10 properties from Supabase by zpid, calls
 * VibesService.generateVibes() once per property with the configured
 * model + imageCap, then scores each output against a four-part
 * mechanical rubric:
 *   + grounding   (+1 per Zillow-specific feature named)
 *   - slop        (-2 per banned phrase substring)
 *   - generic-tag (-1 per generic-spam tag fired)
 *   - repetition  (-1 per duplicate top-3 5-gram beyond first occurrence)
 *
 * The eval prints exactly ONE integer on its last stdout line so the
 * autoresearch loop can extract the metric (`tail -1`). All per-property
 * detail is written to .logs/eval-{timestamp}.json AND
 * .logs/eval-latest.json (overwrite) for inspection.
 *
 * Usage:
 *   pnpm exec tsx scripts/eval-vibes-prompt.ts \
 *     [--model=qwen/qwen3-vl-8b-instruct] \
 *     [--imageCap=40]
 *
 * Required env (sourced from .env.vercel.production.local on devbox):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 *
 * Exit codes:
 *   0   normal completion (low score is NOT a failure)
 *   1   hard infra failure (missing creds, Supabase unreachable)
 */
import { config } from 'dotenv'
config({ path: '.env.vercel.production.local' })
config({ path: '.env.local' })
config()

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

import { propertySchema, type Property } from '@/lib/schemas/property'
import { VibesService } from '@/lib/services/vibes/vibes-service'
import {
  createOpenRouterClient,
  DEFAULT_VIBES_MODEL,
} from '@/lib/services/vibes/openrouter-client'

const EVAL_ZPIDS = [
  '136710364',
  '450237062',
  '18554607',
  '446736795',
  '19397976',
  '15866208',
  '2139404492',
  '455540221',
  '334525430',
  '457253041',
] as const

// -2 per occurrence (case-insensitive substring)
const BANNED_SLOP_PHRASES = [
  'quiet mornings',
  'host sunday dinner',
  'the kind of place where',
  'nobody wants to leave',
  'you host',
  'perfect for',
  "this isn't just",
  'more than just a',
  'morning coffee',
  'sun-drenched',
  'retreat',
  'sanctuary',
  'oasis',
]

// -1 per occurrence when fired as a lifestyle category tag
const GENERIC_SPAM_TAGS = [
  'Growing Family',
  'Pet Paradise',
  'Remote Work Ready',
  'First-Time Buyer',
  'Walkable Neighborhood',
]

interface Args {
  model: string
  imageCap: number
}

function parseArgs(argv: string[]): Args {
  const raw: Record<string, string> = {}
  for (const arg of argv.slice(2)) {
    const eq = arg.indexOf('=')
    if (arg.startsWith('--') && eq > 0) {
      raw[arg.slice(2, eq)] = arg.slice(eq + 1)
    }
  }
  return {
    model: raw.model || 'qwen/qwen3-vl-8b-instruct',
    imageCap: Number.parseInt(raw.imageCap || '40', 10),
  }
}

function collectVibeText(vibes: {
  tagline: string
  vibeStatement: string
  primaryVibes: Array<{ name: string }>
  lifestyleFits: Array<{ category: string; reason: string }>
  notableFeatures: Array<{
    feature: string
    location?: string | undefined
    appealFactor: string
  }>
  emotionalHooks: string[]
  aesthetics: { architecturalStyle: string }
  suggestedTags: string[]
}): string {
  const parts: string[] = [vibes.tagline, vibes.vibeStatement]
  for (const v of vibes.primaryVibes) parts.push(v.name)
  for (const f of vibes.lifestyleFits) {
    parts.push(f.category, f.reason)
  }
  for (const n of vibes.notableFeatures) {
    parts.push(n.feature, n.location || '', n.appealFactor)
  }
  for (const h of vibes.emotionalHooks) parts.push(h)
  parts.push(vibes.aesthetics.architecturalStyle)
  return parts.join('\n')
}

function sqftBracket(sqft: number | null): string | null {
  if (sqft == null) return null
  if (sqft < 1000) return 'under 1000'
  if (sqft < 1500) return '1000'
  if (sqft < 2000) return '1500'
  if (sqft < 3000) return '2000'
  if (sqft < 4000) return '3000'
  return '4000'
}

function scoreGrounding(property: Property, vibeText: string): number {
  const lower = vibeText.toLowerCase()
  let score = 0

  // city name
  if (property.city && lower.includes(property.city.toLowerCase())) score += 1

  // bedroom count (e.g. "3 bedroom", "3-bed", "three bed")
  const bdr = property.bedrooms
  const bedWords = ['one', 'two', 'three', 'four', 'five', 'six']
  if (
    new RegExp(`\\b${bdr}\\s*(-|\\s)?\\s*bed`, 'i').test(vibeText) ||
    (bdr >= 1 && bdr <= 6 && lower.includes(`${bedWords[bdr - 1]} bed`))
  ) {
    score += 1
  }

  // property_type literal (single_family, condo, townhome, …)
  const pt = property.property_type
  if (pt) {
    const ptWords: Record<string, string[]> = {
      single_family: ['single-family', 'single family'],
      condo: ['condo'],
      townhome: ['townhome', 'townhouse'],
      multi_family: ['multi-family', 'multi family', 'duplex'],
      manufactured: ['manufactured', 'mobile home'],
      land: ['lot', 'parcel'],
      other: [],
    }
    for (const word of ptWords[pt] || []) {
      if (lower.includes(word)) {
        score += 1
        break
      }
    }
  }

  // year_built — model has to actually name the year or decade
  if (property.year_built) {
    const yb = property.year_built
    const decade = `${Math.floor(yb / 10) * 10}s`
    if (lower.includes(String(yb)) || lower.includes(decade)) score += 1
  }

  // sqft bracket
  const bracket = sqftBracket(property.square_feet)
  if (bracket && lower.includes(bracket)) score += 1

  // amenity strings (substring match on each)
  if (property.amenities && property.amenities.length > 0) {
    for (const amenity of property.amenities) {
      const a = amenity.toLowerCase()
      if (a.length < 4) continue
      if (lower.includes(a)) score += 1
    }
  }

  // description-derived phrases (any 3+ word substring from description
  // matching word-for-word in the vibe text counts as grounding evidence)
  if (property.description) {
    const desc = property.description.toLowerCase()
    // Take first 200 chars worth of distinctive 3-grams
    const words = desc
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 60)
    let grams3 = 0
    for (let i = 0; i + 2 < words.length && grams3 < 5; i++) {
      const gram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
      if (gram.length < 8) continue
      // Skip generic 3-grams
      if (/\b(the|and|for|with|this|that|home|house)\b/.test(gram)) continue
      if (lower.includes(gram)) {
        score += 1
        grams3 += 1
      }
    }
  }

  return score
}

function scoreSlop(vibeText: string): number {
  const lower = vibeText.toLowerCase()
  let penalty = 0
  for (const phrase of BANNED_SLOP_PHRASES) {
    // Count occurrences (substring, may appear multiple times)
    let idx = 0
    while ((idx = lower.indexOf(phrase, idx)) !== -1) {
      penalty -= 2
      idx += phrase.length
    }
  }
  return penalty
}

function scoreGenericTags(
  lifestyleFits: Array<{ category: string }>,
  suggestedTags: string[]
): number {
  let penalty = 0
  const lifestyleSet = new Set(lifestyleFits.map((f) => f.category))
  for (const tag of GENERIC_SPAM_TAGS) {
    if (lifestyleSet.has(tag)) penalty -= 1
    if (suggestedTags.includes(tag)) penalty -= 1
  }
  return penalty
}

function extractFiveGrams(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
  const grams: string[] = []
  for (let i = 0; i + 4 < words.length; i++) {
    grams.push(words.slice(i, i + 5).join(' '))
  }
  return grams
}

function scoreRepetition(perPropertyTexts: string[]): {
  total: number
  repeatedGrams: Array<{ gram: string; count: number }>
} {
  // Collect 5-grams across all properties. For each gram that fires in
  // >1 property, subtract 1 per repetition past the first occurrence.
  const counts = new Map<string, number>()
  for (const text of perPropertyTexts) {
    const seenInThisText = new Set<string>()
    for (const gram of extractFiveGrams(text)) {
      // Skip very generic 5-grams (mostly stopwords)
      const stopwordRatio =
        gram
          .split(' ')
          .filter((w) =>
            /^(the|a|an|and|or|to|of|in|on|for|with|is|are|that|this|it|its|your|you)$/.test(
              w
            )
          ).length / 5
      if (stopwordRatio >= 0.4) continue
      if (!seenInThisText.has(gram)) {
        seenInThisText.add(gram)
        counts.set(gram, (counts.get(gram) || 0) + 1)
      }
    }
  }

  // Find top-3 most repeated grams (count >= 2)
  const repeated = Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  let penalty = 0
  for (const [, n] of repeated) {
    penalty -= n - 1
  }

  return {
    total: penalty,
    repeatedGrams: repeated.map(([gram, count]) => ({ gram, count })),
  }
}

interface PerPropertyDetail {
  zpid: string
  propertyId: string
  address: string
  city: string
  grounding: number
  slopPenalty: number
  genericTagPenalty: number
  score: number
  tagline: string
  vibeStatement: string
  suggestedTags: string[]
  emotionalHooks: string[]
  error?: string
}

async function loadProperties(): Promise<Property[]> {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) {
    console.error(
      '[eval] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .in('zpid', EVAL_ZPIDS as unknown as string[])

  if (error) {
    console.error('[eval] Supabase fetch failed:', error.message)
    process.exit(1)
  }
  if (!data || data.length === 0) {
    console.error('[eval] No properties found for eval zpids')
    process.exit(1)
  }

  const props: Property[] = []
  for (const row of data) {
    const parsed = propertySchema.safeParse(row)
    if (!parsed.success) {
      console.warn(
        `[eval] Skipping zpid=${row.zpid}: schema parse failed (${parsed.error.message.slice(0, 120)})`
      )
      continue
    }
    props.push(parsed.data)
  }

  // Sort to match EVAL_ZPIDS order for stable logging
  const order = new Map<string, number>(
    (EVAL_ZPIDS as readonly string[]).map((z, i) => [z, i] as [string, number])
  )
  props.sort(
    (a, b) => (order.get(a.zpid ?? '') ?? 0) - (order.get(b.zpid ?? '') ?? 0)
  )
  return props
}

async function main() {
  const args = parseArgs(process.argv)
  const startedAt = new Date().toISOString()

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[eval] Missing OPENROUTER_API_KEY in env')
    process.exit(1)
  }

  const properties = await loadProperties()

  const client = createOpenRouterClient(
    process.env.OPENROUTER_API_KEY,
    args.model
  )
  const service = new VibesService(client)

  const perProperty: PerPropertyDetail[] = []
  const perPropertyTexts: string[] = []
  let totalCostUsd = 0

  for (const property of properties) {
    const zpid = property.zpid || '(no-zpid)'
    try {
      const result = await service.generateVibes(property, {
        model: args.model,
        imageCap: args.imageCap,
      })
      const vibeText = collectVibeText(result.vibes)
      const grounding = scoreGrounding(property, vibeText)
      const slopPenalty = scoreSlop(vibeText)
      const genericTagPenalty = scoreGenericTags(
        result.vibes.lifestyleFits,
        result.vibes.suggestedTags
      )
      const score = grounding + slopPenalty + genericTagPenalty

      totalCostUsd += result.usage.estimatedCostUsd
      perPropertyTexts.push(vibeText)

      perProperty.push({
        zpid,
        propertyId: property.id,
        address: property.address,
        city: property.city,
        grounding,
        slopPenalty,
        genericTagPenalty,
        score,
        tagline: result.vibes.tagline,
        vibeStatement: result.vibes.vibeStatement,
        suggestedTags: result.vibes.suggestedTags,
        emotionalHooks: result.vibes.emotionalHooks,
      })

      console.error(
        `[eval] zpid=${zpid} score=${score} ground=${grounding} slop=${slopPenalty} genericTag=${genericTagPenalty}`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      perProperty.push({
        zpid,
        propertyId: property.id,
        address: property.address,
        city: property.city,
        grounding: 0,
        slopPenalty: 0,
        genericTagPenalty: 0,
        score: 0,
        tagline: '',
        vibeStatement: '',
        suggestedTags: [],
        emotionalHooks: [],
        error: message,
      })
      console.error(`[eval] zpid=${zpid} ERROR: ${message.slice(0, 200)}`)
    }
  }

  const repetition = scoreRepetition(perPropertyTexts)
  const subtotal = perProperty.reduce((acc, p) => acc + p.score, 0)
  const finalScore = subtotal + repetition.total

  const logsDir = path.join(process.cwd(), '.logs')
  await fs.mkdir(logsDir, { recursive: true })
  const timestamp = startedAt.replace(/[:.]/g, '-')
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    args,
    model: args.model || DEFAULT_VIBES_MODEL,
    score: finalScore,
    subtotal,
    repetition,
    totalCostUsd,
    perProperty,
  }
  const reportPath = path.join(logsDir, `eval-${timestamp}.json`)
  const latestPath = path.join(logsDir, 'eval-latest.json')
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  await fs.writeFile(latestPath, JSON.stringify(report, null, 2))

  console.error(
    `[eval] subtotal=${subtotal} repetitionPenalty=${repetition.total} totalCost=$${totalCostUsd.toFixed(4)} report=${reportPath}`
  )

  // Last line of stdout MUST be the integer score (autoresearch reads `tail -1`).
  process.stdout.write(`${finalScore}\n`)
}

main().catch((err) => {
  console.error('[eval] Fatal:', err)
  process.exit(1)
})
