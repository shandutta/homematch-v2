/**
 * Secure Google Maps Client
 * Client-side utilities for accessing Google Maps APIs through secure server proxies
 */

export interface GeocodeRequest {
  address: string
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

export interface GeocodeResult {
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

export interface PlacesAutocompleteRequest {
  input: string
  location?: {
    lat: number
    lng: number
  }
  radius?: number
  types?: string[]
  strictbounds?: boolean
}

export interface PlacePrediction {
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

/**
 * Rate-limited secure geocoding client
 */
export class SecureGeocodeClient {
  private static lastRequest = 0
  private static readonly RATE_LIMIT_MS = 1000 // 1 request per second

  static async geocode(request: GeocodeRequest): Promise<GeocodeResult[]> {
    // Client-side rate limiting
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest
    
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      await new Promise(resolve => 
        setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest)
      )
    }
    
    this.lastRequest = Date.now()

    try {
      const response = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Geocoding failed')
      }

      const data = await response.json()
      return data.results
    } catch (error) {
      console.error('Secure geocoding error:', error)
      throw error
    }
  }
}

/**
 * Rate-limited secure places autocomplete client
 */
export class SecurePlacesClient {
  private static lastRequest = 0
  private static readonly RATE_LIMIT_MS = 500 // 2 requests per second max
  private static cache = new Map<string, { data: PlacePrediction[], timestamp: number }>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static async autocomplete(request: PlacesAutocompleteRequest): Promise<PlacePrediction[]> {
    // Check cache first
    const cacheKey = JSON.stringify(request)
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    // Client-side rate limiting
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest
    
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      await new Promise(resolve => 
        setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest)
      )
    }
    
    this.lastRequest = Date.now()

    try {
      const response = await fetch('/api/maps/places/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Places autocomplete failed')
      }

      const data = await response.json()
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: data.predictions,
        timestamp: Date.now(),
      })

      // Clean old cache entries periodically
      if (this.cache.size > 100) {
        this.cleanCache()
      }

      return data.predictions
    } catch (error) {
      console.error('Secure places autocomplete error:', error)
      throw error
    }
  }

  private static cleanCache() {
    const now = Date.now()
    const toDelete: string[] = []
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        toDelete.push(key)
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key))
  }
}