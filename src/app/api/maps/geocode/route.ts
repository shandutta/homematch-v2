import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserFromRequest } from '@/lib/api/auth'
import { createApiClient } from '@/lib/supabase/server'
import { apiRateLimiter } from '@/lib/utils/rate-limit'
import { ApiErrorHandler } from '@/lib/api/errors'
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
export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const auth = await requireUserFromRequest(supabase, request)

    if (auth.response) {
      return auth.response
    }

    // Rate limiting by authenticated user to avoid exposing paid Maps usage to anonymous callers
    const rateLimitResult = await apiRateLimiter.check(auth.user.id)

    if (!rateLimitResult.success) {
      return ApiErrorHandler.tooManyRequests()
    }

    const serverApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY

    if (!serverApiKey) {
      return ApiErrorHandler.serviceUnavailable('Geocoding service unavailable')
    }

    const body = await request.json()
    const parsed = geocodeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrorHandler.fromZodError(parsed.error)
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
      return ApiErrorHandler.badRequest('Geocoding failed', { status })
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
    return ApiErrorHandler.serverError('Internal server error', error)
  }
}
