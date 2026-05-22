/**
 * Zillow /property metadata fetcher + field mapper.
 *
 * The bulk vibes backfill (src/lib/services/vibes/backfill.ts) must re-fetch
 * listing metadata (description, amenities, year_built, etc.) for the ~14k
 * existing properties whose original ingest never persisted it — without that
 * grounding, the vibe generator produces slop regardless of model/prompt.
 *
 * The single-property admin route (app/api/admin/generate-vibes-zillow) already
 * fetches /property and maps these fields; this module factors that fetch +
 * mapping so the bulk path reuses the exact same extraction (amenities via
 * extractAmenities, property_type normalization, and — unlike the route, which
 * hardcoded 'active' — homeStatus -> listing_status).
 */
import {
  extractAmenities,
  type ZillowPropertyResponse,
  type ZillowSchool,
  type ZillowPriceHistoryEntry,
  type ZillowTaxHistoryEntry,
} from '@/app/api/admin/generate-vibes-zillow/extract-amenities'
import { PROPERTY_TYPE_VALUES, type Property } from '@/lib/schemas/property'

const DEFAULT_RAPIDAPI_HOST = 'us-housing-market-data1.p.rapidapi.com'

export type FetchZillowPropertyOptions = {
  zpid: string
  rapidApiKey: string
  host?: string
  fetchImpl?: typeof fetch
  retries?: number
  timeoutMs?: number
}

type PropertyType = NonNullable<Property['property_type']>
type ListingStatus = NonNullable<Property['listing_status']>

const isPropertyType = (value: string): value is PropertyType =>
  PROPERTY_TYPE_VALUES.some((item) => item === value)

// Zillow homeType values that don't match our enum verbatim. Without these,
// TOWNHOUSE/APARTMENT/LOT silently fall back to single_family (and the enrich
// path would even overwrite discover.ts's correct 'townhome' mapping).
const PROPERTY_TYPE_ALIASES: Record<string, PropertyType> = {
  townhouse: 'townhome',
  apartment: 'condo',
  lot: 'land',
  vacant_land: 'land',
  mobile: 'manufactured',
  mobile_home: 'manufactured',
  manufactured_home: 'manufactured',
}

export function normalizePropertyType(
  value: string | null | undefined
): PropertyType {
  const normalized = (value || 'single_family')
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (isPropertyType(normalized)) return normalized
  return PROPERTY_TYPE_ALIASES[normalized] ?? 'single_family'
}

/**
 * Map Zillow's homeStatus to our listing_status. The single-property route
 * hardcoded 'active' (a known bug); the bulk path syncs the real status so the
 * backfill can skip sold/pending and the UI reflects reality.
 *
 * IMPORTANT: this emits ONLY 'active' | 'pending' | 'sold' — the three values
 * that satisfy BOTH the DB CHECK constraint
 * (active|pending|sold|off_market|new_listing) AND the Zod propertySchema enum
 * (active|pending|sold|for_sale|removed). 'off_market'/'removed' each fail one
 * side, so anything not clearly active/pending collapses to 'sold' (i.e.
 * "no longer on the active market"). Falls back to 'active' for FOR_SALE /
 * COMING_SOON / unknown.
 */
export function mapHomeStatusToListingStatus(
  homeStatus: string | null | undefined
): ListingStatus {
  const s = (homeStatus || '').toUpperCase()
  if (/PENDING|CONTINGENT|UNDER_CONTRACT|ACCEPTING_BACKUP/.test(s))
    return 'pending'
  if (
    /SOLD|OFF_MARKET|FORECLOS|CANCELLED|WITHDRAWN|EXPIRED|REMOVED|OTHER/.test(s)
  )
    return 'sold'
  return 'active'
}

/**
 * Fetch raw /property metadata for a zpid. Mirrors fetchZillowImageUrls:
 * 3 retries, 429 + abort/timeout exponential backoff. Throws on exhaustion so
 * the caller can record the failure and move on (it never clobbers existing
 * data on failure).
 */
export async function fetchZillowProperty(
  options: FetchZillowPropertyOptions
): Promise<ZillowPropertyResponse> {
  const {
    zpid,
    rapidApiKey,
    host = DEFAULT_RAPIDAPI_HOST,
    fetchImpl = fetch,
    retries = 3,
    timeoutMs = 30000,
  } = options

  const url = `https://${host}/property?zpid=${encodeURIComponent(zpid)}`
  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetchImpl(url, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': host,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.status === 429) {
        const backoffMs =
          500 * Math.pow(2, attempt) + Math.floor(Math.random() * 250)
        lastError = new Error(
          `RapidAPI rate limit (429) for zpid=${zpid}; backing off ${backoffMs}ms`
        )
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, backoffMs))
          continue
        }
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(
          `RapidAPI /property error ${res.status} ${res.statusText} for zpid=${zpid}: ${text.slice(0, 200)}`
        )
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return (await res.json()) as ZillowPropertyResponse
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error(String(err))

      const isAbort =
        lastError.name === 'AbortError' ||
        /aborted|timeout/i.test(lastError.message)

      if (attempt < retries - 1) {
        const backoffMs =
          500 * Math.pow(2, attempt) +
          Math.floor(Math.random() * 250) +
          (isAbort ? 1000 : 0)
        await new Promise((r) => setTimeout(r, backoffMs))
        continue
      }
    }
  }

  throw (
    lastError ?? new Error(`Failed to fetch Zillow property for zpid=${zpid}`)
  )
}

export type ZillowPropertyMetadata = {
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number | null
  lot_size_sqft: number | null
  year_built: number | null
  property_type: PropertyType
  listing_status: ListingStatus
  description: string | null
  amenities: string[] | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  // Listing-enrichment fields (inline in /property; previously discarded).
  price_history: ZillowPriceHistoryEntry[] | null
  tax_history: ZillowTaxHistoryEntry[] | null
  schools: ZillowSchool[] | null
  zestimate: number | null
  rent_zestimate: number | null
  listed_at: string | null
  days_on_market: number | null
  hoa_fee: number | null
  broker_name: string | null
  agent_name: string | null
}

// HOA can arrive as a number or a string like "$250/mo" / "250". Parse the
// first numeric run; return null if there's nothing usable.
function parseHoaFee(
  ...vals: Array<number | string | undefined>
): number | null {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
    if (typeof v === 'string') {
      const m = v.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
      if (m) {
        const n = Number(m[1])
        if (Number.isFinite(n) && n > 0) return n
      }
    }
  }
  return null
}

// Days on market from datePosted (ISO/epoch). Null when unparseable.
function daysOnMarketFrom(datePosted: string | undefined): {
  listedAt: string | null
  days: number | null
} {
  if (!datePosted) return { listedAt: null, days: null }
  const t = Date.parse(datePosted)
  if (Number.isNaN(t)) return { listedAt: null, days: null }
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
  return { listedAt: new Date(t).toISOString(), days }
}

/**
 * Map a raw /property response into the subset of `properties` columns the
 * vibe generator grounds on. Mirrors the field mapping in the admin route so
 * the single + bulk paths stay consistent. Numeric fields are null when
 * absent so the caller can choose not to overwrite a good existing value with
 * a null fetch.
 */
export function extractPropertyMetadata(
  z: ZillowPropertyResponse
): ZillowPropertyMetadata {
  const homeStatus = typeof z.homeStatus === 'string' ? z.homeStatus : undefined
  const description =
    typeof z.description === 'string' && z.description.trim().length > 0
      ? z.description
      : null

  const reso = z.resoFacts
  const { listedAt, days } = daysOnMarketFrom(z.datePosted)
  const schools =
    Array.isArray(z.schools) && z.schools.length > 0 ? z.schools : null
  const priceHistory =
    Array.isArray(z.priceHistory) && z.priceHistory.length > 0
      ? z.priceHistory
      : null
  const taxHistory =
    Array.isArray(z.taxHistory) && z.taxHistory.length > 0 ? z.taxHistory : null

  return {
    price: typeof z.price === 'number' ? z.price : null,
    bedrooms: typeof z.bedrooms === 'number' ? z.bedrooms : null,
    bathrooms: typeof z.bathrooms === 'number' ? z.bathrooms : null,
    square_feet: typeof z.livingArea === 'number' ? z.livingArea : null,
    lot_size_sqft: typeof z.lotAreaValue === 'number' ? z.lotAreaValue : null,
    year_built: typeof z.yearBuilt === 'number' ? z.yearBuilt : null,
    property_type: normalizePropertyType(z.homeType || z.propertyType),
    listing_status: mapHomeStatusToListingStatus(homeStatus),
    description,
    amenities: extractAmenities(z),
    address: z.address?.streetAddress || z.streetAddress || null,
    city: z.address?.city || z.city || null,
    state: z.address?.state || z.state || null,
    zip_code: z.address?.zipcode || z.zipcode || null,
    price_history: priceHistory,
    tax_history: taxHistory,
    schools,
    zestimate: typeof z.zestimate === 'number' ? z.zestimate : null,
    rent_zestimate:
      typeof z.rentZestimate === 'number' ? z.rentZestimate : null,
    listed_at: listedAt,
    days_on_market: days,
    hoa_fee: parseHoaFee(
      z.monthlyHoaFee,
      z.hoaFee,
      reso?.monthlyHoaFee,
      reso?.hoaFee,
      reso?.associationFee
    ),
    broker_name: z.attributionInfo?.brokerName?.trim() || null,
    agent_name: z.attributionInfo?.agentName?.trim() || null,
  }
}
