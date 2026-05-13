import { noStoreJson } from '@/lib/api/cache-control'
import { ApiErrorHandler } from '@/lib/api/errors'

/**
 * Secure Google Maps Script Loader API
 * Serves the Google Maps JavaScript API script with proper headers and validation
 */
export async function GET() {
  try {
    const serverApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY

    if (!serverApiKey) {
      return ApiErrorHandler.serviceUnavailable('Maps service unavailable')
    }

    // The proxy fetches the actual Google Maps script server-side so the
    // API key never reaches the browser. We only expose the proxy URL.
    return noStoreJson({
      scriptUrl: '/api/maps/proxy-script',
      status: 'ready',
    })
  } catch (error) {
    console.error('Maps script endpoint error:', error)
    return ApiErrorHandler.serverError('Maps service unavailable', error)
  }
}
