import type { Database } from './database'

type PropertyRow = Database['public']['Tables']['properties']['Row']
type NeighborhoodRow = Database['public']['Tables']['neighborhoods']['Row']

type AdditionalFunctions = {
  get_properties_in_bounds: {
    Args: {
      north_lat: number
      south_lat: number
      east_lng: number
      west_lng: number
      result_limit: number
    }
    Returns: PropertyRow[]
  }
  get_walkability_score: {
    Args: {
      center_lat: number
      center_lng: number
    }
    Returns: number
  }
  get_transit_score: {
    Args: {
      center_lat: number
      center_lng: number
    }
    Returns: number
  }
  get_market_trends: {
    Args: {
      timeframe: 'weekly' | 'monthly' | 'quarterly'
      months_back: number
    }
    Returns: Array<{
      period: string
      avg_price: number
      total_listings: number
      price_change_percent: number
    }>
  }
  get_property_market_comparisons: {
    Args: {
      target_property_id: string
      radius_km: number
    }
    Returns: PropertyRow[]
  }
  get_market_velocity: {
    Args: {
      target_neighborhood_id: string | null
    }
    Returns: {
      avg_days_on_market: number
      total_sold: number
      velocity_score: number
    }
  }
  get_similar_properties: {
    Args: {
      target_property_id: string
      radius_km: number
      result_limit: number
    }
    Returns: PropertyRow[]
  }
  get_neighborhoods_in_bounds: {
    Args: {
      north_lat: number
      south_lat: number
      east_lng: number
      west_lng: number
    }
    Returns: NeighborhoodRow[]
  }
  get_properties_by_distance: {
    Args: {
      center_lat: number
      center_lng: number
      max_distance_km: number
      result_limit: number
    }
    Returns: Array<{
      property: PropertyRow
      distance_km: number
    }>
  }
  get_property_clusters: {
    Args: {
      north_lat: number
      south_lat: number
      east_lng: number
      west_lng: number
      zoom_level: number
    }
    Returns: Array<{
      lat: number
      lng: number
      count: number
      avg_price: number
      min_price: number
      max_price: number
    }>
  }
  get_properties_in_polygon: {
    Args: {
      polygon_points: Array<{ lat: number; lng: number }>
      result_limit: number
    }
    Returns: PropertyRow[]
  }
  get_properties_along_route: {
    Args: {
      waypoints: Array<{ lat: number; lng: number }>
      corridor_width_km: number
    }
    Returns: PropertyRow[]
  }
  get_geographic_density: {
    Args: {
      north_lat: number
      south_lat: number
      east_lng: number
      west_lng: number
      grid_size_deg: number
    }
    Returns: {
      total_properties: number
      avg_price: number
      price_density: Array<{
        lat: number
        lng: number
        price: number
        density_score: number
      }>
    }
  }
  get_nearest_amenities: {
    Args: {
      center_lat: number
      center_lng: number
      amenity_types: string[]
      search_radius_km: number
    }
    Returns: Array<{
      amenity_id: string
      amenity_name: string
      amenity_type: string
      distance_km: number
      latitude: number
      longitude: number
    }>
  }
  geocode_address: {
    Args: {
      address_text: string
    }
    Returns: Array<{
      latitude: number | null
      longitude: number | null
      formatted_address: string
      confidence: number
    }>
  }
  get_property_coordinates: {
    Args: {
      property_id: string
    }
    Returns: {
      latitude: number
      longitude: number
      property_id: string
    }
  }
}

export type AppDatabase = Database & {
  public: Database['public'] & {
    Functions: Database['public']['Functions'] & AdditionalFunctions
  }
}
