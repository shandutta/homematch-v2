import type { SupabaseClient } from '@supabase/supabase-js'
import { ZillowUtils } from '@/lib/api/zillow-client'
import {
  DataTransformer,
  RawPropertyData,
} from '@/lib/migration/data-transformer'
import type { Database, PropertyInsert } from '@/types/database'
import { defaultZipForCityState } from './default-zips'

const ALLOWED_PROPERTY_TYPES = [
  'single_family',
  'condo',
  'townhome',
  'multi_family',
  'manufactured',
  'land',
  'other',
] as const
type AllowedPropertyType = (typeof ALLOWED_PROPERTY_TYPES)[number]

const DEFAULT_HOST = 'zillow-com1.p.rapidapi.com'
const DEFAULT_PAGE_SIZE = 20
const DEFAULT_MAX_PAGES = 5 // Increased from 2 to get more properties
const DEFAULT_DELAY_MS = 1250
const MAX_INT_SAFE = 2_000_000_000
const MAX_BATHROOMS = 9.9

// Sort options for Zillow API
export type ZillowSortOption =
  | 'Newest'
  | 'Price_High_Low'
  | 'Price_Low_High'
  | 'Beds'
  | 'Baths'
  | 'Square_Feet'

type FetchLike = typeof fetch

type SupabaseLike = Pick<SupabaseClient<Database>, 'from'>

function normalizePropertyTypeForDb(
  type: string | null | undefined
): AllowedPropertyType {
  const t = type?.toString().toLowerCase() || ''
  if ((ALLOWED_PROPERTY_TYPES as readonly string[]).includes(t)) {
    return t as AllowedPropertyType
  }
  if (['house', 'singlefamily'].includes(t)) return 'single_family'
  if (['townhouse'].includes(t)) return 'townhome'
  if (['multifamily', 'apartment', 'duplex', 'triplex'].includes(t))
    return 'multi_family'
  if (['mobile'].includes(t)) return 'manufactured'
  if (['lot'].includes(t)) return 'land'
  return 'other'
}

export type ZillowSearchItem = {
  zpid?: string | number
  address?: string
  streetAddress?: string
  city?: string
  state?: string
  zipcode?: string | number
  price?: number
  bedrooms?: number
  bathrooms?: number
  livingArea?: number
  lotAreaValue?: number
  yearBuilt?: number
  homeType?: string
  propertyType?: string
  statusType?: string
  brokerStatus?: string
  listingStatus?: string
  latitude?: number
  longitude?: number
  imgSrc?: string
  images?: string[]
  [k: string]: unknown
}

type ZillowSearchResponse = {
  props?: ZillowSearchItem[]
  results?: ZillowSearchItem[]
  data?: { results?: ZillowSearchItem[] }
  totalCount?: number
  hasNextPage?: boolean
  page?: number
  totalPages?: number
  pagination?: { totalPages?: number; currentPage?: number }
  [k: string]: unknown
}

export interface ZillowIngestOptions {
  locations: string[]
  rapidApiKey: string
  supabase: SupabaseLike
  host?: string
  pageSize?: number
  maxPages?: number
  delayMs?: number
  fetchImpl?: FetchLike
  /** Sort order for results - 'Newest' recommended to catch new listings */
  sort?: ZillowSortOption
  /** Minimum price filter for price band searches */
  minPrice?: number
  /** Maximum price filter for price band searches */
  maxPrice?: number
}

export interface IngestLocationSummary {
  location: string
  attempted: number
  transformed: number
  insertedOrUpdated: number
  skipped: number
  errors: string[]
}

export interface IngestSummary {
  totals: {
    attempted: number
    transformed: number
    insertedOrUpdated: number
    skipped: number
  }
  locations: IngestLocationSummary[]
  propertyTypes: Record<string, number>
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeStatus(status?: string): string {
  const s = (status || '').toLowerCase()
  if (s.includes('sale')) return 'active'
  if (s.includes('sold')) return 'sold'
  if (s.includes('pending')) return 'pending'
  return 'active'
}

function extractResults(data: ZillowSearchResponse): ZillowSearchItem[] {
  if (Array.isArray(data.props)) return data.props
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.data?.results)) return data.data.results
  return []
}

function hasAnotherPage(
  data: ZillowSearchResponse,
  page: number,
  pageSize: number,
  returnedCount: number
): boolean {
  if (typeof data.hasNextPage === 'boolean') return data.hasNextPage
  const totalPages =
    data.totalPages ||
    data.pagination?.totalPages ||
    Math.ceil((data.totalCount || 0) / pageSize)
  if (totalPages && !Number.isNaN(totalPages)) {
    return page < totalPages
  }
  return returnedCount >= pageSize
}

export function buildSearchUrl(options: {
  location: string
  page: number
  pageSize: number
  host?: string
  sort?: ZillowSortOption
  minPrice?: number
  maxPrice?: number
}): string {
  const host = options.host || DEFAULT_HOST
  const params = new URLSearchParams({
    location: options.location,
    status_type: 'ForSale',
    page: options.page.toString(),
    pageSize: options.pageSize.toString(),
  })
  // Add sort parameter - 'Newest' is recommended to catch new listings
  if (options.sort) {
    params.set('sort', options.sort)
  }
  // Add price filters for price band searches
  if (options.minPrice !== undefined) {
    params.set('minPrice', options.minPrice.toString())
  }
  if (options.maxPrice !== undefined) {
    params.set('maxPrice', options.maxPrice.toString())
  }
  return `https://${host}/propertyExtendedSearch?${params.toString()}`
}

export async function fetchZillowSearchPage(options: {
  location: string
  page: number
  pageSize?: number
  rapidApiKey: string
  host?: string
  fetchImpl?: FetchLike
  sort?: ZillowSortOption
  minPrice?: number
  maxPrice?: number
}): Promise<{ items: ZillowSearchItem[]; hasNextPage: boolean }> {
  const {
    location,
    page,
    rapidApiKey,
    host = DEFAULT_HOST,
    fetchImpl = fetch,
    pageSize = DEFAULT_PAGE_SIZE,
    sort,
    minPrice,
    maxPrice,
  } = options

  const url = buildSearchUrl({
    location,
    page,
    pageSize,
    host,
    sort,
    minPrice,
    maxPrice,
  })
  const res = await fetchImpl(url, {
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': host,
    },
  })

  if (res.status === 429) {
    throw new Error('RATE_LIMIT')
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${location} page ${page}: ${body.slice(0, 200)}`
    )
  }

  const data = (await res.json()) as ZillowSearchResponse
  const items = extractResults(data)
  const hasNextPage = hasAnotherPage(data, page, pageSize, items.length)

  return { items, hasNextPage }
}

function parseAddressParts(
  item: ZillowSearchItem,
  fallbackLocation?: string
): { address: string; city: string; state: string; zip: string } | null {
  const address = item.address || item.streetAddress || ''
  if (!address) return null

  let street = address
  let city = item.city || ''
  let state = item.state || ''
  let zip = item.zipcode ? String(item.zipcode) : ''

  // Attempt to parse "123 Main St, San Francisco, CA 94105"
  const parts = address.split(',').map((s) => s.trim())
  if (parts.length >= 3) {
    const [addrPart, cityPart, stateZipPart] = [
      parts.slice(0, parts.length - 2).join(', '),
      parts[parts.length - 2],
      parts[parts.length - 1],
    ]
    if (!city) city = cityPart
    if (!state || !zip) {
      const m = stateZipPart.match(/([A-Z]{2})\s+(\d{5})/)
      if (m) {
        state = state || m[1]
        zip = zip || m[2]
      } else if (/^[A-Z]{2}$/.test(stateZipPart)) {
        state = state || stateZipPart
      }
    }
    if (addrPart) street = addrPart
  }

  // Fallback: use provided location ("City, ST") if parsing failed
  if (fallbackLocation && (!city || !state)) {
    const locParts = fallbackLocation.split(',').map((s) => s.trim())
    if (locParts.length >= 2) {
      city = city || locParts.slice(0, locParts.length - 1).join(', ')
      state = state || locParts[locParts.length - 1]
    }
  }

  if (!city || !state) return null

  // Use default zip if missing but we have city/state
  if (!zip) {
    const fallbackZip = defaultZipForCityState(city, state)
    if (fallbackZip) {
      zip = fallbackZip
    }
  }

  return {
    address: street,
    city,
    state,
    zip,
  }
}

export function mapSearchItemToRaw(
  item: ZillowSearchItem,
  locationForFallback?: string
): RawPropertyData | null {
  if (!item?.zpid) return null

  const parsed = parseAddressParts(item, locationForFallback)
  if (!parsed) return null
  const { address, city, state, zip } = parsed

  const propertyType = ZillowUtils.mapPropertyType(
    (item.propertyType || item.homeType || '') as string
  )

  const images =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : typeof item.imgSrc === 'string'
        ? [item.imgSrc]
        : []

  return {
    zpid: String(item.zpid),
    address,
    city,
    state,
    zip_code: zip,
    price:
      typeof item.price === 'number'
        ? Math.min(Math.round(item.price), MAX_INT_SAFE)
        : 0,
    bedrooms: item.bedrooms ?? 0,
    bathrooms:
      typeof item.bathrooms === 'number'
        ? Math.min(Math.round(item.bathrooms * 10) / 10, MAX_BATHROOMS)
        : 0,
    square_feet: item.livingArea,
    lot_size:
      typeof item.lotAreaValue === 'number'
        ? Math.min(Math.round(item.lotAreaValue), MAX_INT_SAFE)
        : undefined,
    year_built: item.yearBuilt,
    property_type: propertyType,
    listing_status: normalizeStatus(
      item.statusType || item.brokerStatus || item.listingStatus
    ),
    images,
    latitude: item.latitude,
    longitude: item.longitude,
  }
}

export async function ingestZillowLocations(
  options: ZillowIngestOptions
): Promise<IngestSummary> {
  const {
    locations,
    rapidApiKey,
    supabase,
    host = DEFAULT_HOST,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = DEFAULT_MAX_PAGES,
    delayMs = DEFAULT_DELAY_MS,
    fetchImpl = fetch,
    sort,
    minPrice,
    maxPrice,
  } = options

  const transformer = new DataTransformer()

  const summary: IngestSummary = {
    totals: { attempted: 0, transformed: 0, insertedOrUpdated: 0, skipped: 0 },
    locations: [],
    propertyTypes: {},
  }

  for (const location of locations) {
    const locationSummary: IngestLocationSummary = {
      location,
      attempted: 0,
      transformed: 0,
      insertedOrUpdated: 0,
      skipped: 0,
      errors: [],
    }
    const locationTypeCounts: Record<string, number> = {}

    let page = 1
    let hasMore = true

    while (hasMore && page <= maxPages) {
      let pageResult: { items: ZillowSearchItem[]; hasNextPage: boolean }

      try {
        pageResult = await fetchZillowSearchPage({
          location,
          page,
          rapidApiKey,
          host,
          fetchImpl,
          pageSize,
          sort,
          minPrice,
          maxPrice,
        })
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Unknown fetch error'
        if (msg === 'RATE_LIMIT') {
          await delay(delayMs * 2)
          continue
        }
        locationSummary.errors.push(msg)
        break
      }

      const rawItems = pageResult.items
        .map((it) => mapSearchItemToRaw(it, location))
        .filter(Boolean) as RawPropertyData[]

      locationSummary.attempted += pageResult.items.length
      summary.totals.attempted += pageResult.items.length

      if (rawItems.length === 0) {
        hasMore = pageResult.hasNextPage
        page++
        await delay(delayMs)
        continue
      }

      const inserts: PropertyInsert[] = []
      rawItems.forEach((raw, index) => {
        const result = transformer.transformProperty(raw, index)
        if (result.success && result.data) {
          locationSummary.transformed++
          summary.totals.transformed++
          const normalizedType = normalizePropertyTypeForDb(
            result.data.property_type
          )
          locationTypeCounts[normalizedType] =
            (locationTypeCounts[normalizedType] || 0) + 1
          summary.propertyTypes[normalizedType] =
            (summary.propertyTypes[normalizedType] || 0) + 1
          inserts.push({
            ...result.data,
            bedrooms: Math.min(result.data.bedrooms ?? 0, 20),
            bathrooms: Math.min(result.data.bathrooms ?? 0, 20),
            property_type: normalizedType,
            updated_at: new Date().toISOString(),
          })
        } else {
          locationSummary.skipped++
          summary.totals.skipped++
          if (result.errors.length > 0) {
            locationSummary.errors.push(result.errors.join('; '))
          }
        }
      })

      if (inserts.length > 0) {
        const builder = supabase.from('properties')
        const { error } = await builder.upsert(inserts, {
          onConflict: 'zpid',
        })

        if (error) {
          const errMsg =
            (error as { message?: string }).message ||
            JSON.stringify(error) ||
            'Failed to upsert properties'
          const typesList = Object.entries(locationTypeCounts)
            .map(([t, c]) => `${t}:${c}`)
            .join(', ')
          locationSummary.errors.push(
            typesList ? `${errMsg} | types=${typesList}` : errMsg
          )
        } else {
          locationSummary.insertedOrUpdated += inserts.length
          summary.totals.insertedOrUpdated += inserts.length
        }
      }

      hasMore = pageResult.hasNextPage
      page++
      await delay(delayMs)
    }

    summary.locations.push(locationSummary)
  }

  return summary
}
