import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRateLimiter } from '@/lib/utils/rate-limit'
import { isValidLatLng, boundingBoxSchema } from '@/lib/utils/coordinates'

const geocodeRequestSchema = z.object({
  address: z.string().min(1).max(200),
  bounds: boundingBoxSchema.optional(),
})

type GeocodeResult = {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
    location_type: string
  }
  place_id: string
  types: string[]
}

// Google Maps Geocoding API response interfaces
interface GoogleGeocodeResult {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
    location_type: string
  }
  place_id: string
  types: string[]
}

/**
 * Secure Geocoding API Proxy
 * Rate-limited server-side proxy for Google Maps Geocoding API
 */
export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await apiRateLimiter.check(clientIP)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const serverApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY

    if (!serverApiKey) {
      return NextResponse.json(
        { error: 'Geocoding service unavailable' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = geocodeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { address, bounds } = parsed.data

    // Build Google Maps Geocoding API URL
    const params = new URLSearchParams({
      address,
      key: serverApiKey,
    })

    if (bounds) {
      params.append(
        'bounds',
        `${bounds.south},${bounds.west}|${bounds.north},${bounds.east}`
      )
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?${params}`

    const response = await fetch(geocodeUrl)
    const data: unknown = await response.json()

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null
    const isGeocodeResult = (value: unknown): value is GoogleGeocodeResult =>
      isRecord(value) &&
      typeof value.formatted_address === 'string' &&
      isRecord(value.geometry) &&
      isRecord(value.geometry.location) &&
      typeof value.geometry.location.lat === 'number' &&
      typeof value.geometry.location.lng === 'number' &&
      typeof value.geometry.location_type === 'string' &&
      typeof value.place_id === 'string' &&
      Array.isArray(value.types)

    const status = isRecord(data) ? data.status : undefined

    if (status !== 'OK') {
      return NextResponse.json(
        { error: 'Geocoding failed', status },
        { status: 400 }
      )
    }

    // Return sanitized results with coordinate validation
    const resultsRaw =
      isRecord(data) && Array.isArray(data.results)
        ? data.results.filter(isGeocodeResult)
        : []
    const results: GeocodeResult[] = resultsRaw
      .filter((result: GoogleGeocodeResult) => {
        // Validate coordinates before returning
        const coords = {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        }
        return isValidLatLng(coords)
      })
      .map((result: GoogleGeocodeResult) => ({
        formatted_address: result.formatted_address,
        geometry: {
          location: result.geometry.location,
          location_type: result.geometry.location_type,
        },
        place_id: result.place_id,
        types: result.types,
      }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Geocoding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
