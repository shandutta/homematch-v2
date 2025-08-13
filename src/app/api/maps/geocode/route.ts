import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRateLimiter } from '@/lib/utils/rate-limit'

const geocodeRequestSchema = z.object({
  address: z.string().min(1).max(200),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
  }).optional(),
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

/**
 * Secure Geocoding API Proxy
 * Rate-limited server-side proxy for Google Maps Geocoding API
 */
export async function POST(request: NextRequest) {
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
      params.append('bounds', `${bounds.south},${bounds.west}|${bounds.north},${bounds.east}`)
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    
    const response = await fetch(geocodeUrl)
    const data = await response.json()

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: 'Geocoding failed', status: data.status },
        { status: 400 }
      )
    }

    // Return sanitized results
    const results: GeocodeResult[] = data.results.map((result: any) => ({
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