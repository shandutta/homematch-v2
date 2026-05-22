/**
 * I4 (2026-05-13 audit): the `discover` step of the unified ingest
 * pipeline. Pulls listings from RapidAPI propertyExtendedSearch for the
 * Bay Area allowlist, filters in-allowlist hits, and direct-writes to
 * `properties` via UPSERT keyed on zpid.
 *
 * Product decisions baked in (per user, 2026-05-13):
 *   - Source: RapidAPI propertyExtendedSearch
 *   - Write target: direct to `properties` (no staging table)
 *   - Metros: Bay Area only (BAY_AREA_DISCOVERY_LOCATIONS)
 *   - Hard cap: 1000 RapidAPI requests per run (env override allowed)
 */
import { createStandaloneClient } from '@/lib/supabase/standalone'
import {
  BAY_AREA_CITY_SET,
  BAY_AREA_DISCOVERY_LOCATIONS,
  type BayAreaCity,
} from './cities'
import {
  RapidApiQuotaExceededError,
  RapidApiZillowClient,
  type RapidApiCallStats,
  type RapidApiClientOptions,
} from './zillow-client'

type DiscoverArgs = {
  locations?: readonly string[]
  sort?: 'Newest' | 'Price_Low_High' | 'Price_High_Low' | 'Homes_For_You'
  maxPages?: number
  pageSize?: number
  homeType?: 'Houses' | 'Townhomes' | 'Condos' | 'MultiFamily'
  client?: RapidApiZillowClient
  clientOptions?: RapidApiClientOptions
  dryRun?: boolean
}

type RawZillowResult = {
  zpid?: number | string
  address?: string
  city?: string
  state?: string
  zipcode?: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  livingArea?: number
  lotAreaValue?: number
  homeType?: string
  propertyType?: string
  yearBuilt?: number
  latitude?: number
  longitude?: number
  imgSrc?: string
  listingStatus?: string
  daysOnZillow?: number
}

type RawSearchResponse = {
  props?: RawZillowResult[]
  totalPages?: number
  currentPage?: number
  resultsPerPage?: number
}

export type DiscoverSummary = {
  locations: string[]
  pagesFetched: number
  resultsConsidered: number
  inAllowlist: number
  upserted: number
  skipped: number
  errors: number
  rapidApi: RapidApiCallStats
  durationMs: number
  dryRun: boolean
}

// Map Zillow homeType -> properties.property_type CHECK values
// (single_family|condo|townhome|multi_family|manufactured|land|other). The
// enrich step (/property) re-derives this per listing, so discover only needs
// a CHECK-valid value here so the thin insert doesn't fail.
const HOME_TYPE_TO_SCHEMA: Record<string, string> = {
  SINGLE_FAMILY: 'single_family',
  TOWNHOUSE: 'townhome',
  TOWNHOME: 'townhome',
  CONDO: 'condo',
  APARTMENT: 'condo',
  MULTI_FAMILY: 'multi_family',
  MANUFACTURED: 'manufactured',
  MOBILE: 'manufactured',
  LOT: 'land',
  LAND: 'land',
}

const normalizeHomeType = (raw: string | undefined): string =>
  HOME_TYPE_TO_SCHEMA[(raw ?? '').toUpperCase()] ?? 'single_family'

// Emit only active|pending|sold — the intersection of the DB CHECK
// (active|pending|sold|off_market|new_listing) and the Zod propertySchema enum
// (active|pending|sold|for_sale|removed). A "new" ForSale listing is active;
// off-market collapses to sold. Avoids rows the read parse would later reject.
const normalizeListingStatus = (raw: string | undefined): string => {
  const v = (raw ?? '').toLowerCase()
  if (v.includes('pend')) return 'pending'
  if (v.includes('sold') || v.includes('off')) return 'sold'
  return 'active'
}

// propertyExtendedSearch returns no separate city/state/zipcode fields — only
// a full `address` string like "50 Cascade Walk, San Francisco, CA 94116".
// Parse the city + state + zip out of it (the city allowlist filter and the
// schema's zip_code min(5) both depend on these).
function parseAddress(address: string | undefined): {
  city: string
  state: string
  zip: string
} {
  if (!address) return { city: '', state: '', zip: '' }
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const last = parts[parts.length - 1] ?? ''
  const city = parts.length >= 2 ? parts[parts.length - 2] : ''
  const m = last.match(/\b([A-Z]{2})\b\s*(\d{5})?/)
  return { city, state: m?.[1] ?? '', zip: m?.[2] ?? '' }
}

const isBayAreaCity = (city: string): boolean =>
  !!city && BAY_AREA_CITY_SET.has(city.trim().toUpperCase())

export async function runDiscover(
  args: DiscoverArgs = {}
): Promise<DiscoverSummary> {
  const startedAt = Date.now()
  const locations = (args.locations ?? BAY_AREA_DISCOVERY_LOCATIONS).map(
    (l) => l
  )
  const sort = args.sort ?? 'Newest'
  const maxPages = Math.max(1, args.maxPages ?? 5)
  const pageSize = Math.min(100, Math.max(10, args.pageSize ?? 40))
  const homeType = args.homeType ?? 'Houses'
  const dryRun = args.dryRun ?? false

  const client = args.client ?? new RapidApiZillowClient(args.clientOptions)

  const summary: DiscoverSummary = {
    locations,
    pagesFetched: 0,
    resultsConsidered: 0,
    inAllowlist: 0,
    upserted: 0,
    skipped: 0,
    errors: 0,
    rapidApi: client.stats,
    durationMs: 0,
    dryRun,
  }

  const supabase = createStandaloneClient()

  outer: for (const location of locations) {
    for (let page = 1; page <= maxPages; page += 1) {
      const params = new URLSearchParams({
        location,
        status_type: 'ForSale',
        home_type: homeType,
        sort,
        page: String(page),
        pageSize: String(pageSize),
      })

      // Fetch with one retry on transient failures (e.g. a 429 that slips
      // past pacing). A lost page = lost inventory, so it's worth the wait.
      let body: RawSearchResponse | null = null
      let lastErr: unknown = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          body = await client.get<RawSearchResponse>(
            `/propertyExtendedSearch?${params.toString()}`
          )
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          if (err instanceof RapidApiQuotaExceededError) break
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 2000))
          }
        }
      }
      if (lastErr) {
        if (lastErr instanceof RapidApiQuotaExceededError) {
          console.warn(
            `[discover] RapidAPI cap hit at ${location} page ${page}: ${lastErr.message}`
          )
          break outer
        }
        summary.errors += 1
        console.error(`[discover] ${location} page ${page} failed`, lastErr)
        continue
      }
      if (!body) continue

      summary.pagesFetched += 1
      const props = body.props ?? []
      if (props.length === 0) break

      for (const result of props) {
        summary.resultsConsidered += 1
        const parsed = parseAddress(result.address)
        const city = result.city?.trim() || parsed.city
        if (!isBayAreaCity(city)) continue
        summary.inAllowlist += 1

        if (dryRun) continue

        const zpid = String(result.zpid ?? '')
        if (!zpid) {
          summary.skipped += 1
          continue
        }

        const coordinates =
          typeof result.latitude === 'number' &&
          typeof result.longitude === 'number'
            ? `SRID=4326;POINT(${result.longitude} ${result.latitude})`
            : null

        const insert = {
          zpid,
          address: result.address ?? '',
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          city: city as BayAreaCity,
          state: result.state || parsed.state || 'CA',
          zip_code: result.zipcode || parsed.zip || '',
          price: result.price ?? null,
          bedrooms: result.bedrooms ?? null,
          bathrooms: result.bathrooms ?? null,
          square_feet: result.livingArea ?? null,
          lot_size_sqft: result.lotAreaValue ?? null,
          property_type: normalizeHomeType(
            result.propertyType ?? result.homeType
          ),
          year_built: result.yearBuilt ?? null,
          coordinates,
          images: result.imgSrc ? [result.imgSrc] : [],
          listing_status: normalizeListingStatus(result.listingStatus),
          // is_active is auto-derived by the trg_sync_property_is_active trigger
          // (S2 follow-up in 20260513060000) so we don't set it here.
        }

        // database.ts types pre-date the S5 migration that made `bathrooms`
        // nullable; the runtime accepts NULL but the static union still
        // says `number`. Cast through unknown until `supabase gen types`
        // is re-run against prod.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const upsertFn = supabase.from('properties').upsert as unknown as (
          row: typeof insert,
          opts: { onConflict: string }
        ) => Promise<{ error: { message: string } | null }>
        const { error } = await upsertFn(insert, { onConflict: 'zpid' })

        if (error) {
          summary.errors += 1
          console.error(
            `[discover] upsert failed for zpid=${zpid}`,
            error.message
          )
          continue
        }
        summary.upserted += 1
      }

      if (body.totalPages && page >= body.totalPages) break
    }
  }

  summary.rapidApi = client.stats
  summary.durationMs = Date.now() - startedAt
  return summary
}
