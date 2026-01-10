import { z } from 'zod'

// Property type literals (canonical set aligned with DB constraint and ingestion)
export type PropertyType =
  | 'single_family'
  | 'condo'
  | 'townhome'
  | 'multi_family'
  | 'manufactured'
  | 'land'
  | 'other'

export const PROPERTY_TYPE_VALUES: [PropertyType, ...PropertyType[]] = [
  'single_family',
  'condo',
  'townhome',
  'multi_family',
  'manufactured',
  'land',
  'other',
]
const propertyTypeEnum = z.enum(PROPERTY_TYPE_VALUES)

const coerceNumber = (value: unknown): unknown => {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) return value
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return parsed
  }
  return value
}

const numberFromString = (schema: z.ZodNumber) =>
  z.preprocess(coerceNumber, schema)

const timestampSchema = z.string().datetime({ offset: true })

// Property Schemas
const imagePathSchema = z.string().url().or(z.string().startsWith('/'))

export const propertySchema = z.object({
  id: z.string().uuid('Invalid uuid'),
  zpid: z.string().nullable(),
  address: z
    .string()
    .min(1, { message: 'String must contain at least 1 character(s)' })
    .max(255),
  city: z
    .string()
    .min(1, { message: 'String must contain at least 1 character(s)' })
    .max(100),
  state: z.string().length(2),
  zip_code: z.string().min(5).max(10),
  price: numberFromString(
    z.number().min(0, { message: 'Number must be greater than or equal to 0' })
  ),
  bedrooms: numberFromString(
    z
      .number()
      .min(0)
      .max(20, { message: 'Number must be less than or equal to 20' })
  ),
  bathrooms: numberFromString(
    z
      .number()
      .min(0)
      .max(20, { message: 'Number must be less than or equal to 20' })
  ),
  square_feet: numberFromString(z.number().min(0)).nullable(),
  // Must match DB check constraint in Supabase
  property_type: propertyTypeEnum.nullable(),
  images: z.array(imagePathSchema).nullable(),
  description: z.string().nullable(),
  // Coordinates can be GeoJSON Point, lat/lng object, or null when unknown
  coordinates: z
    .union([
      z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
      }),
      z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      z.unknown(),
    ])
    .nullable(),
  neighborhood_id: z.string().uuid('Invalid uuid').nullable(),
  amenities: z.array(z.string()).nullable(),
  year_built: numberFromString(
    z
      .number()
      .min(1800)
      .max(new Date().getFullYear() + 5)
  ).nullable(),
  lot_size_sqft: numberFromString(z.number().min(0)).nullable(),
  parking_spots: numberFromString(z.number().min(0).max(20)).nullable(),
  // Constrain listing_status to known literals; allow null; coerce unknown strings via preprocess if needed upstream
  listing_status: z
    .enum(['active', 'pending', 'sold', 'for_sale', 'removed'])
    .nullable(),
  property_hash: z.string().nullable(),
  is_active: z.boolean().default(true).nullable(),
  created_at: timestampSchema.nullable(),
  updated_at: timestampSchema.nullable(),
  zillow_images_refreshed_at: timestampSchema.nullable().optional(),
  zillow_images_refreshed_count: numberFromString(z.number().int().min(0))
    .nullable()
    .optional(),
  zillow_images_refresh_status: z
    .enum(['ok', 'no_images'])
    .nullable()
    .optional(),
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
  bounds: z
    .object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    })
    .nullable(), // PostGIS POLYGON type as GeoJSON
  median_price: z.number().min(0).nullable(),
  walk_score: z.number().min(0).max(100).nullable(),
  transit_score: z.number().min(0).max(100).nullable(),
  created_at: timestampSchema.nullable(),
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

const cityStatePairSchema = z.object({
  city: z.string().min(1).max(100),
  state: z.string().length(2),
})

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
  property_types: z.array(propertyTypeEnum).optional(),
  cities: z.array(cityStatePairSchema).optional(),
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
  within_polygon: z
    .object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    })
    .optional(), // PostGIS polygon for geographic filtering
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

// Re-export coordinate utilities for backward compatibility
export {
  latLngSchema as coordinatesSchema,
  boundingBoxSchema,
} from '@/lib/utils/coordinates'

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

// Re-export coordinate types for backward compatibility
export type {
  LatLng as Coordinates,
  BoundingBox,
} from '@/lib/utils/coordinates'
