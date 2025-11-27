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
  originalPhotos?: Array<{ mixedSources?: { jpeg?: Array<{ url?: string }> } }>
  photos?: Array<{ url?: string }>
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
 * Extract images from Zillow property response
 */
function extractImages(data: ZillowPropertyResponse): string[] {
  const images: string[] = []

  // Try originalPhotos first (highest quality)
  if (data.originalPhotos) {
    for (const photo of data.originalPhotos) {
      const jpegUrls = photo.mixedSources?.jpeg
      if (jpegUrls && jpegUrls.length > 0) {
        // Get the largest jpeg
        const largest = jpegUrls[jpegUrls.length - 1]
        if (largest?.url) {
          images.push(largest.url)
        }
      }
    }
  }

  // Fall back to photos array
  if (images.length === 0 && data.photos) {
    for (const photo of data.photos) {
      if (photo.url) {
        images.push(photo.url)
      }
    }
  }

  // Fall back to imgSrc
  if (images.length === 0 && data.imgSrc) {
    images.push(data.imgSrc)
  }

  return images.slice(0, 10) // Limit to 10 images
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
    // Fetch property from Zillow
    console.log(`[generate-vibes-zillow] Fetching property ${zpid}...`)
    const zillowData = await fetchZillowProperty(
      zpid,
      rapidApiKey,
      rapidApiHost
    )

    // Extract address parts
    const address =
      zillowData.address?.streetAddress ||
      zillowData.streetAddress ||
      'Unknown Address'
    const city = zillowData.address?.city || zillowData.city || 'Unknown'
    const state = zillowData.address?.state || zillowData.state || 'CA'
    const zipCode = zillowData.address?.zipcode || zillowData.zipcode || '00000'

    // Extract images
    const images = extractImages(zillowData)
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
