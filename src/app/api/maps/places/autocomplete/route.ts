import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRateLimiter } from '@/lib/utils/rate-limit'

const placesAutocompleteSchema = z.object({
  input: z.string().min(1).max(100),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  radius: z.number().min(1).max(50000).optional(),
  types: z.array(z.string()).optional(),
  strictbounds: z.boolean().optional(),
})

type PlacePrediction = {
  description: string
  place_id: string
  types: string[]
  matched_substrings: Array<{
    length: number
    offset: number
  }>
  structured_formatting: {
    main_text: string
    secondary_text?: string
  }
}

// Google Places Autocomplete API response interfaces
interface GooglePlacePrediction {
  description: string
  place_id: string
  types: string[]
  matched_substrings: Array<{
    length: number
    offset: number
  }>
  structured_formatting?: {
    main_text: string
    secondary_text?: string
  }
}

/**
 * Secure Places Autocomplete API Proxy
 * Rate-limited server-side proxy for Google Maps Places Autocomplete API
 */
export async function POST(request: Request) {
  try {
    // Rate limiting by IP (more restrictive for Places API due to cost)
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
        { error: 'Places service unavailable' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = placesAutocompleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { input, location, radius, types, strictbounds } = parsed.data

    // Build Google Maps Places Autocomplete API URL
    const params = new URLSearchParams({
      input,
      key: serverApiKey,
    })

    if (location) {
      params.append('location', `${location.lat},${location.lng}`)
    }

    if (radius) {
      params.append('radius', radius.toString())
    }

    if (types && types.length > 0) {
      params.append('types', types.join('|'))
    }

    if (strictbounds) {
      params.append('strictbounds', 'true')
    }

    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`

    const response = await fetch(autocompleteUrl)
    const data = await response.json()

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null

    if (!isRecord(data) || data.status !== 'OK') {
      if (isRecord(data) && data.status === 'ZERO_RESULTS') {
        return NextResponse.json({ predictions: [] })
      }

      return NextResponse.json(
        { error: 'Places autocomplete failed', status: data?.status },
        { status: 400 }
      )
    }

    // Return sanitized predictions
    const rawPredictions = Array.isArray(data.predictions)
      ? data.predictions
      : []
    const predictions: PlacePrediction[] = rawPredictions
      .filter((prediction): prediction is GooglePlacePrediction => {
        if (!isRecord(prediction)) return false
        return (
          typeof prediction.description === 'string' &&
          typeof prediction.place_id === 'string' &&
          Array.isArray(prediction.types)
        )
      })
      .map((prediction) => ({
        description: prediction.description,
        place_id: prediction.place_id,
        types: prediction.types,
        matched_substrings: prediction.matched_substrings || [],
        structured_formatting: {
          main_text: prediction.structured_formatting?.main_text || '',
          secondary_text: prediction.structured_formatting?.secondary_text,
        },
      }))

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error('Places Autocomplete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
