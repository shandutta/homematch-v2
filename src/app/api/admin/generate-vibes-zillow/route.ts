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
import {
  extractAmenities,
  type ZillowPropertyResponse,
} from './extract-amenities'

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
  let modelOverride: string | undefined
  let imageCapOverride: number | undefined
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

    // Optional per-call model + imageCap overrides for the bake-off
    // backfill. When omitted, the VibesService defaults apply (current
    // production behavior: gemini-2.5-flash, cap=18).
    if (body.model !== undefined) {
      if (typeof body.model !== 'string' || body.model.trim().length === 0) {
        throw new Error('model must be a non-empty string')
      }
      modelOverride = body.model.trim()
    }
    if (body.imageCap !== undefined) {
      const capRaw = body.imageCap
      const cap =
        typeof capRaw === 'number'
          ? capRaw
          : typeof capRaw === 'string'
            ? Number(capRaw)
            : NaN
      if (!Number.isFinite(cap) || !Number.isInteger(cap) || cap < 1 || cap > 60) {
        throw new Error('imageCap must be an integer between 1 and 60')
      }
      imageCapOverride = cap
    }
  } catch (parseErr) {
    const message =
      parseErr instanceof Error
        ? parseErr.message
        : 'Invalid request body. Provide zillowUrl or zpid.'
    return ApiErrorHandler.badRequest(message)
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
      // PARKING-NULL: Zillow's response shape in ZillowPropertyResponse
      // (see extract-amenities.ts) exposes parking signals only as
      // booleans (`hasGarage`) and feature strings (`parkingFeatures`,
      // `resoFacts.parkingFeatures`). The 2026-05-13 prod sample
      // confirmed no numeric count field (no garageParkingCapacity, no
      // parkingCapacity, no garageSpaces) on any returned listing.
      // Leaving null here is intentional — we don't fabricate a count
      // from boolean evidence. The garage / parking-feature strings
      // already flow into `amenities` via extractAmenities(), which the
      // LLM uses for non-numeric reasoning.
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

    // Generate vibes. model + imageCap overrides are threaded through to
    // VibesService.generateVibes (bake-off path); when undefined the
    // service falls back to the production defaults.
    const vibesService = createVibesService()
    const result = await vibesService.generateVibes(property, {
      model: modelOverride,
      imageCap: imageCapOverride,
    })

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
