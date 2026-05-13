/**
 * NEIGHBORHOOD-VIBES-WIRE — build a per-property neighborhood context map
 * to feed into the property-vibes LLM prompt.
 *
 * The property-vibes prompt previously asked the LLM to guess at location
 * tags ("Walkable Neighborhood", "Transit Friendly", etc.) with no actual
 * neighborhood signal in its input — which is the root cause of the
 * thousands of unsupported location tags surfaced in the prod audit
 * (qa-report-prod-2026-05-13-full-tour.md, Section 1 / LLM-001).
 *
 * 12,730 properties have a neighborhood_id and 515 neighborhood_vibes
 * rows exist; this module joins them and produces the
 * `NeighborhoodVibesContext` shape that prompts.ts expects, so the LLM
 * gets the grounded neighborhood signal (themes, highlights, walk /
 * transit scores) instead of inventing it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { NeighborhoodVibesContext } from './prompts'

type NeighborhoodVibesContextMap = Map<string, NeighborhoodVibesContext | null>

interface PropertyForNeighborhoodLookup {
  id: string
  neighborhood_id: string | null
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null

const asNumber = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const parseThemes = (raw: unknown): NeighborhoodVibesContext['themes'] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isRecord)
    .map((r) => {
      const name = asString(r.name)
      const why = asString(r.whyItMatters)
      return name && why ? { name, whyItMatters: why } : null
    })
    .filter((t): t is NeighborhoodVibesContext['themes'][number] => Boolean(t))
}

const parseHighlights = (
  raw: unknown
): NeighborhoodVibesContext['localHighlights'] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isRecord)
    .map((r) => {
      const name = asString(r.name)
      const category = asString(r.category)
      const why = asString(r.whyItMatters)
      return name && category && why
        ? { name, category, whyItMatters: why }
        : null
    })
    .filter((h): h is NeighborhoodVibesContext['localHighlights'][number] =>
      Boolean(h)
    )
}

const parseFits = (raw: unknown): NeighborhoodVibesContext['residentFits'] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isRecord)
    .map((r) => {
      const profile = asString(r.profile)
      const reason = asString(r.reason)
      return profile && reason ? { profile, reason } : null
    })
    .filter((f): f is NeighborhoodVibesContext['residentFits'][number] =>
      Boolean(f)
    )
}

/**
 * Builds a Map<propertyId, NeighborhoodVibesContext | null> for the given
 * properties. Properties without a `neighborhood_id`, or whose neighborhood
 * has no vibes row, are skipped (no map entry written) — callers should
 * treat absence as "no neighborhood signal available".
 *
 * Service-role caller responsibility: this helper trusts the passed
 * Supabase client to have whatever access it needs. In the admin
 * generate-vibes routes that's the standalone (service-role) client.
 */
export async function buildNeighborhoodContextMap(
  supabase: SupabaseClient<Database>,
  properties: PropertyForNeighborhoodLookup[]
): Promise<NeighborhoodVibesContextMap> {
  const out: NeighborhoodVibesContextMap = new Map()

  const neighborhoodIds = Array.from(
    new Set(
      properties
        .map((p) => p.neighborhood_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )
  if (neighborhoodIds.length === 0) return out

  // Propagate Supabase errors instead of falling through to an empty
  // neighborhood map — a silent failure here would re-introduce the
  // ungrounded LOCATION tags that this module exists to prevent (Codex
  // review feedback on PR #41).
  const [vibesResult, neighborhoodsResult] = await Promise.all([
    supabase
      .from('neighborhood_vibes')
      .select(
        'neighborhood_id, tagline, neighborhood_themes, local_highlights, resident_fits'
      )
      .in('neighborhood_id', neighborhoodIds),
    supabase
      .from('neighborhoods')
      .select('id, name, walk_score, transit_score')
      .in('id', neighborhoodIds),
  ])

  if (vibesResult.error) {
    throw new Error(
      `Failed to load neighborhood_vibes: ${vibesResult.error.message}`
    )
  }
  if (neighborhoodsResult.error) {
    throw new Error(
      `Failed to load neighborhoods: ${neighborhoodsResult.error.message}`
    )
  }

  const vibesRows = vibesResult.data
  const neighborhoodRows = neighborhoodsResult.data

  const neighborhoodMeta = new Map<
    string,
    { name: string; walkScore: number | null; transitScore: number | null }
  >()
  for (const row of neighborhoodRows ?? []) {
    if (typeof row.id !== 'string') continue
    neighborhoodMeta.set(row.id, {
      name: typeof row.name === 'string' ? row.name : 'this neighborhood',
      walkScore: asNumber(row.walk_score),
      transitScore: asNumber(row.transit_score),
    })
  }

  const contextByNeighborhood = new Map<string, NeighborhoodVibesContext>()
  for (const row of vibesRows ?? []) {
    if (typeof row.neighborhood_id !== 'string') continue
    const meta = neighborhoodMeta.get(row.neighborhood_id)
    contextByNeighborhood.set(row.neighborhood_id, {
      neighborhoodName: meta?.name ?? 'this neighborhood',
      tagline: typeof row.tagline === 'string' ? row.tagline : '',
      themes: parseThemes(row.neighborhood_themes),
      localHighlights: parseHighlights(row.local_highlights),
      residentFits: parseFits(row.resident_fits),
      walkScore: meta?.walkScore ?? null,
      transitScore: meta?.transitScore ?? null,
    })
  }

  for (const property of properties) {
    if (!property.neighborhood_id) continue
    const ctx = contextByNeighborhood.get(property.neighborhood_id)
    if (ctx) out.set(property.id, ctx)
  }

  return out
}
