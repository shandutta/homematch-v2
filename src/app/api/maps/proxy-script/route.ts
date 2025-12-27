import { NextResponse } from 'next/server'
import { shouldLoadGoogleMapsMarkerLibrary } from '@/lib/maps/config'

/**
 * Google Maps Script Proxy
 * Proxies the Google Maps JavaScript API without exposing the API key
 */
function getGoogleReferer(request: Request): string | null {
  const refererHeader = request.headers.get('referer')
  if (refererHeader) {
    try {
      return `${new URL(refererHeader).origin}/`
    } catch {
      // Ignore invalid referer header
    }
  }

  const originHeader = request.headers.get('origin')
  if (originHeader) {
    try {
      return `${new URL(originHeader).origin}/`
    } catch {
      // Ignore invalid origin header
    }
  }

  try {
    return `${new URL(request.url).origin}/`
  } catch {
    return null
  }
}

export async function GET(request: Request) {
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

    const libraries = new Set(['places', 'drawing'])
    if (shouldLoadGoogleMapsMarkerLibrary()) {
      libraries.add('marker')
    }
    const librariesParam = Array.from(libraries).join(',')

    // Fetch the actual Google Maps script
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${serverApiKey}&libraries=${librariesParam}&loading=async&callback=initGoogleMaps`

    const googleReferer = getGoogleReferer(request)
    const response = await fetch(scriptUrl, {
      headers: googleReferer ? { referer: googleReferer } : undefined,
    })

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
