/**
 * LLM-001 output gating + real confidence scoring for property_vibes.
 *
 * The audit (Section 1 of qa-report-prod-2026-05-13-full-tour.md) found the
 * LLM was emitting confident claims that the input data physically could not
 * support. The chief offenders, in order of volume:
 *
 *   - "Walkable Neighborhood" (4,663 uses) — no walkability data exists
 *   - "Remote Work Ready" (6,469 uses) — pure interpretation
 *   - "Pet Paradise" (4,120 uses) — only lot_size_sqft proxy
 *   - "Growing Family" (4,328 uses) — only bedroom count
 *   - "Quiet Cul-de-sac" (880 uses) — no street-geometry data
 *   - "First-Time Buyer" — applied to $1M+ homes
 *   - "Hardwood Throughout" (1,987 uses) — image-dependent; 86% of properties
 *     had only 1 image, so the LLM cannot truthfully claim "throughout"
 *   - "Mid-Century Modern" / "Ranch Style" / etc. — claimed when year_built
 *     is NULL
 *
 * This module gates the suggested_tags array against the actually-available
 * input signals BEFORE the row is persisted. Tags requiring a signal that's
 * absent are dropped. The gating is data-driven so new rules are a one-line
 * addition.
 *
 * Also exports `computeConfidence` which replaces the hardcoded `0.85`
 * confidence with a real value computed from input completeness, and
 * `dedupeEmotionalHooks` which drops the templated repeat-prose findings
 * surfaced in the audit (LLM-TEMPLATING-001).
 */

interface GatingInput {
  imageCount: number
  hasDescription: boolean
  hasAmenities: boolean
  yearBuilt: number | null
  lotSizeSqft: number | null
  price: number
  bedrooms: number
}

/**
 * Tags that require input data the catalog doesn't carry. Dropped
 * unconditionally until those signals are wired in. Listed here as a single
 * source of truth — the audit report references this exact set.
 */
export const ALWAYS_DROPPED_TAGS = new Set<string>([
  // Neighborhood / walkability data is not in input_data; would need a
  // Walk Score / transit / amenity-density signal.
  'Walkable Neighborhood',
  'Quiet Cul-de-sac',
  'Urban Edge',
  'Urban Rooftop',
  // Lifestyle inferences from no signal: no school data, no remote-work
  // data, no household composition data, no age data.
  'Remote Work Ready',
  'Growing Family',
  'Empty Nester',
  'Multi-Gen Living',
  // Market context inferences: needs city-median price comparison, which
  // the LLM doesn't see.
  'First-Time Buyer',
  'Investment Property',
])

/**
 * Tags that require visual inspection across multiple rooms. Gated on
 * `image_count >= 4` — with one photo, claims like "Hardwood Throughout"
 * cannot be substantiated.
 */
export const MULTI_IMAGE_REQUIRED_TAGS = new Set<string>([
  'Hardwood Throughout',
  'Open Concept Flow',
  'Indoor-Outdoor Flow',
  'Built-In Character',
  'Natural Light Filled',
  'Gallery-Ready Walls',
])

const MIN_IMAGES_FOR_MULTI_ROOM = 4

/**
 * Tags that require a meaningful outdoor space. Gated on
 * `lot_size_sqft >= 2000`.
 */
export const LOT_DEPENDENT_TAGS = new Set<string>([
  'Pet Paradise',
  "Entertainer's Yard",
  'Private Oasis',
  'Garden Paradise',
  'Wraparound Porch',
  'Porch Life Central',
])

const MIN_LOT_SQFT_FOR_YARD = 2000

/**
 * Architectural-style tags that map to a year range. The LLM cannot
 * truthfully claim "Mid-Century Modern" if year_built is NULL or outside
 * the era. Era windows are intentionally generous (decade-wide bands).
 */
export const ERA_TAG_RANGES: Record<string, [number, number]> = {
  'Victorian Character': [1840, 1910],
  'Art Deco Flair': [1920, 1945],
  'Mid-Century Modern': [1945, 1975],
  'Ranch Style': [1945, 1985],
  'Cape Cod Classic': [1700, 1960],
  'Colonial Elegance': [1700, 1830],
  'Spanish Revival': [1900, 1940],
  'Tudor Elements': [1880, 1940],
  'Prairie Style': [1895, 1925],
  'Craftsman Details': [1900, 1930],
  'Brownstone Beauty': [1840, 1920],
}

export interface GateResult {
  kept: string[]
  dropped: Array<{ tag: string; reason: string }>
}

/**
 * Apply the gating rules to a tags array. Returns the filtered set plus a
 * structured breakdown of what was dropped and why (useful for logging /
 * evals / regression assertion).
 */
export function gateTagsAgainstInput(
  tags: string[] | null | undefined,
  input: GatingInput
): GateResult {
  if (!Array.isArray(tags) || tags.length === 0) {
    return { kept: [], dropped: [] }
  }

  const kept: string[] = []
  const dropped: Array<{ tag: string; reason: string }> = []

  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      dropped.push({ tag: String(tag), reason: 'empty or non-string tag' })
      continue
    }
    const trimmed = tag.trim()

    if (ALWAYS_DROPPED_TAGS.has(trimmed)) {
      dropped.push({
        tag: trimmed,
        reason:
          'requires neighborhood / walkability / market / lifestyle signal not in input_data',
      })
      continue
    }

    if (
      MULTI_IMAGE_REQUIRED_TAGS.has(trimmed) &&
      input.imageCount < MIN_IMAGES_FOR_MULTI_ROOM
    ) {
      dropped.push({
        tag: trimmed,
        reason: `requires >= ${MIN_IMAGES_FOR_MULTI_ROOM} images for multi-room claim; got ${input.imageCount}`,
      })
      continue
    }

    if (LOT_DEPENDENT_TAGS.has(trimmed)) {
      const lot = input.lotSizeSqft ?? 0
      if (lot < MIN_LOT_SQFT_FOR_YARD) {
        dropped.push({
          tag: trimmed,
          reason: `requires lot_size_sqft >= ${MIN_LOT_SQFT_FOR_YARD}; got ${lot}`,
        })
        continue
      }
    }

    const eraRange = ERA_TAG_RANGES[trimmed]
    if (eraRange) {
      const year = input.yearBuilt
      if (year === null) {
        dropped.push({
          tag: trimmed,
          reason: `era-specific tag requires year_built; got null`,
        })
        continue
      }
      const [start, end] = eraRange
      if (year < start || year > end) {
        dropped.push({
          tag: trimmed,
          reason: `era tag requires year_built in [${start}, ${end}]; got ${year}`,
        })
        continue
      }
    }

    kept.push(trimmed)
  }

  return { kept, dropped }
}

/**
 * Compute a real per-property confidence score from input completeness.
 * Higher = more input signals present.
 *
 * Replaces the prior `confidence: 0.85` hardcoded constant which was the
 * same value on every row, providing zero filterability and falsely
 * implying the model was calibrating per-property.
 *
 * Scale: 0.0 (no signal beyond required fields) → 1.0 (every optional
 * signal present). The audit's outlier-sample plan can now use
 * `WHERE confidence < 0.5` to find under-supported vibes.
 */
export function computeConfidence(input: GatingInput): number {
  const signals: number[] = []
  // Image richness scales 0..1 with diminishing returns past 10 images.
  signals.push(Math.min(input.imageCount / 10, 1))
  signals.push(input.hasDescription ? 1 : 0)
  signals.push(input.hasAmenities ? 1 : 0)
  signals.push(input.yearBuilt === null ? 0 : 1)
  signals.push(input.lotSizeSqft === null || input.lotSizeSqft <= 0 ? 0 : 1)
  const sum = signals.reduce((acc, s) => acc + s, 0)
  const score = sum / signals.length
  // Two decimals; never exactly 0 (keep some floor so empty rows are
  // distinguishable from genuinely absent confidence).
  return Math.max(0.05, Math.round(score * 100) / 100)
}

/**
 * Drop near-duplicate emotional hooks (LLM-TEMPLATING-001 in the audit).
 *
 * The audit found phrases like "Backyard's got room for a firepit. Your
 * friends will thank you." repeating verbatim across multiple unrelated
 * listings. This dedupes after lowercasing and stripping punctuation /
 * whitespace, keeping the first-encountered casing.
 *
 * Per-property only — cross-property templating is a global problem that
 * needs a different fix (cap N occurrences across the whole catalog at
 * generation time). This at least prevents the same beat from appearing
 * twice on the same card.
 */
export function dedupeEmotionalHooks(
  hooks: string[] | null | undefined
): string[] {
  if (!Array.isArray(hooks)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const hook of hooks) {
    if (typeof hook !== 'string') continue
    const trimmed = hook.trim()
    if (!trimmed) continue
    // Normalize: strip apostrophes entirely ("backyard's" → "backyards")
    // but replace other non-alphanumerics with space so "firepit—your"
    // and "firepit. your" both normalize to "firepit your". Stripping
    // every non-alphanumeric without a separator glues words together
    // and hides near-duplicates the EVAL-GATE regression suite expects
    // to catch.
    const normalized = trimmed
      .toLowerCase()
      .replace(/['‘’]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(trimmed)
  }
  return out
}
