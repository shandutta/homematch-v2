import { NextResponse } from 'next/server'
import { createVibesService } from '@/lib/services/vibes'
import type { Property } from '@/lib/schemas/property'

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
  [key: string]: unknown
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

  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': host,
    },
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
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': host,
      },
    })

    if (!response.ok) {
      console.warn(
        `[fetchZillowImages] Failed to fetch images: ${response.status}`
      )
      return []
    }

    const data = (await response.json()) as {
      images?: string[]
      [k: string]: unknown
    }
    const images = Array.isArray(data.images) ? data.images : []
    console.log(
      `[fetchZillowImages] Got ${images.length} images from /images endpoint`
    )
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
  console.log(
    `[extractImages] Available fields: ${presentFields.join(', ') || 'none'}`
  )

  // 1. Try simple flat array first (most common from /images endpoint)
  if (Array.isArray(data.images) && data.images.length > 0) {
    for (const url of data.images) {
      if (typeof url === 'string') {
        addImage(url)
      }
    }
    console.log(`[extractImages] Found ${images.length} from images array`)
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
    console.log(`[extractImages] Found ${images.length} from originalPhotos`)
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
    console.log(`[extractImages] Found ${images.length} from photos array`)
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
    console.log(`[extractImages] Found ${images.length} from media array`)
  }

  // 5. Final fallback to single imgSrc
  if (images.length === 0 && data.imgSrc) {
    addImage(data.imgSrc)
    console.log(`[extractImages] Using imgSrc fallback`)
  }

  console.log(`[extractImages] Total images extracted: ${images.length}`)
  return images.slice(0, 20) // Limit to 20 images for comprehensive analysis
}

/**
 * POST /api/admin/generate-vibes-zillow
 *
 * Generate vibes for a property from Zillow URL or zpid.
 * Does NOT save to database - just returns the generated vibes for preview.
 */
export async function POST(req: Request): Promise<NextResponse> {
  // Authenticate
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const url = new URL(req.url)
  const headerSecret = req.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || (headerSecret !== secret && querySecret !== secret)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check for required API keys
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    return NextResponse.json(
      { ok: false, error: 'RAPIDAPI_KEY not configured' },
      { status: 503 }
    )
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'OPENROUTER_API_KEY not configured' },
      { status: 503 }
    )
  }

  // Parse request
  let zillowInput: string
  try {
    const body = await req.json()
    zillowInput = body.zillowUrl || body.zpid
    if (!zillowInput) {
      throw new Error('Missing zillowUrl or zpid')
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body. Provide zillowUrl or zpid.' },
      { status: 400 }
    )
  }

  // Extract zpid
  const zpid = extractZpid(zillowInput)
  if (!zpid) {
    return NextResponse.json(
      { ok: false, error: `Could not extract zpid from: ${zillowInput}` },
      { status: 400 }
    )
  }

  const rapidApiHost = process.env.RAPIDAPI_HOST || 'zillow-com1.p.rapidapi.com'

  try {
    // Fetch property details and images in parallel
    console.log(`[generate-vibes-zillow] Fetching property ${zpid}...`)
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
      console.log(
        `[generate-vibes-zillow] Using ${images.length} images from /images endpoint`
      )
    } else {
      // Fall back to images from /property response
      images = extractImages(zillowData)
      console.log(
        `[generate-vibes-zillow] Using ${images.length} images from /property response`
      )
    }

    if (images.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No images found for this property' },
        { status: 400 }
      )
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
      property_type: (
        zillowData.homeType ||
        zillowData.propertyType ||
        'single_family'
      )
        .toLowerCase()
        .replace(/\s+/g, '_') as Property['property_type'],
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
      amenities: null,
      neighborhood_id: null,
      property_hash: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log(
      `[generate-vibes-zillow] Generating vibes for ${address}, ${city}...`
    )
    console.log(`[generate-vibes-zillow] Using ${images.length} images`)

    // Generate vibes
    const vibesService = createVibesService()
    const result = await vibesService.generateVibes(property)

    console.log(
      `[generate-vibes-zillow] Generated vibes in ${result.processingTimeMs}ms, cost: $${result.usage.estimatedCostUsd.toFixed(4)}`
    )

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
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
