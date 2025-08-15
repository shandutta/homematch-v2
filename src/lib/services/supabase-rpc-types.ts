/**
 * Supabase RPC Type Definitions
 * 
 * Provides type-safe RPC function calls for custom Supabase database functions.
 * Eliminates the need for `(supabase as any)` casts throughout the codebase.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Property } from '@/types/database'

// ============================================================================
// RPC FUNCTION PARAMETER TYPES
// ============================================================================

// Base interface for all RPC parameters
interface BaseRPCParams {
  [key: string]: unknown
}

export interface GetPropertiesWithinRadiusParams extends BaseRPCParams {
  center_lat: number
  center_lng: number
  radius_km: number
  result_limit: number
}

export interface GetPropertiesInBoundsParams extends BaseRPCParams {
  north_lat: number
  south_lat: number
  east_lng: number
  west_lng: number
  result_limit: number
}

export interface CalculateDistanceParams extends BaseRPCParams {
  lat1: number
  lng1: number
  lat2: number
  lng2: number
}

export interface GetWalkabilityScoreParams extends BaseRPCParams {
  center_lat: number
  center_lng: number
}

export interface GetTransitScoreParams extends BaseRPCParams {
  center_lat: number
  center_lng: number
}

export interface GetNeighborhoodStatsParams extends BaseRPCParams {
  neighborhood_uuid: string
}

export interface GetUserInteractionSummaryParams extends BaseRPCParams {
  p_user_id: string
}

export interface GetMarketTrendsParams extends BaseRPCParams {
  timeframe: 'weekly' | 'monthly' | 'quarterly'
  months_back: number
}

export interface GetPropertyMarketComparisonsParams extends BaseRPCParams {
  target_property_id: string
  radius_km: number
}

export interface GetMarketVelocityParams extends BaseRPCParams {
  target_neighborhood_id: string | null
}

export interface GetSimilarPropertiesParams extends BaseRPCParams {
  target_property_id: string
  radius_km: number
  result_limit: number
}

export interface GetNeighborhoodsInBoundsParams extends BaseRPCParams {
  north_lat: number
  south_lat: number
  east_lng: number
  west_lng: number
}

export interface GetPropertiesByDistanceParams extends BaseRPCParams {
  center_lat: number
  center_lng: number
  max_distance_km: number
  result_limit: number
}

export interface GetPropertyClustersParams extends BaseRPCParams {
  north_lat: number
  south_lat: number
  east_lng: number
  west_lng: number
  zoom_level: number
}

export interface GetPropertiesInPolygonParams extends BaseRPCParams {
  polygon_points: Array<{lat: number; lng: number}>
  result_limit: number
}

export interface GetPropertiesAlongRouteParams extends BaseRPCParams {
  waypoints: Array<{lat: number; lng: number}>
  corridor_width_km: number
}

export interface GetGeographicDensityParams extends BaseRPCParams {
  north_lat: number
  south_lat: number
  east_lng: number
  west_lng: number
  grid_size_deg: number
}

export interface GetNearestAmenitiesParams extends BaseRPCParams {
  center_lat: number
  center_lng: number
  amenity_types: string[]
  search_radius_km: number
}

export interface GeocodeAddressParams extends BaseRPCParams {
  address_text: string
}

export interface GetPropertyCoordinatesParams extends BaseRPCParams {
  property_id: string
}

// ============================================================================
// RPC FUNCTION RETURN TYPES
// ============================================================================

export interface InteractionSummaryRow {
  interaction_type: string
  count: number
}

export interface NeighborhoodStatsResult {
  total_properties: number
  avg_price: number
  median_price: number
  price_range_min: number
  price_range_max: number
  avg_bedrooms: number
  avg_bathrooms: number
  avg_square_feet: number
}

export interface MarketTrend {
  period: string
  avg_price: number
  total_listings: number
  price_change_percent: number
}

export interface MarketVelocityResult {
  avg_days_on_market: number
  total_sold: number
  velocity_score: number
}

export interface PropertyCluster {
  lat: number
  lng: number
  count: number
  avg_price: number
  min_price: number
  max_price: number
}

export interface GeographicDensityResult {
  total_properties: number
  avg_price: number
  price_density: Array<{
    lat: number
    lng: number
    price: number
    density_score: number
  }>
}

// Define neighborhood result type for get_neighborhoods_in_bounds
export interface NeighborhoodBounds {
  id: string
  name: string
  city: string
  state: string
  created_at: string | null
  metro_area: string | null
  bounds: unknown | null  // PostGIS data type - keep as unknown for now
  median_price: number | null
  walk_score: number | null
  transit_score: number | null
}

// Define error types for RPC responses
export interface SupabaseRPCError {
  message: string
  details?: string
  hint?: string
  code?: string
}

// Generic RPC Response type
export interface RPCResponse<T> {
  data: T | null
  error: SupabaseRPCError | null
}

// Result type for get_properties_by_distance RPC function
// Returns partial property data with distance
export interface PropertyWithDistance {
  id: string
  address: string
  city: string
  state: string
  price: number
  bedrooms: number
  bathrooms: number
  square_feet: number
  property_type: string
  images: string[]
  neighborhood_id: string | null
  distance_km: number
}

export interface DistanceResult {
  property: Property
  distance_km: number
}

export interface GeocodeResult {
  latitude: number | null
  longitude: number | null
  formatted_address: string
  confidence: number
}

export interface AmenityResult {
  amenity_id: string
  amenity_name: string
  amenity_type: string
  distance_km: number
  latitude: number
  longitude: number
}

export interface PropertyCoordinatesResult {
  latitude: number
  longitude: number
  property_id: string
}

// ============================================================================
// TYPED RPC CLIENT INTERFACE
// ============================================================================

export interface TypedSupabaseRPC {
  get_properties_within_radius(params: GetPropertiesWithinRadiusParams): Promise<RPCResponse<Property[]>>
  get_properties_in_bounds(params: GetPropertiesInBoundsParams): Promise<RPCResponse<Property[]>>
  calculate_distance(params: CalculateDistanceParams): Promise<RPCResponse<number>>
  get_walkability_score(params: GetWalkabilityScoreParams): Promise<RPCResponse<number>>
  get_transit_score(params: GetTransitScoreParams): Promise<RPCResponse<number>>
  get_neighborhood_stats(params: GetNeighborhoodStatsParams): Promise<RPCResponse<NeighborhoodStatsResult>>
  get_user_interaction_summary(params: GetUserInteractionSummaryParams): Promise<RPCResponse<InteractionSummaryRow[]>>
  get_market_trends(params: GetMarketTrendsParams): Promise<RPCResponse<MarketTrend[]>>
  get_property_market_comparisons(params: GetPropertyMarketComparisonsParams): Promise<RPCResponse<Property[]>>
  get_market_velocity(params: GetMarketVelocityParams): Promise<RPCResponse<MarketVelocityResult>>
  get_similar_properties(params: GetSimilarPropertiesParams): Promise<RPCResponse<Property[]>>
  get_neighborhoods_in_bounds(params: GetNeighborhoodsInBoundsParams): Promise<RPCResponse<NeighborhoodBounds[]>>
  get_properties_by_distance(params: GetPropertiesByDistanceParams): Promise<RPCResponse<PropertyWithDistance[]>>
  get_property_clusters(params: GetPropertyClustersParams): Promise<RPCResponse<PropertyCluster[]>>
  get_properties_in_polygon(params: GetPropertiesInPolygonParams): Promise<RPCResponse<Property[]>>
  get_properties_along_route(params: GetPropertiesAlongRouteParams): Promise<RPCResponse<Property[]>>
  get_geographic_density(params: GetGeographicDensityParams): Promise<RPCResponse<GeographicDensityResult>>
  get_nearest_amenities(params: GetNearestAmenitiesParams): Promise<RPCResponse<AmenityResult[]>>
  geocode_address(params: GeocodeAddressParams): Promise<RPCResponse<GeocodeResult[]>>
  get_property_coordinates(params: GetPropertyCoordinatesParams): Promise<RPCResponse<PropertyCoordinatesResult>>
}

// ============================================================================
// TYPED RPC WRAPPER
// ============================================================================

/**
 * Creates a type-safe wrapper around Supabase RPC calls
 */
export function createTypedRPC(supabase: SupabaseClient<Database>): TypedSupabaseRPC {
  // Cast to unknown first, then to our extended interface to bypass TypeScript's strict RPC typing 
  // since our custom functions aren't defined in the generated Database types
  const typedSupabase = supabase as unknown as {
    rpc: <T>(functionName: string, params?: BaseRPCParams) => Promise<RPCResponse<T>>
  }
  
  return {
    get_properties_within_radius: (params: GetPropertiesWithinRadiusParams) =>
      typedSupabase.rpc('get_properties_within_radius', params),
    
    get_properties_in_bounds: (params: GetPropertiesInBoundsParams) =>
      typedSupabase.rpc('get_properties_in_bounds', params),
    
    calculate_distance: (params: CalculateDistanceParams) =>
      typedSupabase.rpc('calculate_distance', params),
    
    get_walkability_score: (params: GetWalkabilityScoreParams) =>
      typedSupabase.rpc('get_walkability_score', params),
    
    get_transit_score: (params: GetTransitScoreParams) =>
      typedSupabase.rpc('get_transit_score', params),
    
    get_neighborhood_stats: (params: GetNeighborhoodStatsParams) =>
      typedSupabase.rpc('get_neighborhood_stats', params),
    
    get_user_interaction_summary: (params: GetUserInteractionSummaryParams) =>
      typedSupabase.rpc('get_user_interaction_summary', params),
    
    get_market_trends: (params: GetMarketTrendsParams) =>
      typedSupabase.rpc('get_market_trends', params),
    
    get_property_market_comparisons: (params: GetPropertyMarketComparisonsParams) =>
      typedSupabase.rpc('get_property_market_comparisons', params),
    
    get_market_velocity: (params: GetMarketVelocityParams) =>
      typedSupabase.rpc('get_market_velocity', params),
    
    get_similar_properties: (params: GetSimilarPropertiesParams) =>
      typedSupabase.rpc('get_similar_properties', params),
    
    get_neighborhoods_in_bounds: (params: GetNeighborhoodsInBoundsParams) =>
      typedSupabase.rpc('get_neighborhoods_in_bounds', params),
    
    get_properties_by_distance: (params: GetPropertiesByDistanceParams) =>
      typedSupabase.rpc('get_properties_by_distance', params),
    
    get_property_clusters: (params: GetPropertyClustersParams) =>
      typedSupabase.rpc('get_property_clusters', params),
    
    get_properties_in_polygon: (params: GetPropertiesInPolygonParams) =>
      typedSupabase.rpc('get_properties_in_polygon', params),
    
    get_properties_along_route: (params: GetPropertiesAlongRouteParams) =>
      typedSupabase.rpc('get_properties_along_route', params),
    
    get_geographic_density: (params: GetGeographicDensityParams) =>
      typedSupabase.rpc('get_geographic_density', params),
    
    get_nearest_amenities: (params: GetNearestAmenitiesParams) =>
      typedSupabase.rpc('get_nearest_amenities', params),
    
    geocode_address: (params: GeocodeAddressParams) =>
      typedSupabase.rpc('geocode_address', params),
    
    get_property_coordinates: (params: GetPropertyCoordinatesParams) =>
      typedSupabase.rpc('get_property_coordinates', params),
  }
}

// ============================================================================
// RPC HELPER FUNCTIONS
// ============================================================================

/**
 * Type-safe RPC function caller with error handling
 */
export async function callRPC<T>(
  supabase: SupabaseClient<Database>,
  functionName: keyof TypedSupabaseRPC,
  params: BaseRPCParams
): Promise<RPCResponse<T>> {
  const rpc = createTypedRPC(supabase)
  
  try {
    // TypeScript will ensure the function exists and has the right signature
    const typedFunction = rpc[functionName] as (params: BaseRPCParams) => Promise<RPCResponse<T>>
    const result = await typedFunction(params)
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      data: null,
      error: {
        message: `RPC call to ${functionName} failed`,
        details: errorMessage
      }
    }
  }
}

/**
 * Checks if an RPC function exists in the database
 * Useful for graceful degradation when functions are not yet implemented
 */
export function isRPCImplemented(functionName: keyof TypedSupabaseRPC): boolean {
  // List of RPC functions that are actually implemented in the database
  const implementedFunctions: (keyof TypedSupabaseRPC)[] = [
    'get_properties_within_radius',
    'get_properties_in_bounds', 
    'calculate_distance',
    'get_walkability_score',
    'get_transit_score',
    'get_neighborhood_stats',
    'get_user_interaction_summary',
    'get_market_trends',
    'get_property_market_comparisons',
    'get_market_velocity',
    'get_similar_properties',
    'get_neighborhoods_in_bounds',
    'get_properties_by_distance',
    'get_property_clusters',
    'get_properties_in_polygon',
    'get_properties_along_route',
    'get_geographic_density'
    // The following functions are not fully implemented and will throw errors:
    // 'get_nearest_amenities', // requires external POI database integration
    // 'geocode_address', // requires external geocoding service
    // 'get_property_coordinates' // requires PostGIS coordinate extraction function
  ]
  
  return implementedFunctions.includes(functionName)
}