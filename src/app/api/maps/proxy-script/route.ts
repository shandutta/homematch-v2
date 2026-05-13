import { NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/api/fetch-timeout'
import { shouldLoadGoogleMapsMarkerLibrary } from '@/lib/maps/config'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'

const getRequestIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Stable upstream Referer pinned to NEXT_PUBLIC_APP_URL. Pinning server-side
 * prevents an attacker who hits this proxy directly from spoofing the Referer
 * sent to Google in order to satisfy a key-allowlist on the upstream side.
 */
const getPinnedGoogleReferer = (): string | null => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return null
  try {
    return `${new URL(appUrl).origin}/`
  } catch {
    return null
  }
}

/**
 * Optional defense-in-depth: if the request has a Referer, require it to
 * match our app origin (or a Vercel preview URL for the same project). If
 * Referer is absent — common with strict privacy modes — we still serve,
 * but the IP rate limit still applies.
 */
const isSameOriginRequest = (request: Request): boolean => {
  const referer = request.headers.get('referer')
  if (!referer) return true
  let candidateOrigin: string
  try {
    candidateOrigin = new URL(referer).origin
  } catch {
    return false
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      if (candidateOrigin === new URL(appUrl).origin) return true
    } catch {
      // ignore
    }
  }
  // Allow same-host as the request itself (covers dev, Vercel previews).
  try {
    if (candidateOrigin === new URL(request.url).origin) return true
  } catch {
    // ignore
  }
  return false
}

const MAPS_TEST_STUB = `
  (function() {
    window.google = window.google || {}
    window.google.maps = window.google.maps || {}
    window.google.maps.marker = window.google.maps.marker || {}
    window.google.maps.marker.AdvancedMarkerElement = function() {
      this.addListener = function() {}
    }
    window.google.maps.Map = function(el) {
      if (el && !el.querySelector('.gm-style')) {
        var node = document.createElement('div')
        node.className = 'gm-style'
        node.style.width = '100%'
        node.style.height = '100%'
        node.style.display = 'block'
        el.appendChild(node)
      }
    }
    window.google.maps.Marker = function() {
      this.addListener = function() {}
    }
    window.google.maps.Size = function() {}
    window.google.maps.Point = function() {}
    window.google.maps.InfoWindow = function() {
      this.open = function() {}
    }
    if (window.initGoogleMaps) window.initGoogleMaps()
  })()
`

export async function GET(request: Request) {
  try {
    const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

    if (isTestMode) {
      return new NextResponse(MAPS_TEST_STUB, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Per-IP rate limit — this endpoint is unauthenticated and proxies a
    // paid Google API, so without a cap any anonymous client can drain quota.
    const rateLimited = await checkRateLimit(
      rateLimitKey('maps:proxy-script', getRequestIp(request))
    )
    if (rateLimited) return rateLimited

    // Block hot-linking from other origins. If a request has no Referer
    // (some privacy modes) we still serve.
    if (!isSameOriginRequest(request)) {
      return new NextResponse('// Forbidden', {
        status: 403,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

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
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(serverApiKey)}&libraries=${librariesParam}&loading=async&callback=initGoogleMaps`

    const googleReferer = getPinnedGoogleReferer()
    const response = await fetchWithTimeout(scriptUrl, {
      headers: googleReferer ? { referer: googleReferer } : undefined,
      timeoutMs: 10000,
      timeoutMessage: 'Google Maps script request timed out',
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
