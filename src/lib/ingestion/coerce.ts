/**
 * Shared defensive numeric coercion for the ingest paths.
 *
 * Zillow's search (propertyExtendedSearch) and detail (/property) endpoints
 * return raw numerics that do NOT all fit the `properties` column types +
 * CHECKs: areas arrive as floats (sqft like 8276.4 or acres like 0.25) into
 * integer columns; square_feet/price can be 0 (CHECK `> 0`); bedrooms can be
 * null (NOT NULL); bathrooms can be >= 10 (numeric(2,1) overflow); year_built
 * can be out of the 1700..2100 CHECK window. Both the discover thin-insert and
 * the /property enrich path coerce through here so a single bad field never
 * drops a row (or, on a batch upsert, the whole batch). Coercion is lossy by
 * design (round / clamp / null); enrich re-derives, the app tolerates nulls.
 */

const INT4_MAX = 2147483647

const asNumber = (v: unknown): number | null => {
  // Number(null) === 0 and Number('') === 0 are footguns; treat both as absent.
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Nullable positive int4 (price/area columns: CHECK `> 0`, floats rounded). */
export const toPositiveInt = (v: unknown): number | null => {
  const n = asNumber(v)
  if (n === null) return null
  const r = Math.round(n)
  return r > 0 && r <= INT4_MAX ? r : null
}

/** Non-negative int4, defaulting to 0 (for NOT NULL `bedrooms` on insert). */
export const toNonNegativeInt = (v: unknown): number => {
  const n = asNumber(v)
  if (n === null || n < 0) return 0
  return Math.min(Math.round(n), INT4_MAX)
}

/** Non-negative int4 or null (for nullable/conditional `bedrooms` on update). */
export const toNonNegativeIntOrNull = (v: unknown): number | null => {
  const n = asNumber(v)
  if (n === null || n < 0) return null
  return Math.min(Math.round(n), INT4_MAX)
}

/** `bathrooms`: numeric(2,1), CHECK `>= 0` → 0..9.9 (1 decimal), else null. */
export const toBathrooms = (v: unknown): number | null => {
  const n = asNumber(v)
  if (n === null || n < 0) return null
  const r = Math.round(n * 10) / 10
  return r <= 9.9 ? r : null
}

/** `year_built`: CHECK null OR 1700..2100. */
export const toYearBuilt = (v: unknown): number | null => {
  const n = asNumber(v)
  if (n === null) return null
  const r = Math.round(n)
  return r >= 1700 && r <= 2100 ? r : null
}
