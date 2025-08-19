/**
 * Integration test for coordinate utilities with PostGIS-like data
 */

import {
  parsePostGISGeometry,
  latLngToGeoJSON,
  geoJSONToLatLng,
  calculateDistance,
  isValidLatLng,
} from '@/lib/utils/coordinates'

describe('Coordinate Utilities Integration', () => {
  describe('PostGIS Integration', () => {
    it('should handle typical PostGIS Point geometry from database', () => {
      // Simulate what comes from PostGIS/Supabase
      const postGISPoint = {
        type: 'Point',
        coordinates: [-122.4194, 37.7749], // GeoJSON format: [lng, lat]
      }

      const result = parsePostGISGeometry(postGISPoint)

      expect(result).toEqual({
        lat: 37.7749,
        lng: -122.4194,
      })
      expect(isValidLatLng(result!)).toBe(true)
    })

    it('should handle coordinate arrays from legacy data', () => {
      // Some legacy data might be stored as arrays
      const coordinateArray = [-122.4194, 37.7749]

      const result = parsePostGISGeometry(coordinateArray)

      expect(result).toEqual({
        lat: 37.7749,
        lng: -122.4194,
      })
    })

    it('should handle lat/lng objects from JSON fields', () => {
      // Some data might be stored as direct JSON objects
      const latLngObject = {
        lat: 37.7749,
        lng: -122.4194,
      }

      const result = parsePostGISGeometry(latLngObject)

      expect(result).toEqual(latLngObject)
    })

    it('should convert to GeoJSON for PostGIS insertion', () => {
      const coords = { lat: 37.7749, lng: -122.4194 }
      const geoJSON = latLngToGeoJSON(coords)

      expect(geoJSON).toEqual({
        type: 'Point',
        coordinates: [-122.4194, 37.7749], // GeoJSON format: [lng, lat]
      })

      // Round trip test
      const roundTrip = geoJSONToLatLng(geoJSON)
      expect(roundTrip).toEqual(coords)
    })
  })

  describe('Geographic Service Integration', () => {
    it('should work with bounding box normalization', () => {
      // Legacy bounding box format
      const legacyBounds = {
        northEast: { lat: 40.7128, lng: -74.006 },
        southWest: { lat: 37.7749, lng: -122.4194 },
      }

      // This function would be used in the geographic service
      const normalizeBounds = (bounds: any) => {
        if ('northEast' in bounds && 'southWest' in bounds) {
          return {
            north: bounds.northEast.lat,
            south: bounds.southWest.lat,
            east: bounds.northEast.lng,
            west: bounds.southWest.lng,
          }
        }
        return bounds
      }

      const normalized = normalizeBounds(legacyBounds)

      expect(normalized).toEqual({
        north: 40.7128,
        south: 37.7749,
        east: -74.006,
        west: -122.4194,
      })
    })

    it('should calculate distances correctly for real locations', () => {
      const sanFrancisco = { lat: 37.7749, lng: -122.4194 }
      const newYork = { lat: 40.7128, lng: -74.006 }

      const distance = calculateDistance(sanFrancisco, newYork)

      // Distance between SF and NYC is approximately 4,139 km
      expect(distance).toBeGreaterThan(4100)
      expect(distance).toBeLessThan(4200)
      expect(typeof distance).toBe('number')
      expect(Number.isFinite(distance)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle null and undefined gracefully', () => {
      expect(parsePostGISGeometry(null)).toBe(null)
      expect(parsePostGISGeometry(undefined)).toBe(null)
      expect(parsePostGISGeometry('')).toBe(null)
    })

    it('should handle malformed data gracefully', () => {
      expect(parsePostGISGeometry({ type: 'Point' })).toBe(null) // Missing coordinates
      expect(parsePostGISGeometry({ coordinates: [] })).toBe(null) // Missing type
      expect(parsePostGISGeometry({ type: 'Point', coordinates: [1] })).toBe(
        null
      ) // Invalid coordinates
      expect(parsePostGISGeometry({})).toBe(null) // Empty object
      expect(parsePostGISGeometry('invalid string')).toBe(null) // Invalid type
    })

    it('should validate coordinates before distance calculations', () => {
      const validCoords = { lat: 37.7749, lng: -122.4194 }
      const invalidCoords = { lat: 91, lng: -181 }

      expect(() => calculateDistance(validCoords, invalidCoords)).toThrow()
      expect(() => calculateDistance(invalidCoords, validCoords)).toThrow()
    })
  })
})
