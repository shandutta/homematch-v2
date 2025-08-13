'use client'

import { useState, useCallback } from 'react'

// Types for API responses
interface GeocodeResult {
  formatted_address: string
  geometry: {
    location: { lat: number; lng: number }
    location_type: string
  }
  place_id: string
  types: string[]
}

interface AutocompleteResult {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  types: string[]
}

interface GeocodeResponse {
  results: GeocodeResult[]
  status: string
}

interface AutocompleteResponse {
  predictions: AutocompleteResult[]
  status: string
}

// Rate limiting on client side as well
class ClientRateLimit {
  private requests: number[] = []
  private readonly maxRequests = 10
  private readonly windowMs = 60000 // 1 minute

  canMakeRequest(): boolean {
    const now = Date.now()
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      return false
    }
    
    this.requests.push(now)
    return true
  }
}

const geocodeRateLimit = new ClientRateLimit()
const autocompleteRateLimit = new ClientRateLimit()

export function useSecureGoogleMaps() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Secure geocoding through server proxy
  const geocodeAddress = useCallback(async (
    address: string,
    options?: {
      country?: string
      administrative_area?: string
      locality?: string
    }
  ): Promise<GeocodeResult[]> => {
    if (!geocodeRateLimit.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          components: options,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: GeocodeResponse = await response.json()
      return data.results

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Geocoding failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Secure places autocomplete through server proxy
  const getPlacesPredictions = useCallback(async (
    input: string,
    options?: {
      types?: 'address' | 'establishment' | 'geocode' | '(regions)' | '(cities)'
      country?: string
      location?: { lat: number; lng: number }
      radius?: number
    }
  ): Promise<AutocompleteResult[]> => {
    if (!autocompleteRateLimit.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    if (input.length < 2) {
      return [] // Don't make requests for very short inputs
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/maps/places/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          types: options?.types,
          components: options?.country ? { country: options.country } : undefined,
          location: options?.location,
          radius: options?.radius,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: AutocompleteResponse = await response.json()
      return data.predictions

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Places search failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced autocomplete for real-time search
  const [autocompleteTimeout, setAutocompleteTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const debouncedPlacesPredictions = useCallback(async (
    input: string,
    options?: Parameters<typeof getPlacesPredictions>[1],
    debounceMs: number = 300
  ): Promise<AutocompleteResult[]> => {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout)
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        try {
          const results = await getPlacesPredictions(input, options)
          resolve(results)
        } catch (error) {
          reject(error)
        }
      }, debounceMs)

      setAutocompleteTimeout(timeout)
    })
  }, [getPlacesPredictions, autocompleteTimeout])

  return {
    // State
    isLoading,
    error,
    
    // Methods
    geocodeAddress,
    getPlacesPredictions,
    debouncedPlacesPredictions,
    
    // Utilities
    clearError: () => setError(null),
  }
}