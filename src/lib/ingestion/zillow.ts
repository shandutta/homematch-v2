import { ZillowUtils } from '@/lib/api/zillow-client'
import {
  DataTransformer,
  RawPropertyData,
} from '@/lib/migration/data-transformer'
import type { Database, PropertyInsert } from '@/types/database'

const DEFAULT_HOST = 'zillow-com1.p.rapidapi.com'
const DEFAULT_PAGE_SIZE = 20
const DEFAULT_MAX_PAGES = 2
const DEFAULT_DELAY_MS = 1250

type FetchLike = typeof fetch

type UpsertResult = { data: unknown; error: { message?: string } | null }

type SupabaseLike = {
  from: <T extends keyof Database['public']['Tables']>(
    table: T
  ) => {
    upsert(
      values: Database['public']['Tables'][T]['Insert'][],
      opts: { onConflict?: string }
    ): Promise<UpsertResult>
  }
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
}): string {
  const host = options.host || DEFAULT_HOST
  const params = new URLSearchParams({
    location: options.location,
    status_type: 'ForSale',
    page: options.page.toString(),
    pageSize: options.pageSize.toString(),
  })
  return `https://${host}/propertyExtendedSearch?${params.toString()}`
}

export async function fetchZillowSearchPage(options: {
  location: string
  page: number
  pageSize?: number
  rapidApiKey: string
  host?: string
  fetchImpl?: FetchLike
}): Promise<{ items: ZillowSearchItem[]; hasNextPage: boolean }> {
  const {
    location,
    page,
    rapidApiKey,
    host = DEFAULT_HOST,
    fetchImpl = fetch,
    pageSize = DEFAULT_PAGE_SIZE,
  } = options

  const url = buildSearchUrl({ location, page, pageSize, host })
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

export function mapSearchItemToRaw(
  item: ZillowSearchItem
): RawPropertyData | null {
  if (!item?.zpid) return null

  const address = item.address || item.streetAddress || ''
  const city = item.city || ''
  const state = item.state || ''
  const zip = item.zipcode ? String(item.zipcode) : ''

  if (!address || !city || !state || !zip) {
    return null
  }

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
    price: item.price ?? 0,
    bedrooms: item.bedrooms ?? 0,
    bathrooms: item.bathrooms ?? 0,
    square_feet: item.livingArea,
    lot_size: item.lotAreaValue,
    year_built: item.yearBuilt,
    property_type: propertyType,
    listing_status: normalizeStatus(item.statusType || item.brokerStatus),
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
  } = options

  const transformer = new DataTransformer()

  const summary: IngestSummary = {
    totals: { attempted: 0, transformed: 0, insertedOrUpdated: 0, skipped: 0 },
    locations: [],
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
        .map(mapSearchItemToRaw)
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
          inserts.push({
            ...result.data,
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
          locationSummary.errors.push(
            error.message || 'Failed to upsert properties'
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
