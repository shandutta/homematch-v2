import { NextResponse } from 'next/server'
import { createVibesService } from '@/lib/services/vibes'
import { PROPERTY_TYPE_VALUES, type Property } from '@/lib/schemas/property'
import { rateLimitAdminRoute } from '@/lib/api/admin-rate-limit'
import { ApiErrorHandler } from '@/lib/api/errors'
import { fetchWithTimeout } from '@/lib/api/fetch-timeout'
import {
  isPaidRapidApiApproved,
  RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE,
} from '@/lib/api/rapidapi-approval-gate'

const isDev = process.env.NODE_ENV === 'development'
const ZILLOW_FETCH_TIMEOUT_MS = 10_000

type PropertyType = NonNullable<Property['property_type']>

const isPropertyType = (value: string): value is PropertyType =>
  PROPERTY_TYPE_VALUES.some((item) => item === value)

const normalizePropertyType = (
  value: string | null | undefined
): PropertyType => {
  const normalized = (value || 'single_family')
    .toLowerCase()
    .replace(/\s+/g, '_')
  return isPropertyType(normalized) ? normalized : 'single_family'
}

interface ZillowPropertyResponse {
  zpid?: number | string
  address?: {
    streetAddress?: string
    city?: string
    state?: string
    zipcode?: string
  }
  streetAddress?: string
  city?: string
  state?: string
  zipcode?: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  livingArea?: number
  lotAreaValue?: number
  yearBuilt?: number
  homeType?: string
  propertyType?: string
  imgSrc?: string
  // Simple flat array of URLs (most common)
  images?: string[]
  // Complex nested structure with multiple sizes
  originalPhotos?: Array<{
    mixedSources?: {
      jpeg?: Array<{ url?: string; width?: number }>
      webp?: Array<{ url?: string; width?: number }>
    }
  }>
  // Object array with url field
  photos?: Array<{ url?: string }>
  // Alternative media array format
  media?: Array<{ url?: string; type?: string }>
  description?: string
  latitude?: number
  longitude?: number
  // INGEST-001: Zillow's response also includes structured amenity fields.
  // The previous code hardcoded `amenities: null` on the LLM input which is
  // a major contributor to the systematic hallucination findings in Section
  // 1 of the audit. Capturing the common ones so extractAmenities() can map
  // them into a single string[].
  appliances?: string[]
  interiorFeatures?: string[]
  exteriorFeatures?: string[]
  parkingFeatures?: string[]
  coolingFeatures?: string[]
  heatingFeatures?: string[]
  flooring?: string[] | string
  view?: string[] | string
  homeFacts?: Array<{ factLabel?: string; factValue?: string }>
  atAGlanceFacts?: Array<{ factLabel?: string; factValue?: string }>
  hasGarage?: boolean
  hasPool?: boolean
  hasFireplace?: boolean
  // INGEST-001 v2: live RapidAPI responses nest the amenity fields under
  // resoFacts (RESO MLS standard fields). Top-level fields are kept for
  // backward compatibility with the simpler shape some properties
  // returned, but resoFacts is where the actual data is for the modern
  // listings (verified against the prod 10-row sample on 2026-05-13 —
  // every property had top-level nulls and rich resoFacts entries).
  resoFacts?: {
    appliances?: string[]
    interiorFeatures?: string[]
    exteriorFeatures?: string[]
    parkingFeatures?: string[]
    cooling?: string[]
    coolingFeatures?: string[]
    heating?: string[]
    heatingFeatures?: string[]
    flooring?: string[] | string
    view?: string[] | string
    fireplaceFeatures?: string[]
    poolFeatures?: string[]
    spaFeatures?: string[]
    laundryFeatures?: string[]
    patioAndPorchFeatures?: string[]
    lotFeatures?: string[]
    communityFeatures?: string[]
    associationAmenities?: string[]
    accessibilityFeatures?: string[]
    waterSource?: string[] | string
    sewer?: string[] | string
    roofType?: string[] | string
    foundationDetails?: string[] | string
    architecturalStyle?: string[] | string
    hasGarage?: boolean
    hasPool?: boolean
    hasFireplace?: boolean
    homeFacts?: Array<{ factLabel?: string; factValue?: string }>
    atAGlanceFacts?: Array<{ factLabel?: string; factValue?: string }>
  }
  [key: string]: unknown
}

/**
 * INGEST-001: pull a string[] of amenity-like signals out of a Zillow
 * property payload. The shape varies by listing — some fields are arrays,
 * some are scalars, and homeFacts is a label/value pair list — so we
 * normalize everything into a deduped, trimmed string[].
 *
 * Returns null when nothing was extracted, matching the schema's null
 * sentinel and preventing downstream code from interpreting an empty
 * array as "no amenities" vs "data unavailable".
 */
export function extractAmenities(z: ZillowPropertyResponse): string[] | null {
  const items: string[] = []
  const reso = z.resoFacts

  const pushArr = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const entry of v) {
        if (typeof entry === 'string' && entry.trim()) items.push(entry.trim())
      }
    } else if (typeof v === 'string' && v.trim()) {
      items.push(v.trim())
    }
  }

  // Walk both the top level (legacy/simpler responses) and the resoFacts
  // sub-object (RESO standard fields, where modern Zillow responses
  // actually carry the data). The 10-row prod validation on 2026-05-13
  // surfaced every amenity field at resoFacts.* with all top-level
  // counterparts NULL.
  pushArr(z.appliances)
  pushArr(reso?.appliances)
  pushArr(z.interiorFeatures)
  pushArr(reso?.interiorFeatures)
  pushArr(z.exteriorFeatures)
  pushArr(reso?.exteriorFeatures)
  pushArr(z.parkingFeatures)
  pushArr(reso?.parkingFeatures)
  pushArr(z.coolingFeatures)
  pushArr(reso?.coolingFeatures)
  pushArr(reso?.cooling)
  pushArr(z.heatingFeatures)
  pushArr(reso?.heatingFeatures)
  pushArr(reso?.heating)
  pushArr(z.flooring)
  pushArr(reso?.flooring)
  pushArr(z.view)
  pushArr(reso?.view)
  pushArr(reso?.fireplaceFeatures)
  pushArr(reso?.poolFeatures)
  pushArr(reso?.spaFeatures)
  pushArr(reso?.laundryFeatures)
  pushArr(reso?.patioAndPorchFeatures)
  pushArr(reso?.lotFeatures)
  pushArr(reso?.communityFeatures)
  pushArr(reso?.associationAmenities)
  pushArr(reso?.accessibilityFeatures)
  pushArr(reso?.waterSource)
  pushArr(reso?.sewer)
  pushArr(reso?.roofType)
  pushArr(reso?.foundationDetails)
  pushArr(reso?.architecturalStyle)

  if (z.hasGarage || reso?.hasGarage) items.push('Garage')
  if (z.hasPool || reso?.hasPool) items.push('Pool')
  if (z.hasFireplace || reso?.hasFireplace) items.push('Fireplace')

  // Codex P2 (PR #38): `z.homeFacts || z.atAGlanceFacts` was buggy because
  // an empty array is truthy in JavaScript. Listings with
  // `homeFacts: []` and a populated `atAGlanceFacts` would skip the fallback
  // and lose the amenity facts entirely. Pick whichever array actually has
  // entries — checking both top-level and resoFacts since modern responses
  // nest these too.
  const factsCandidates = [
    Array.isArray(z.homeFacts) && z.homeFacts.length > 0 ? z.homeFacts : null,
    Array.isArray(z.atAGlanceFacts) && z.atAGlanceFacts.length > 0
      ? z.atAGlanceFacts
      : null,
    Array.isArray(reso?.homeFacts) && reso.homeFacts.length > 0
      ? reso.homeFacts
      : null,
    Array.isArray(reso?.atAGlanceFacts) && reso.atAGlanceFacts.length > 0
      ? reso.atAGlanceFacts
      : null,
  ]
  const facts = factsCandidates.find((f): f is NonNullable<typeof f> => !!f)
  if (Array.isArray(facts)) {
    for (const fact of facts) {
      if (
        fact &&
        typeof fact.factLabel === 'string' &&
        typeof fact.factValue === 'string' &&
        fact.factValue.trim()
      ) {
        items.push(`${fact.factLabel.trim()}: ${fact.factValue.trim()}`)
      }
    }
  }

  if (!items.length) return null

  // Dedupe case-insensitively but keep the first-encountered casing.
  const seen = new Set<string>()
  const unique: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(item)
    }
  }
  return unique
}

/**
 * Extract zpid from a Zillow URL
 * Supports formats like:
 * - https://www.zillow.com/homedetails/123-Main-St-San-Francisco-CA-94110/12345678_zpid/
 * - https://www.zillow.com/homes/12345678_zpid
 * - 12345678 (just the zpid)
 */
function extractZpid(input: string): string | null {
  const trimmed = input.trim()

  // If it's just a number, return it
  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }

  // Try to extract from URL
  const zpidMatch = trimmed.match(/(\d+)_zpid/)
  if (zpidMatch) {
    return zpidMatch[1]
  }

  return null
}

/**
 * Fetch property details from Zillow API
 */
async function fetchZillowProperty(
  zpid: string,
  rapidApiKey: string,
  host: string
): Promise<ZillowPropertyResponse> {
  const url = `https://${host}/property?zpid=${zpid}`

  const response = await fetchWithTimeout(url, {
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': host,
    },
    timeoutMs: ZILLOW_FETCH_TIMEOUT_MS,
    timeoutMessage: 'Zillow property fetch timed out',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Zillow API error: ${response.status} - ${text.slice(0, 200)}`
    )
  }

  return response.json()
}

/**
 * Fetch images from Zillow /images endpoint (separate from /property)
 * Returns flat array of image URLs
 */
async function fetchZillowImages(
  zpid: string,
  rapidApiKey: string,
  host: string
): Promise<string[]> {
  const url = `https://${host}/images?zpid=${zpid}`

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': host,
      },
      timeoutMs: ZILLOW_FETCH_TIMEOUT_MS,
      timeoutMessage: 'Zillow image fetch timed out',
    })

    if (!response.ok) {
      console.warn(
        `[fetchZillowImages] Failed to fetch images: ${response.status}`
      )
      return []
    }

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null
    const isStringArray = (value: unknown): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === 'string')

    const data: unknown = await response.json()
    const images =
      isRecord(data) && isStringArray(data.images) ? data.images : []
    if (isDev) {
      console.log(
        `[fetchZillowImages] Got ${images.length} images from /images endpoint`
      )
    }
    return images
  } catch (error) {
    console.warn('[fetchZillowImages] Error fetching images:', error)
    return []
  }
}

/**
 * Extract images from Zillow property response
 * Handles multiple response formats from different Zillow API endpoints
 */
function extractImages(data: ZillowPropertyResponse): string[] {
  const images: string[] = []
  const addedUrls = new Set<string>()

  // Helper to add unique image URLs
  const addImage = (url: string | undefined | null): boolean => {
    if (url && typeof url === 'string' && !addedUrls.has(url)) {
      images.push(url)
      addedUrls.add(url)
      return true
    }
    return false
  }

  // Log what fields are present for debugging
  const presentFields: string[] = []
  if (data.images)
    presentFields.push(
      `images(${Array.isArray(data.images) ? data.images.length : 'not array'})`
    )
  if (data.originalPhotos)
    presentFields.push(`originalPhotos(${data.originalPhotos.length})`)
  if (data.photos)
    presentFields.push(
      `photos(${Array.isArray(data.photos) ? data.photos.length : 'not array'})`
    )
  if (data.media)
    presentFields.push(
      `media(${Array.isArray(data.media) ? data.media.length : 'not array'})`
    )
  if (data.imgSrc) presentFields.push('imgSrc')
  if (isDev) {
    console.log(
      `[extractImages] Available fields: ${presentFields.join(', ') || 'none'}`
    )
  }

  // 1. Try simple flat array first (most common from /images endpoint)
  if (Array.isArray(data.images) && data.images.length > 0) {
    for (const url of data.images) {
      if (typeof url === 'string') {
        addImage(url)
      }
    }
    if (isDev) {
      console.log(`[extractImages] Found ${images.length} from images array`)
    }
  }

  // 2. Try originalPhotos with nested structure (highest quality)
  if (
    images.length === 0 &&
    data.originalPhotos &&
    data.originalPhotos.length > 0
  ) {
    for (const photo of data.originalPhotos) {
      // Try jpeg first, then webp
      const jpegUrls = photo.mixedSources?.jpeg
      const webpUrls = photo.mixedSources?.webp

      if (jpegUrls && jpegUrls.length > 0) {
        // Get the largest jpeg (last in array, sorted by width)
        const largest = jpegUrls[jpegUrls.length - 1]
        addImage(largest?.url)
      } else if (webpUrls && webpUrls.length > 0) {
        // Fall back to webp
        const largest = webpUrls[webpUrls.length - 1]
        addImage(largest?.url)
      }
    }
    if (isDev) {
      console.log(`[extractImages] Found ${images.length} from originalPhotos`)
    }
  }

  // 3. Try photos array with url field
  if (
    images.length === 0 &&
    Array.isArray(data.photos) &&
    data.photos.length > 0
  ) {
    for (const photo of data.photos) {
      addImage(photo?.url)
    }
    if (isDev) {
      console.log(`[extractImages] Found ${images.length} from photos array`)
    }
  }

  // 4. Try media array (alternative format)
  if (
    images.length === 0 &&
    Array.isArray(data.media) &&
    data.media.length > 0
  ) {
    for (const item of data.media) {
      if (!item.type || item.type === 'image') {
        addImage(item?.url)
      }
    }
    if (isDev) {
      console.log(`[extractImages] Found ${images.length} from media array`)
    }
  }

  // 5. Final fallback to single imgSrc
  if (images.length === 0 && data.imgSrc) {
    addImage(data.imgSrc)
    if (isDev) {
      console.log(`[extractImages] Using imgSrc fallback`)
    }
  }

  if (isDev) {
    console.log(`[extractImages] Total images extracted: ${images.length}`)
  }
  return images.slice(0, 20) // Limit to 20 images for comprehensive analysis
}

/**
 * POST /api/admin/generate-vibes-zillow
 *
 * Generate vibes for a property from Zillow URL or zpid.
 * Does NOT save to database - just returns the generated vibes for preview.
 */
export async function POST(req: Request): Promise<NextResponse> {
  // Authenticate. Header-only — URL query params leak to access logs,
  // Referer headers, and browser history.
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')

  if (!secret || headerSecret !== secret) {
    return ApiErrorHandler.unauthorized('Unauthorized')
  }

  const rateLimitResponse = await rateLimitAdminRoute(
    req,
    'admin:generate-vibes-zillow'
  )
  if (rateLimitResponse) return rateLimitResponse

  // Check for required API keys
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    return ApiErrorHandler.serviceUnavailable('RAPIDAPI_KEY not configured')
  }

  if (!isPaidRapidApiApproved()) {
    return ApiErrorHandler.serviceUnavailable(
      RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE
    )
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return ApiErrorHandler.serviceUnavailable(
      'OPENROUTER_API_KEY not configured'
    )
  }

  // Parse request. zpid legitimately arrives as a JSON number
  // ({"zpid": 12345678}), so coerce string|number to a string here and
  // reject other types with a 400 — extractZpid() must never receive a
  // non-string (it calls .trim()).
  let zillowInput: string
  try {
    const body = await req.json()
    const raw: unknown = body.zillowUrl || body.zpid
    if (raw === undefined || raw === null || raw === '') {
      throw new Error('Missing zillowUrl or zpid')
    }
    if (typeof raw === 'string') {
      zillowInput = raw
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      zillowInput = String(raw)
    } else {
      throw new Error('zillowUrl or zpid must be a string or number')
    }
  } catch {
    return ApiErrorHandler.badRequest(
      'Invalid request body. Provide zillowUrl or zpid.'
    )
  }

  // Extract zpid
  const zpid = extractZpid(zillowInput)
  if (!zpid) {
    return ApiErrorHandler.badRequest(
      `Could not extract zpid from: ${zillowInput}`
    )
  }

  const rapidApiHost =
    process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'

  try {
    // Fetch property details and images in parallel
    if (isDev) {
      console.log(`[generate-vibes-zillow] Fetching property ${zpid}...`)
    }
    const [zillowData, imagesFromEndpoint] = await Promise.all([
      fetchZillowProperty(zpid, rapidApiKey, rapidApiHost),
      fetchZillowImages(zpid, rapidApiKey, rapidApiHost),
    ])

    // Extract address parts
    const address =
      zillowData.address?.streetAddress ||
      zillowData.streetAddress ||
      'Unknown Address'
    const city = zillowData.address?.city || zillowData.city || 'Unknown'
    const state = zillowData.address?.state || zillowData.state || 'CA'
    const zipCode = zillowData.address?.zipcode || zillowData.zipcode || '00000'

    // Extract images from both sources and merge
    // Priority: /images endpoint (most complete), then /property response fields
    let images: string[]
    if (imagesFromEndpoint.length > 0) {
      // Use images from dedicated /images endpoint
      images = imagesFromEndpoint.slice(0, 20)
      if (isDev) {
        console.log(
          `[generate-vibes-zillow] Using ${images.length} images from /images endpoint`
        )
      }
    } else {
      // Fall back to images from /property response
      images = extractImages(zillowData)
      if (isDev) {
        console.log(
          `[generate-vibes-zillow] Using ${images.length} images from /property response`
        )
      }
    }

    if (images.length === 0) {
      return ApiErrorHandler.badRequest('No images found for this property')
    }

    // Build property object for vibes generation
    const property: Property = {
      id: `zillow-${zpid}`,
      zpid,
      address,
      city,
      state,
      zip_code: zipCode,
      price: zillowData.price || 0,
      bedrooms: zillowData.bedrooms || 0,
      bathrooms: zillowData.bathrooms || 0,
      square_feet: zillowData.livingArea || null,
      lot_size_sqft: zillowData.lotAreaValue || null,
      year_built: zillowData.yearBuilt || null,
      parking_spots: null,
      property_type: normalizePropertyType(
        zillowData.homeType || zillowData.propertyType || 'single_family'
      ),
      listing_status: 'active',
      images,
      description: zillowData.description || null,
      coordinates:
        zillowData.latitude && zillowData.longitude
          ? {
              type: 'Point',
              coordinates: [zillowData.longitude, zillowData.latitude],
            }
          : null,
      // INGEST-001: extract amenities from Zillow's structured fields
      // rather than hardcoding null. The LLM vibe generator now has real
      // amenity data to ground its tag/feature claims in.
      amenities: extractAmenities(zillowData),
      neighborhood_id: null,
      property_hash: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (isDev) {
      console.log(
        `[generate-vibes-zillow] Generating vibes for ${address}, ${city}...`
      )
      console.log(`[generate-vibes-zillow] Using ${images.length} images`)
    }

    // Generate vibes
    const vibesService = createVibesService()
    const result = await vibesService.generateVibes(property)

    if (isDev) {
      console.log(
        `[generate-vibes-zillow] Generated vibes in ${result.processingTimeMs}ms, cost: $${result.usage.estimatedCostUsd.toFixed(4)}`
      )
    }

    return NextResponse.json({
      ok: true,
      property: {
        zpid,
        address: property.address,
        city: property.city,
        state: property.state,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.square_feet,
        propertyType: property.property_type,
        images: images.slice(0, 5),
      },
      vibes: result.vibes,
      imagesAnalyzed: result.images.selectedImages.map((img) => ({
        url: img.url,
        category: img.category,
      })),
      usage: {
        estimatedCostUsd: result.usage.estimatedCostUsd,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
      },
      processingTimeMs: result.processingTimeMs,
    })
  } catch (error) {
    console.error('[generate-vibes-zillow] Error:', error)
    return ApiErrorHandler.serverError(
      error instanceof Error ? error.message : 'Unknown error',
      error
    )
  }
}
