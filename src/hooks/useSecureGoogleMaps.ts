'use client'

import { useState, useCallback } from 'react'
import {
  SecureGeocodeClient,
  SecurePlacesClient,
  type GeocodeResult,
  type PlacePrediction as AutocompleteResult,
} from '@/lib/maps/secure-client'

// Hook for secure Google Maps API interactions

export function useSecureGoogleMaps() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Secure geocoding through server proxy
  const geocodeAddress = useCallback(
    async (
      address: string,
      options?: {
        bounds?: {
          north: number
          south: number
          east: number
          west: number
        }
      }
    ): Promise<GeocodeResult[]> => {
      setIsLoading(true)
      setError(null)

      try {
        const results = await SecureGeocodeClient.geocode({
          address,
          bounds: options?.bounds,
        })

        return results
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Geocoding failed'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Secure places autocomplete through server proxy
  const getPlacesPredictions = useCallback(
    async (
      input: string,
      options?: {
        types?: string[]
        location?: { lat: number; lng: number }
        radius?: number
        strictbounds?: boolean
      }
    ): Promise<AutocompleteResult[]> => {
      if (input.length < 2) {
        return [] // Don't make requests for very short inputs
      }

      setIsLoading(true)
      setError(null)

      try {
        const results = await SecurePlacesClient.autocomplete({
          input,
          types: options?.types,
          location: options?.location,
          radius: options?.radius,
          strictbounds: options?.strictbounds,
        })

        return results
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Places search failed'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Debounced autocomplete for real-time search
  const [autocompleteTimeout, setAutocompleteTimeout] =
    useState<NodeJS.Timeout | null>(null)

  const debouncedPlacesPredictions = useCallback(
    async (
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
    },
    [getPlacesPredictions, autocompleteTimeout]
  )

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
