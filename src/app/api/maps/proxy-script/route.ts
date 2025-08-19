import { NextResponse } from 'next/server'

/**
 * Google Maps Script Proxy
 * Proxies the Google Maps JavaScript API without exposing the API key
 */
export async function GET() {
  try {
    const serverApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY

    if (!serverApiKey) {
      return new NextResponse('// Maps service unavailable', {
        status: 503,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Fetch the actual Google Maps script
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${serverApiKey}&libraries=places&loading=async&callback=initGoogleMaps`

    const response = await fetch(scriptUrl)

    if (!response.ok) {
      return new NextResponse('// Failed to load maps script', {
        status: 503,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    const script = await response.text()

    return new NextResponse(script, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        Vary: 'Accept-Encoding',
      },
    })
  } catch (error) {
    console.error('Maps script proxy error:', error)
    return new NextResponse('// Maps script proxy error', {
      status: 500,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }
}
