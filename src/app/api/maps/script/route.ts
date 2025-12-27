import { NextResponse } from 'next/server'

/**
 * Secure Google Maps Script Loader API
 * Serves the Google Maps JavaScript API script with proper headers and validation
 */
export async function GET() {
  try {
    const serverApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY

    if (!serverApiKey) {
      return NextResponse.json(
        { error: 'Maps service unavailable' },
        { status: 503 }
      )
    }

    // Build the script URL with restricted server key (not exposed to client)
    const _scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${serverApiKey}&libraries=places,drawing&loading=async&callback=initGoogleMaps`

    // Return the script URL to the client (without exposing the key)
    return NextResponse.json({
      scriptUrl: '/api/maps/proxy-script',
      status: 'ready',
    })
  } catch (error) {
    console.error('Maps script endpoint error:', error)
    return NextResponse.json(
      { error: 'Maps service unavailable' },
      { status: 500 }
    )
  }
}
