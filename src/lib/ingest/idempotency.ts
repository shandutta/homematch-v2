/**
 * Ingest idempotency: deterministic dedupe keys + content fingerprints.
 *
 * Used by the property ingest pipeline to:
 *   - Collapse duplicate inputs within a single batch (multiple pages of a
 *     Zillow search returning the same listing under different sort orders).
 *   - Detect "no-op" updates so we can skip writes that wouldn't change any
 *     persisted field — protecting Supabase from churn and keeping
 *     `updated_at` meaningful.
 *
 * Deliberately framework-free: no Supabase, no fetch, no Next.js. Pure
 * functions that take a normalized record and return strings.
 */

import * as crypto from 'node:crypto'
import { z } from 'zod'

const trimmedString = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1))

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()

const sourceEnum = z.enum(['zillow', 'mock', 'manual'])

type _IngestSource = z.infer<typeof sourceEnum>

/**
 * Canonical record we feed into the idempotency layer. This is the smallest
 * shape that lets us compute a stable dedupe key and a meaningful content
 * fingerprint — richer ingestion records can extend it.
 */
export const ingestRecordSchema = z.object({
  source: sourceEnum,
  zpid: optionalTrimmedString,
  address: trimmedString,
  city: trimmedString,
  state: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .pipe(z.string().length(2)),
  zip_code: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z.string().regex(/^\d{5}(-\d{4})?$/, 'zip_code must be 5 or 9 digit')
    ),
  price: z.number().min(0),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  square_feet: z.number().min(0).nullable().optional(),
  property_type: z.string().optional(),
  listing_status: z.string().optional(),
  images: z.array(z.string()).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
})

export type IngestRecord = z.infer<typeof ingestRecordSchema>

/**
 * Fields whose change is meaningful enough to write back to the DB. We
 * deliberately exclude `images` from the fingerprint — image URLs from
 * Zillow flap on every request (CDN cache busters) without representing a
 * real listing change. The image-refresh pipeline owns that field.
 */
const FINGERPRINT_FIELDS = [
  'address',
  'city',
  'state',
  'zip_code',
  'price',
  'bedrooms',
  'bathrooms',
  'square_feet',
  'property_type',
  'listing_status',
  'latitude',
  'longitude',
] as const

const ZIP5 = (zip: string): string => zip.slice(0, 5)

const normalizeAddressPart = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Deterministic dedupe key. Prefers the source-supplied `zpid` (the only
 * truly stable cross-batch identifier Zillow gives us); falls back to a
 * normalized address composite when zpid is missing — common for the manual
 * ingest path and for partial Zillow rows that drop the zpid field.
 */
export function computeDedupeKey(
  record: Pick<
    IngestRecord,
    'source' | 'zpid' | 'address' | 'city' | 'state' | 'zip_code'
  >
): string {
  const zpid = record.zpid?.trim()
  if (zpid) {
    return `${record.source}:zpid:${zpid}`
  }
  const composite = [
    normalizeAddressPart(record.address),
    normalizeAddressPart(record.city),
    record.state.trim().toUpperCase(),
    ZIP5(record.zip_code.trim()),
  ].join('|')
  const hash = crypto.createHash('sha1').update(composite).digest('hex')
  return `${record.source}:addr:${hash}`
}

/**
 * Stable hash of the listing-meaningful fields. Two records with the same
 * fingerprint represent the same listing in the same state — even if Zillow
 * shuffled image URLs or the array order of amenities changed. Used to skip
 * no-op upserts.
 *
 * Hash algorithm: sha256 over a JSON-canonicalized payload (sorted keys,
 * stringified numbers normalized via Number()) so the fingerprint is stable
 * across JS engines and serialization round-trips.
 */
export function computeSourceFingerprint(record: IngestRecord): string {
  const payload: Record<string, unknown> = {}
  for (const field of FINGERPRINT_FIELDS) {
    const value = record[field]
    payload[field] = normalizeFingerprintValue(value)
  }
  const canonical = canonicalJson(payload)
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

function normalizeFingerprintValue(value: unknown): unknown {
  if (value === undefined) return null
  if (typeof value === 'string') return value.trim().toLowerCase()
  if (typeof value === 'number') {
    // Zillow sometimes returns 1500.0 vs 1500 — normalize to a finite Number.
    return Number.isFinite(value) ? Number(value) : null
  }
  return value
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }
  // value is a non-null, non-array object at this point
  const entries = Object.entries(value).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  )
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(',')}}`
}

export interface DedupeResult<T extends IngestRecord> {
  unique: T[]
  duplicates: Array<{ record: T; key: string; reason: 'in_batch_duplicate' }>
}

/**
 * Collapse duplicates within a single ingest batch. When two records share a
 * dedupe key we keep the one that carries more populated fields — Zillow's
 * Newest sort and Price sort often emit the same listing with different
 * field coverage, and the richer record is the one we want to persist.
 */
export function dedupeBatch<T extends IngestRecord>(
  records: T[]
): DedupeResult<T> {
  const winners = new Map<string, T>()
  const duplicates: DedupeResult<T>['duplicates'] = []

  for (const record of records) {
    const key = computeDedupeKey(record)
    const incumbent = winners.get(key)
    if (!incumbent) {
      winners.set(key, record)
      continue
    }
    if (countPopulatedFields(record) > countPopulatedFields(incumbent)) {
      duplicates.push({ record: incumbent, key, reason: 'in_batch_duplicate' })
      winners.set(key, record)
    } else {
      duplicates.push({ record, key, reason: 'in_batch_duplicate' })
    }
  }

  return {
    unique: Array.from(winners.values()),
    duplicates,
  }
}

function countPopulatedFields(record: IngestRecord): number {
  let count = 0
  for (const value of Object.values(record)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.trim().length === 0) continue
    if (Array.isArray(value) && value.length === 0) continue
    count += 1
  }
  return count
}

/**
 * Persisted shape of the dedupe state we care about for cross-batch checks.
 * The pipeline supplies one of these per dedupe key (typically loaded from a
 * Supabase `properties` row) so we can decide whether to write.
 */
const _idempotencyRecordSchema = z.object({
  dedupe_key: z.string().min(1),
  fingerprint: z.string().length(64),
  last_seen_at: z.string().datetime({ offset: true }),
})

export type IdempotencyRecord = z.infer<typeof _idempotencyRecordSchema>

export type IngestDecision =
  | { action: 'insert'; reason: 'new_record' }
  | { action: 'update'; reason: 'fingerprint_changed' }
  | { action: 'skip'; reason: 'unchanged' }

/**
 * Decide whether an incoming record should be written. The pipeline uses
 * this to short-circuit no-op upserts — a record whose fingerprint matches
 * the persisted one is skipped regardless of when it was last seen.
 */
export function decideIngestAction(
  incoming: IngestRecord,
  existing: IdempotencyRecord | null | undefined
): IngestDecision {
  if (!existing) {
    return { action: 'insert', reason: 'new_record' }
  }
  const fingerprint = computeSourceFingerprint(incoming)
  if (fingerprint === existing.fingerprint) {
    return { action: 'skip', reason: 'unchanged' }
  }
  return { action: 'update', reason: 'fingerprint_changed' }
}
