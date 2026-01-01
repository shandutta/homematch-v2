/**
 * Coordinate Utilities
 *
 * Centralized utilities for handling coordinate parsing, conversion, and validation.
 * Provides type-safe functions for working with PostGIS geometry, Google Maps coordinates,
 * and various coordinate formats used throughout the application.
 */

import { z } from 'zod'

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type LatLng = {
  lat: number
  lng: number
}

export type PolygonRings = LatLng[][]
export type MultiPolygonRings = PolygonRings[]

export type LngLat = {
  lng: number
  lat: number
}

export type CoordinateTuple = [number, number] // [longitude, latitude] - PostGIS/GeoJSON convention

export type GeoJSONPoint = {
  type: 'Point'
  coordinates: CoordinateTuple
}

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: CoordinateTuple[][]
}

export type GeoJSONMultiPolygon = {
  type: 'MultiPolygon'
  coordinates: CoordinateTuple[][][]
}

export type BoundingBox = {
  north: number
  south: number
  east: number
  west: number
}

export type PostGISGeometry = unknown // PostGIS geometry column (from database)

// Validation schemas
export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
})

export const coordinateTupleSchema = z.tuple([
  z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
])

export const boundingBoxSchema = z
  .object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  })
  .refine((data) => data.north > data.south, {
    message: 'North must be greater than south',
    path: ['north'],
  })
  .refine((data) => data.east > data.west, {
    message: 'East must be greater than west',
    path: ['east'],
  })

// ============================================================================
// COORDINATE PARSING & CONVERSION
// ============================================================================

/**
 * Parse PostGIS geometry to lat/lng coordinates
 * Handles both Point and Polygon geometries from PostGIS
 */
export function parsePostGISGeometry(geometry: PostGISGeometry): LatLng | null {
  if (!geometry || typeof geometry !== 'object') {
    return null
  }

  try {
    // Handle GeoJSON Point format from PostGIS
    if (
      typeof geometry === 'object' &&
      'type' in geometry &&
      geometry.type === 'Point' &&
      'coordinates' in geometry &&
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length === 2
    ) {
      const [lng, lat] = geometry.coordinates as [number, number]
      return { lat, lng }
    }

    // Handle direct coordinate object (from JSON field)
    if (
      typeof geometry === 'object' &&
      'lat' in geometry &&
      'lng' in geometry &&
      typeof geometry.lat === 'number' &&
      typeof geometry.lng === 'number'
    ) {
      return {
        lat: geometry.lat,
        lng: geometry.lng,
      }
    }

    // Handle coordinate array format [lng, lat]
    if (Array.isArray(geometry) && geometry.length === 2) {
      const [lng, lat] = geometry
      if (typeof lng === 'number' && typeof lat === 'number') {
        return { lat, lng }
      }
    }

    console.warn('Unable to parse PostGIS geometry:', geometry)
    return null
  } catch (error) {
    console.error('Error parsing PostGIS geometry:', error)
    return null
  }
}

/**
 * Parse PostGIS polygon geometry into lat/lng rings.
 * Supports GeoJSON Polygon/MultiPolygon, polygon strings, and coordinate arrays.
 */
export function parsePostGISPolygon(
  geometry: PostGISGeometry
): MultiPolygonRings | null {
  if (!geometry) return null

  if (typeof geometry === 'string') {
    const rings = parsePolygonString(geometry)
    return rings ? [rings] : null
  }

  if (Array.isArray(geometry)) {
    const rings = normalizePolygonCoordinates(geometry)
    if (rings) return [rings]

    return normalizeMultiPolygonCoordinates(geometry)
  }

  if (typeof geometry === 'object') {
    const candidate = geometry as {
      type?: string
      coordinates?: unknown
    }
    if (candidate.type === 'Polygon' && candidate.coordinates) {
      const rings = normalizePolygonCoordinates(candidate.coordinates)
      return rings ? [rings] : null
    }
    if (candidate.type === 'MultiPolygon' && candidate.coordinates) {
      return normalizeMultiPolygonCoordinates(candidate.coordinates)
    }
  }

  return null
}

function parsePolygonString(value: string): PolygonRings | null {
  const matches = value.match(/-?\d+(?:\.\d+)?/g)
  if (!matches || matches.length < 6) return null

  const numbers = matches.map((match) => Number(match))
  if (numbers.some((num) => Number.isNaN(num))) return null

  const ring: LatLng[] = []
  for (let i = 0; i < numbers.length; i += 2) {
    const lng = numbers[i]
    const lat = numbers[i + 1]
    if (typeof lng !== 'number' || typeof lat !== 'number') continue
    if (!isValidLongitude(lng) || !isValidLatitude(lat)) continue
    ring.push({ lat, lng })
  }

  const normalized = closeRing(ring)
  return normalized ? [normalized] : null
}

function normalizePolygonCoordinates(input: unknown): PolygonRings | null {
  if (!Array.isArray(input)) return null

  if (input.length === 0) return null

  if (Array.isArray(input[0]) && typeof input[0][0] === 'number') {
    const ring = parseCoordinateRing(input as CoordinateTuple[])
    return ring ? [ring] : null
  }

  const rings: LatLng[][] = []
  for (const ringInput of input) {
    const ring = parseCoordinateRing(ringInput as CoordinateTuple[])
    if (ring) rings.push(ring)
  }

  return rings.length > 0 ? rings : null
}

function normalizeMultiPolygonCoordinates(
  input: unknown
): MultiPolygonRings | null {
  if (!Array.isArray(input)) return null
  if (input.length === 0) return null

  const polygons: PolygonRings[] = []

  for (const polygonInput of input) {
    const rings = normalizePolygonCoordinates(polygonInput)
    if (rings) polygons.push(rings)
  }

  return polygons.length > 0 ? polygons : null
}

function parseCoordinateRing(
  coords: CoordinateTuple[] | unknown
): LatLng[] | null {
  if (!Array.isArray(coords) || coords.length < 3) return null

  const ring: LatLng[] = []
  for (const tuple of coords) {
    if (!Array.isArray(tuple) || tuple.length < 2) return null
    const [lng, lat] = tuple as CoordinateTuple
    if (!isValidLongitude(lng) || !isValidLatitude(lat)) return null
    ring.push({ lat, lng })
  }

  return closeRing(ring)
}

function closeRing(ring: LatLng[]): LatLng[] | null {
  if (ring.length < 3) return null
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (!first || !last) return null
  if (first.lat !== last.lat || first.lng !== last.lng) {
    ring.push({ ...first })
  }
  return ring
}

/**
 * Convert lat/lng object to GeoJSON Point format
 */
export function latLngToGeoJSON(coords: LatLng): GeoJSONPoint {
  const validated = latLngSchema.parse(coords)
  return {
    type: 'Point',
    coordinates: [validated.lng, validated.lat], // GeoJSON: [longitude, latitude]
  }
}

/**
 * Convert GeoJSON Point to lat/lng object
 */
export function geoJSONToLatLng(geoJSON: GeoJSONPoint): LatLng {
  if (geoJSON.type !== 'Point' || !Array.isArray(geoJSON.coordinates)) {
    throw new Error('Invalid GeoJSON Point format')
  }

  const [lng, lat] = coordinateTupleSchema.parse(geoJSON.coordinates)
  return { lat, lng }
}

/**
 * Convert coordinate tuple [lng, lat] to lat/lng object
 */
export function tupleToLatLng(tuple: CoordinateTuple): LatLng {
  const [lng, lat] = coordinateTupleSchema.parse(tuple)
  return { lat, lng }
}

/**
 * Convert lat/lng object to coordinate tuple [lng, lat]
 */
export function latLngToTuple(coords: LatLng): CoordinateTuple {
  const validated = latLngSchema.parse(coords)
  return [validated.lng, validated.lat]
}

/**
 * Swap coordinate order from [lat, lng] to [lng, lat] or vice versa
 */
export function swapCoordinates(coords: [number, number]): [number, number] {
  return [coords[1], coords[0]]
}

// ============================================================================
// COORDINATE VALIDATION
// ============================================================================

/**
 * Validate latitude value
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
}

/**
 * Validate longitude value
 */
export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180
}

/**
 * Validate lat/lng coordinate pair
 */
export function isValidLatLng(coords: LatLng): boolean {
  return (
    typeof coords === 'object' &&
    coords !== null &&
    isValidLatitude(coords.lat) &&
    isValidLongitude(coords.lng)
  )
}

/**
 * Validate coordinate tuple [lng, lat]
 */
export function isValidCoordinateTuple(tuple: CoordinateTuple): boolean {
  return (
    Array.isArray(tuple) &&
    tuple.length === 2 &&
    isValidLongitude(tuple[0]) &&
    isValidLatitude(tuple[1])
  )
}

/**
 * Validate bounding box
 */
export function isValidBoundingBox(bbox: BoundingBox): boolean {
  try {
    boundingBoxSchema.parse(bbox)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// BOUNDING BOX OPERATIONS
// ============================================================================

/**
 * Calculate bounding box from array of coordinates
 */
export function calculateBoundingBox(coordinates: LatLng[]): BoundingBox {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate bounding box from empty coordinate array')
  }

  // Validate all coordinates first
  coordinates.forEach((coord, index) => {
    if (!isValidLatLng(coord)) {
      throw new Error(
        `Invalid coordinate at index ${index}: ${JSON.stringify(coord)}`
      )
    }
  })

  let north = -90
  let south = 90
  let east = -180
  let west = 180

  for (const coord of coordinates) {
    north = Math.max(north, coord.lat)
    south = Math.min(south, coord.lat)
    east = Math.max(east, coord.lng)
    west = Math.min(west, coord.lng)
  }

  return boundingBoxSchema.parse({ north, south, east, west })
}

/**
 * Expand bounding box by a given distance in kilometers
 */
export function expandBoundingBox(
  bbox: BoundingBox,
  distanceKm: number
): BoundingBox {
  const validated = boundingBoxSchema.parse(bbox)

  if (distanceKm <= 0) {
    throw new Error('Distance must be positive')
  }

  // Rough approximation: 1 degree ≈ 111 km
  const latOffset = distanceKm / 111
  const lngOffset =
    distanceKm /
    (111 *
      Math.cos((((validated.north + validated.south) / 2) * Math.PI) / 180))

  return boundingBoxSchema.parse({
    north: Math.min(90, validated.north + latOffset),
    south: Math.max(-90, validated.south - latOffset),
    east: Math.min(180, validated.east + lngOffset),
    west: Math.max(-180, validated.west - lngOffset),
  })
}

/**
 * Check if a coordinate is within a bounding box
 */
export function isCoordinateInBounds(
  coord: LatLng,
  bbox: BoundingBox
): boolean {
  if (!isValidLatLng(coord) || !isValidBoundingBox(bbox)) {
    return false
  }

  return (
    coord.lat >= bbox.south &&
    coord.lat <= bbox.north &&
    coord.lng >= bbox.west &&
    coord.lng <= bbox.east
  )
}

/**
 * Check if two bounding boxes intersect
 */
export function boundingBoxesIntersect(
  bbox1: BoundingBox,
  bbox2: BoundingBox
): boolean {
  if (!isValidBoundingBox(bbox1) || !isValidBoundingBox(bbox2)) {
    return false
  }

  return !(
    bbox1.east < bbox2.west ||
    bbox1.west > bbox2.east ||
    bbox1.north < bbox2.south ||
    bbox1.south > bbox2.north
  )
}

/**
 * Get the center point of a bounding box
 */
export function getBoundingBoxCenter(bbox: BoundingBox): LatLng {
  const validated = boundingBoxSchema.parse(bbox)

  return {
    lat: (validated.north + validated.south) / 2,
    lng: (validated.east + validated.west) / 2,
  }
}

// ============================================================================
// DISTANCE CALCULATIONS
// ============================================================================

/**
 * Calculate great circle distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(point1: LatLng, point2: LatLng): number {
  if (!isValidLatLng(point1) || !isValidLatLng(point2)) {
    throw new Error('Invalid coordinate pairs for distance calculation')
  }

  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(point2.lat - point1.lat)
  const dLng = toRadians(point2.lng - point1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate the bearing (direction) from point1 to point2 in degrees
 */
export function calculateBearing(point1: LatLng, point2: LatLng): number {
  if (!isValidLatLng(point1) || !isValidLatLng(point2)) {
    throw new Error('Invalid coordinate pairs for bearing calculation')
  }

  const dLng = toRadians(point2.lng - point1.lng)
  const lat1 = toRadians(point1.lat)
  const lat2 = toRadians(point2.lat)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  const bearing = toDegrees(Math.atan2(y, x))
  return (bearing + 360) % 360 // Normalize to 0-360 degrees
}

/**
 * Calculate destination point given start point, distance, and bearing
 */
export function calculateDestination(
  start: LatLng,
  distanceKm: number,
  bearing: number
): LatLng {
  if (!isValidLatLng(start)) {
    throw new Error('Invalid start coordinate')
  }

  if (distanceKm < 0) {
    throw new Error('Distance must be non-negative')
  }

  const R = 6371 // Earth's radius in kilometers
  const d = distanceKm / R // Angular distance in radians

  const lat1 = toRadians(start.lat)
  const lng1 = toRadians(start.lng)
  const bearingRad = toRadians(bearing)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad)
  )

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2),
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Round coordinates to specified decimal places (default: 6)
 */
export function roundCoordinates(coords: LatLng, decimals = 6): LatLng {
  const validated = latLngSchema.parse(coords)
  const factor = Math.pow(10, decimals)

  return {
    lat: Math.round(validated.lat * factor) / factor,
    lng: Math.round(validated.lng * factor) / factor,
  }
}

/**
 * Format coordinates as human-readable string
 */
export function formatCoordinates(coords: LatLng, decimals = 6): string {
  const validated = latLngSchema.parse(coords)
  const rounded = roundCoordinates(validated, decimals)

  const latDirection = rounded.lat >= 0 ? 'N' : 'S'
  const lngDirection = rounded.lng >= 0 ? 'E' : 'W'

  return `${Math.abs(rounded.lat)}°${latDirection}, ${Math.abs(rounded.lng)}°${lngDirection}`
}

/**
 * Parse coordinate string in various formats
 * Supports formats like: "37.7749, -122.4194", "37.7749N, 122.4194W", etc.
 */
export function parseCoordinateString(coordString: string): LatLng | null {
  if (!coordString || typeof coordString !== 'string') {
    return null
  }

  try {
    // Remove extra whitespace and split by comma
    const parts = coordString
      .trim()
      .split(',')
      .map((part) => part.trim())

    if (parts.length !== 2) {
      return null
    }

    // Parse first part (latitude)
    const latStr = parts[0].replace(/[NSns]/gi, '')
    const lat = parseFloat(latStr) * (parts[0].match(/[Ss]/i) ? -1 : 1)

    // Parse second part (longitude)
    const lngStr = parts[1].replace(/[EWew]/gi, '')
    const lng = parseFloat(lngStr) * (parts[1].match(/[Ww]/i) ? -1 : 1)

    const coords = { lat, lng }
    return isValidLatLng(coords) ? coords : null
  } catch {
    return null
  }
}

/**
 * Generate a random coordinate within a bounding box
 * Useful for testing and data generation
 */
export function generateRandomCoordinate(bbox: BoundingBox): LatLng {
  const validated = boundingBoxSchema.parse(bbox)

  const lat =
    validated.south + Math.random() * (validated.north - validated.south)
  const lng = validated.west + Math.random() * (validated.east - validated.west)

  return { lat, lng }
}

/**
 * Create circular polygon around a center point
 * Useful for isochrone analysis and radius searches
 */
export function createCircularPolygon(
  center: LatLng,
  radiusKm: number,
  numPoints = 16
): LatLng[] {
  if (!isValidLatLng(center)) {
    throw new Error('Invalid center coordinate')
  }

  if (radiusKm <= 0) {
    throw new Error('Radius must be positive')
  }

  if (numPoints < 3) {
    throw new Error('Number of points must be at least 3')
  }

  const points: LatLng[] = []
  const angleStep = 360 / numPoints

  for (let i = 0; i < numPoints; i++) {
    const bearing = i * angleStep
    const point = calculateDestination(center, radiusKm, bearing)
    points.push(point)
  }

  return points
}
