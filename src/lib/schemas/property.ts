import { z } from 'zod'

// Property Schemas
export const propertySchema = z.object({
  id: z.string().uuid(),
  zpid: z.string().nullable(),
  address: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  zip_code: z.string().min(5).max(10),
  price: z.number().min(0),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  square_feet: z.number().min(0).nullable(),
  property_type: z
    .enum(['house', 'condo', 'townhouse', 'apartment'])
    .nullable(),
  images: z.array(z.string().url()).nullable(),
  description: z.string().nullable(),
  coordinates: z.any().nullable(), // PostGIS POINT type
  neighborhood_id: z.string().uuid().nullable(),
  amenities: z.array(z.string()).nullable(),
  year_built: z
    .number()
    .min(1800)
    .max(new Date().getFullYear() + 5)
    .nullable(),
  lot_size_sqft: z.number().min(0).nullable(),
  parking_spots: z.number().min(0).max(20).nullable(),
  listing_status: z.string().default('active').nullable(),
  property_hash: z.string().nullable(),
  is_active: z.boolean().default(true).nullable(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
})

export const propertyInsertSchema = propertySchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .partial({
    zpid: true,
    square_feet: true,
    property_type: true,
    images: true,
    description: true,
    coordinates: true,
    neighborhood_id: true,
    amenities: true,
    year_built: true,
    lot_size_sqft: true,
    parking_spots: true,
    listing_status: true,
    property_hash: true,
    is_active: true,
  })

export const propertyUpdateSchema = propertySchema
  .omit({
    id: true,
    created_at: true,
  })
  .partial()

// Neighborhood Schemas
export const neighborhoodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  metro_area: z.string().max(100).nullable(),
  bounds: z.any().nullable(), // PostGIS POLYGON type
  median_price: z.number().min(0).nullable(),
  walk_score: z.number().min(0).max(100).nullable(),
  transit_score: z.number().min(0).max(100).nullable(),
  created_at: z.string().datetime().nullable(),
})

export const neighborhoodInsertSchema = neighborhoodSchema
  .omit({
    id: true,
    created_at: true,
  })
  .partial({
    metro_area: true,
    bounds: true,
    median_price: true,
    walk_score: true,
    transit_score: true,
  })

export const neighborhoodUpdateSchema = neighborhoodSchema
  .omit({
    id: true,
    created_at: true,
  })
  .partial()

// Property with Neighborhood (joined)
export const propertyWithNeighborhoodSchema = propertySchema.extend({
  neighborhood: neighborhoodSchema.nullable(),
})

// Property Filters (for search)
export const propertyFiltersSchema = z.object({
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  bedrooms_min: z.number().min(0).max(10).optional(),
  bedrooms_max: z.number().min(0).max(10).optional(),
  bathrooms_min: z.number().min(0).max(10).optional(),
  bathrooms_max: z.number().min(0).max(10).optional(),
  square_feet_min: z.number().min(0).optional(),
  square_feet_max: z.number().min(0).optional(),
  property_types: z
    .array(z.enum(['house', 'condo', 'townhouse', 'apartment']))
    .optional(),
  neighborhoods: z.array(z.string().uuid()).optional(),
  amenities: z.array(z.string()).optional(),
  year_built_min: z.number().min(1800).optional(),
  year_built_max: z
    .number()
    .max(new Date().getFullYear() + 5)
    .optional(),
  lot_size_min: z.number().min(0).optional(),
  lot_size_max: z.number().min(0).optional(),
  parking_spots_min: z.number().min(0).optional(),
  listing_status: z.array(z.string()).optional(),
  within_polygon: z.any().optional(), // PostGIS polygon for geographic filtering
  within_radius: z
    .object({
      center: z.tuple([z.number(), z.number()]), // [lng, lat]
      radius_km: z.number().min(0).max(100),
    })
    .optional(),
})

// Property sort options
export const propertySortSchema = z.object({
  field: z.enum([
    'price',
    'created_at',
    'bedrooms',
    'bathrooms',
    'square_feet',
    'year_built',
  ]),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

// Property pagination
export const propertyPaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort: propertySortSchema.optional(),
})

// Property search request
export const propertySearchSchema = z.object({
  filters: propertyFiltersSchema.optional(),
  pagination: propertyPaginationSchema.optional(),
})

// Coordinate helpers
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const boundingBoxSchema = z
  .object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  })
  .refine((data) => data.north > data.south, {
    message: 'North must be greater than south',
  })
  .refine((data) => data.east > data.west, {
    message: 'East must be greater than west',
  })

// Export types
export type Property = z.infer<typeof propertySchema>
export type PropertyInsert = z.infer<typeof propertyInsertSchema>
export type PropertyUpdate = z.infer<typeof propertyUpdateSchema>

export type Neighborhood = z.infer<typeof neighborhoodSchema>
export type NeighborhoodInsert = z.infer<typeof neighborhoodInsertSchema>
export type NeighborhoodUpdate = z.infer<typeof neighborhoodUpdateSchema>

export type PropertyWithNeighborhood = z.infer<
  typeof propertyWithNeighborhoodSchema
>
export type PropertyFilters = z.infer<typeof propertyFiltersSchema>
export type PropertySort = z.infer<typeof propertySortSchema>
export type PropertyPagination = z.infer<typeof propertyPaginationSchema>
export type PropertySearch = z.infer<typeof propertySearchSchema>

export type Coordinates = z.infer<typeof coordinatesSchema>
export type BoundingBox = z.infer<typeof boundingBoxSchema>
