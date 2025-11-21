/**
 * Zillow API Client
 *
 * Comprehensive client for interacting with Zillow API via RapidAPI
 * See docs/RAPIDAPI_ZILLOW.md for complete API documentation
 */

import crypto from 'node:crypto'

export interface ZillowProperty {
  zpid: string
  address: string
  city: string
  state: string
  zipcode: string
  price: number
  bedrooms: number
  bathrooms: number
  livingArea?: number
  propertyType: string
  photos: string[]
  description?: string
  latitude?: number
  longitude?: number
  lotSize?: number
  yearBuilt?: number
  listingStatus: string
}

export interface PropertySearchParams {
  location?: string
  home_type?: string[]
  price_min?: number
  price_max?: number
  beds_min?: number
  beds_max?: number
  baths_min?: number
  baths_max?: number
  sqft_min?: number
  sqft_max?: number
  lot_size_min?: number
  lot_size_max?: number
  year_built_min?: number
  year_built_max?: number
  page?: number
  sort?: string
}

export interface PropertySearchResponse {
  properties: ZillowProperty[]
  totalCount: number
  page: number
  hasNextPage: boolean
}

interface ZillowSearchApiResponse {
  properties?: ZillowProperty[]
  totalCount?: number
  hasNextPage?: boolean
}

interface ZillowPropertyApiResponse {
  property?: PropertyDetails
}

interface ZillowHistoryApiResponse {
  history?: PropertyHistory
}

interface ZillowComparablesApiResponse {
  comparables?: ComparableProperty[]
}

interface ZillowNeighborhoodApiResponse {
  neighborhood?: NeighborhoodInfo
}

interface ZillowTrendsApiResponse {
  trends?: MarketTrends
}

export interface PropertyDetails extends ZillowProperty {
  amenities?: string[]
  schools?: Array<{
    name: string
    rating?: number
    distance?: number
  }>
  neighborhood?: {
    name: string
    walkScore?: number
    transitScore?: number
  }
}

export interface PropertyHistory {
  zpid: string
  priceHistory: Array<{
    date: string
    price: number
    event: string
  }>
  taxHistory: Array<{
    year: number
    value: number
  }>
}

export interface ComparableProperty {
  zpid: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  livingArea: number
  distance: number
  similarity: number
}

export interface NeighborhoodInfo {
  name: string
  city: string
  state: string
  median_price: number
  price_per_sqft: number
  market_trends: {
    price_change_1m: number
    price_change_3m: number
    price_change_1y: number
  }
  demographics: {
    population: number
    median_age: number
    median_income: number
  }
  amenities: {
    walk_score: number
    transit_score: number
    bike_score: number
  }
}

export interface MarketTrends {
  location: string
  time_period: string
  median_price: number
  price_trends: Array<{
    month: string
    median_price: number
    change_percentage: number
  }>
  inventory_levels: {
    active_listings: number
    days_on_market: number
    price_reductions: number
  }
}

export class ZillowAPIClient {
  private baseURL = 'https://zillow-com1.p.rapidapi.com'
  private apiKey: string
  private rateLimitDelay = 2000 // 2 seconds between requests
  private maxRetries = 3

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Search for properties with filters
   */
  async searchProperties(
    params: PropertySearchParams
  ): Promise<PropertySearchResponse> {
    const endpoint = '/propertyExtendedSearch'
    const queryParams = new URLSearchParams()

    // Add all parameters to query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams.append(key, value.join(','))
        } else {
          queryParams.append(key, value.toString())
        }
      }
    })

    const response = await this.makeRequest<ZillowSearchApiResponse>(
      `${endpoint}?${queryParams}`
    )

    return {
      properties: response.properties || [],
      totalCount: response.totalCount || 0,
      page: params.page || 1,
      hasNextPage: response.hasNextPage || false,
    }
  }

  /**
   * Get detailed property information
   */
  async getPropertyDetails(zpid: string): Promise<PropertyDetails | null> {
    const endpoint = '/property-details'
    const params = new URLSearchParams({ zpid })

    try {
      const response = await this.makeRequest<ZillowPropertyApiResponse>(
        `${endpoint}?${params}`
      )
      return response.property || null
    } catch (error) {
      if (error instanceof Error && this.isNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Get property price and tax history
   */
  async getPropertyHistory(zpid: string): Promise<PropertyHistory | null> {
    const endpoint = '/property-history'
    const params = new URLSearchParams({ zpid })

    try {
      const response = await this.makeRequest<ZillowHistoryApiResponse>(
        `${endpoint}?${params}`
      )
      return response.history || null
    } catch (error) {
      if (error instanceof Error && this.isNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Get comparable properties for market analysis
   */
  async getComparableProperties(
    zpid: string,
    radius: number = 0.5
  ): Promise<ComparableProperty[]> {
    const endpoint = '/comparable-properties'
    const params = new URLSearchParams({
      zpid,
      radius: radius.toString(),
    })

    try {
      const response = await this.makeRequest<ZillowComparablesApiResponse>(
        `${endpoint}?${params}`
      )
      return response.comparables || []
    } catch (error) {
      if (error instanceof Error && this.isNotFoundError(error)) {
        return []
      }
      throw error
    }
  }

  /**
   * Get neighborhood information and statistics
   */
  async getNeighborhoodInfo(
    city: string,
    state: string
  ): Promise<NeighborhoodInfo | null> {
    const endpoint = '/neighborhood-info'
    const params = new URLSearchParams({ city, state })

    try {
      const response = await this.makeRequest<ZillowNeighborhoodApiResponse>(
        `${endpoint}?${params}`
      )
      return response.neighborhood || null
    } catch (error) {
      if (error instanceof Error && this.isNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Get market trends for a location
   */
  async getMarketTrends(
    location: string,
    timePeriod: string = '12m'
  ): Promise<MarketTrends | null> {
    const endpoint = '/market-trends'
    const params = new URLSearchParams({
      location,
      time_period: timePeriod,
    })

    try {
      const response = await this.makeRequest<ZillowTrendsApiResponse>(
        `${endpoint}?${params}`
      )
      return response.trends || null
    } catch (error) {
      if (error instanceof Error && this.isNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Batch search properties for multiple locations
   */
  async batchSearchProperties(
    locations: string[],
    baseParams: Omit<PropertySearchParams, 'location'> = {}
  ): Promise<Map<string, PropertySearchResponse>> {
    const results = new Map<string, PropertySearchResponse>()

    for (const location of locations) {
      try {
        await this.delay(this.rateLimitDelay)
        const response = await this.searchProperties({
          ...baseParams,
          location,
        })
        results.set(location, response)
      } catch (error) {
        console.warn(`Failed to search properties for ${location}:`, error)
        results.set(location, {
          properties: [],
          totalCount: 0,
          page: 1,
          hasNextPage: false,
        })
      }
    }

    return results
  }

  /**
   * Make HTTP request to Zillow API with error handling and retries
   */
  private async makeRequest<T>(url: string): Promise<T> {
    let attempt = 0

    while (attempt < this.maxRetries) {
      try {
        await this.delay(this.rateLimitDelay)

        const response = await fetch(`${this.baseURL}${url}`, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
            Accept: 'application/json',
          },
        })

        if (response.ok) {
          return await response.json()
        }

        // Handle specific error codes
        if (response.status === 404) {
          throw new ZillowAPIError('Property not found', 404)
        }

        if (response.status === 429) {
          throw new ZillowAPIError('Rate limit exceeded', 429)
        }

        if (response.status === 403) {
          throw new ZillowAPIError('Invalid API key or quota exceeded', 403)
        }

        throw new ZillowAPIError(
          `API request failed: ${response.status}`,
          response.status
        )
      } catch (error) {
        attempt++

        if (error instanceof ZillowAPIError) {
          if (error.status === 429 && attempt < this.maxRetries) {
            // Rate limit - wait longer before retry
            await this.delay(5000)
            continue
          }
          throw error
        }

        if (attempt >= this.maxRetries) {
          throw new ZillowAPIError(
            `Request failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`
          )
        }

        // Exponential backoff for other errors
        const delay = Math.pow(2, attempt) * 1000
        await this.delay(delay)
      }
    }

    throw new ZillowAPIError(`Request failed after ${this.maxRetries} attempts`)
  }

  /**
   * Check if error is a 404 Not Found
   */
  private isNotFoundError(
    error: Error | ZillowAPIError
  ): error is ZillowAPIError {
    return error instanceof ZillowAPIError && error.status === 404
  }

  /**
   * Delay execution for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Custom error class for Zillow API errors
 */
export class ZillowAPIError extends Error {
  public status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ZillowAPIError'
    this.status = status
  }
}

/**
 * Create a Zillow API client instance
 */
export function createZillowClient(apiKey?: string): ZillowAPIClient {
  const key = apiKey || process.env.RAPIDAPI_KEY

  if (!key) {
    throw new Error(
      'Zillow API key is required. Set RAPIDAPI_KEY environment variable.'
    )
  }

  return new ZillowAPIClient(key)
}

/**
 * Utility functions for working with Zillow data
 */
export const ZillowUtils = {
  /**
   * Map Zillow property type to HomeMatch enum
   */
  mapPropertyType(zillowType: string): string {
    const typeMap: Record<string, string> = {
      SINGLE_FAMILY: 'single_family',
      CONDO: 'condo',
      TOWNHOUSE: 'townhome',
      APARTMENT: 'multi_family',
      MULTI_FAMILY: 'multi_family',
      MANUFACTURED: 'manufactured',
      LOT: 'land',
    }
    return typeMap[zillowType?.toUpperCase()] || 'other'
  },

  /**
   * Generate property hash for deduplication
   */
  generatePropertyHash(property: ZillowProperty): string {
    const hashInput = `${property.address}-${property.bedrooms}-${property.bathrooms}-${property.price}`
    return crypto.createHash('md5').update(hashInput).digest('hex')
  },

  /**
   * Validate image URLs
   */
  async validateImageUrls(
    urls: string[],
    maxImages: number = 20
  ): Promise<string[]> {
    const validUrls: string[] = []
    const limitedUrls = urls.slice(0, maxImages)

    for (const url of limitedUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (response.ok) {
          validUrls.push(url)
        }
      } catch (_error) {
        console.warn(`Invalid image URL: ${url}`)
      }
    }

    return validUrls
  },

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  },

  /**
   * Calculate price per square foot
   */
  calculatePricePerSqft(price: number, sqft?: number): number | null {
    if (!sqft || sqft <= 0) return null
    return Math.round(price / sqft)
  },
}
