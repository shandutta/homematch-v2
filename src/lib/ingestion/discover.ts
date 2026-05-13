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

const HOME_TYPE_TO_SCHEMA: Record<string, string> = {
  SINGLE_FAMILY: 'house',
  TOWNHOUSE: 'townhouse',
  CONDO: 'condo',
  APARTMENT: 'apartment',
  MULTI_FAMILY: 'multi_family',
}

const normalizeHomeType = (raw: string | undefined): string =>
  HOME_TYPE_TO_SCHEMA[(raw ?? '').toUpperCase()] ?? 'house'

const normalizeListingStatus = (raw: string | undefined): string => {
  const v = (raw ?? '').toLowerCase()
  if (v.includes('pend')) return 'pending'
  if (v.includes('sold') || v.includes('off')) return 'sold'
  if (v.includes('new')) return 'new_listing'
  return 'active'
}

const isBayAreaResult = (r: RawZillowResult): boolean => {
  if (!r.city) return false
  return BAY_AREA_CITY_SET.has(r.city.trim().toUpperCase())
}

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

      let body: RawSearchResponse
      try {
        body = await client.get<RawSearchResponse>(
          `/propertyExtendedSearch?${params.toString()}`
        )
      } catch (err) {
        if (err instanceof RapidApiQuotaExceededError) {
          console.warn(
            `[discover] RapidAPI cap hit at ${location} page ${page}: ${err.message}`
          )
          break outer
        }
        summary.errors += 1
        console.error(`[discover] ${location} page ${page} failed`, err)
        continue
      }

      summary.pagesFetched += 1
      const props = body.props ?? []
      if (props.length === 0) break

      for (const result of props) {
        summary.resultsConsidered += 1
        if (!isBayAreaResult(result)) continue
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
          city: (result.city ?? '').trim() as BayAreaCity,
          state: result.state ?? 'CA',
          zip_code: result.zipcode ?? '',
          price: result.price ?? null,
          bedrooms: result.bedrooms ?? null,
          bathrooms: result.bathrooms ?? null,
          square_feet: result.livingArea ?? null,
          lot_size_sqft: result.lotAreaValue ?? null,
          property_type: normalizeHomeType(result.homeType),
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
