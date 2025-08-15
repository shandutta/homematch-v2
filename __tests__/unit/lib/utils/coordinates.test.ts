import {
  parsePostGISGeometry,
  latLngToGeoJSON,
  geoJSONToLatLng,
  tupleToLatLng,
  latLngToTuple,
  swapCoordinates,
  isValidLatitude,
  isValidLongitude,
  isValidLatLng,
  isValidCoordinateTuple,
  isValidBoundingBox,
  calculateBoundingBox,
  expandBoundingBox,
  isCoordinateInBounds,
  boundingBoxesIntersect,
  getBoundingBoxCenter,
  calculateDistance,
  calculateBearing,
  calculateDestination,
  toRadians,
  toDegrees,
  roundCoordinates,
  formatCoordinates,
  parseCoordinateString,
  generateRandomCoordinate,
  createCircularPolygon,
  type LatLng,
  type CoordinateTuple,
  type GeoJSONPoint,
  type BoundingBox,
} from '@/lib/utils/coordinates'

describe('Coordinate Utilities', () => {
  // Sample coordinates for testing
  const sanFrancisco: LatLng = { lat: 37.7749, lng: -122.4194 }
  const newYork: LatLng = { lat: 40.7128, lng: -74.0060 }
  const invalidCoords: LatLng = { lat: 91, lng: -181 }

  describe('PostGIS Geometry Parsing', () => {
    it('should parse GeoJSON Point geometry', () => {
      const geoJSON = {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
      }
      
      const result = parsePostGISGeometry(geoJSON)
      expect(result).toEqual(sanFrancisco)
    })

    it('should parse lat/lng object', () => {
      const coords = { lat: 37.7749, lng: -122.4194 }
      const result = parsePostGISGeometry(coords)
      expect(result).toEqual(sanFrancisco)
    })

    it('should parse coordinate array', () => {
      const coords = [-122.4194, 37.7749]
      const result = parsePostGISGeometry(coords)
      expect(result).toEqual(sanFrancisco)
    })

    it('should return null for invalid geometry', () => {
      expect(parsePostGISGeometry(null)).toBe(null)
      expect(parsePostGISGeometry(undefined)).toBe(null)
      expect(parsePostGISGeometry('invalid')).toBe(null)
      expect(parsePostGISGeometry({})).toBe(null)
      expect(parsePostGISGeometry([1])).toBe(null)
    })
  })

  describe('Coordinate Conversion', () => {
    it('should convert LatLng to GeoJSON Point', () => {
      const result = latLngToGeoJSON(sanFrancisco)
      const expected: GeoJSONPoint = {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
      }
      expect(result).toEqual(expected)
    })

    it('should convert GeoJSON Point to LatLng', () => {
      const geoJSON: GeoJSONPoint = {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
      }
      const result = geoJSONToLatLng(geoJSON)
      expect(result).toEqual(sanFrancisco)
    })

    it('should convert coordinate tuple to LatLng', () => {
      const tuple: CoordinateTuple = [-122.4194, 37.7749]
      const result = tupleToLatLng(tuple)
      expect(result).toEqual(sanFrancisco)
    })

    it('should convert LatLng to coordinate tuple', () => {
      const result = latLngToTuple(sanFrancisco)
      const expected: CoordinateTuple = [-122.4194, 37.7749]
      expect(result).toEqual(expected)
    })

    it('should swap coordinate order', () => {
      const coords: [number, number] = [37.7749, -122.4194]
      const result = swapCoordinates(coords)
      expect(result).toEqual([-122.4194, 37.7749])
    })
  })

  describe('Coordinate Validation', () => {
    it('should validate latitude values', () => {
      expect(isValidLatitude(0)).toBe(true)
      expect(isValidLatitude(37.7749)).toBe(true)
      expect(isValidLatitude(90)).toBe(true)
      expect(isValidLatitude(-90)).toBe(true)
      expect(isValidLatitude(91)).toBe(false)
      expect(isValidLatitude(-91)).toBe(false)
      expect(isValidLatitude(NaN)).toBe(false)
    })

    it('should validate longitude values', () => {
      expect(isValidLongitude(0)).toBe(true)
      expect(isValidLongitude(-122.4194)).toBe(true)
      expect(isValidLongitude(180)).toBe(true)
      expect(isValidLongitude(-180)).toBe(true)
      expect(isValidLongitude(181)).toBe(false)
      expect(isValidLongitude(-181)).toBe(false)
      expect(isValidLongitude(NaN)).toBe(false)
    })

    it('should validate LatLng coordinates', () => {
      expect(isValidLatLng(sanFrancisco)).toBe(true)
      expect(isValidLatLng(newYork)).toBe(true)
      expect(isValidLatLng(invalidCoords)).toBe(false)
      expect(isValidLatLng({ lat: NaN, lng: 0 })).toBe(false)
      expect(isValidLatLng({ lat: 0, lng: NaN })).toBe(false)
    })

    it('should validate coordinate tuples', () => {
      expect(isValidCoordinateTuple([-122.4194, 37.7749])).toBe(true)
      expect(isValidCoordinateTuple([-74.0060, 40.7128])).toBe(true)
      expect(isValidCoordinateTuple([-181, 37.7749])).toBe(false)
      expect(isValidCoordinateTuple([-122.4194, 91])).toBe(false)
      expect(isValidCoordinateTuple([NaN, 37.7749])).toBe(false)
    })

    it('should validate bounding boxes', () => {
      const validBbox: BoundingBox = {
        north: 40,
        south: 30,
        east: -70,
        west: -80,
      }
      expect(isValidBoundingBox(validBbox)).toBe(true)

      const invalidBbox: BoundingBox = {
        north: 30,
        south: 40, // south > north
        east: -70,
        west: -80,
      }
      expect(isValidBoundingBox(invalidBbox)).toBe(false)
    })
  })

  describe('Bounding Box Operations', () => {
    it('should calculate bounding box from coordinates', () => {
      const coords = [sanFrancisco, newYork]
      const result = calculateBoundingBox(coords)
      
      expect(result.north).toBe(40.7128)
      expect(result.south).toBe(37.7749)
      expect(result.east).toBe(-74.0060)
      expect(result.west).toBe(-122.4194)
    })

    it('should expand bounding box', () => {
      const bbox: BoundingBox = {
        north: 40,
        south: 30,
        east: -70,
        west: -80,
      }
      const expanded = expandBoundingBox(bbox, 100) // 100km
      
      expect(expanded.north).toBeGreaterThan(bbox.north)
      expect(expanded.south).toBeLessThan(bbox.south)
      expect(expanded.east).toBeGreaterThan(bbox.east)
      expect(expanded.west).toBeLessThan(bbox.west)
    })

    it('should check if coordinate is in bounds', () => {
      const bbox: BoundingBox = {
        north: 40,
        south: 30,
        east: -70,
        west: -80,
      }
      
      expect(isCoordinateInBounds({ lat: 35, lng: -75 }, bbox)).toBe(true)
      expect(isCoordinateInBounds({ lat: 45, lng: -75 }, bbox)).toBe(false)
      expect(isCoordinateInBounds({ lat: 35, lng: -65 }, bbox)).toBe(false)
    })

    it('should check if bounding boxes intersect', () => {
      const bbox1: BoundingBox = {
        north: 40,
        south: 30,
        east: -70,
        west: -80,
      }
      
      const bbox2: BoundingBox = {
        north: 35,
        south: 25,
        east: -65,
        west: -75,
      }
      
      expect(boundingBoxesIntersect(bbox1, bbox2)).toBe(true)
      
      const bbox3: BoundingBox = {
        north: 25,
        south: 15,
        east: -65,
        west: -75,
      }
      
      expect(boundingBoxesIntersect(bbox1, bbox3)).toBe(false)
    })

    it('should get bounding box center', () => {
      const bbox: BoundingBox = {
        north: 40,
        south: 30,
        east: -70,
        west: -80,
      }
      
      const center = getBoundingBoxCenter(bbox)
      expect(center.lat).toBe(35)
      expect(center.lng).toBe(-75)
    })
  })

  describe('Distance Calculations', () => {
    it('should calculate distance between coordinates', () => {
      // Distance between SF and NYC is approximately 4,130 km
      const distance = calculateDistance(sanFrancisco, newYork)
      expect(distance).toBeGreaterThan(4000)
      expect(distance).toBeLessThan(4200)
    })

    it('should calculate bearing', () => {
      const bearing = calculateBearing(sanFrancisco, newYork)
      expect(bearing).toBeGreaterThan(0)
      expect(bearing).toBeLessThan(360)
    })

    it('should calculate destination point', () => {
      const destination = calculateDestination(sanFrancisco, 100, 90) // 100km east
      expect(destination.lat).toBeCloseTo(sanFrancisco.lat, 1)
      expect(destination.lng).toBeGreaterThan(sanFrancisco.lng)
    })
  })

  describe('Utility Functions', () => {
    it('should convert degrees to radians', () => {
      expect(toRadians(180)).toBeCloseTo(Math.PI)
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2)
      expect(toRadians(0)).toBe(0)
    })

    it('should convert radians to degrees', () => {
      expect(toDegrees(Math.PI)).toBeCloseTo(180)
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90)
      expect(toDegrees(0)).toBe(0)
    })

    it('should round coordinates', () => {
      const coords = { lat: 37.77491234, lng: -122.41943567 }
      const rounded = roundCoordinates(coords, 4)
      expect(rounded.lat).toBe(37.7749)
      expect(rounded.lng).toBe(-122.4194)
    })

    it('should format coordinates as string', () => {
      const formatted = formatCoordinates(sanFrancisco)
      expect(formatted).toContain('37.7749°N')
      expect(formatted).toContain('122.4194°W')
    })

    it('should parse coordinate strings', () => {
      expect(parseCoordinateString('37.7749, -122.4194')).toEqual(sanFrancisco)
      expect(parseCoordinateString('37.7749N, 122.4194W')).toEqual(sanFrancisco)
      expect(parseCoordinateString('invalid')).toBe(null)
    })

    it('should generate random coordinates within bounds', () => {
      const bbox: BoundingBox = {
        north: 40,
        south: 30,
        east: -70,
        west: -80,
      }
      
      const random = generateRandomCoordinate(bbox)
      expect(isCoordinateInBounds(random, bbox)).toBe(true)
    })

    it('should create circular polygon', () => {
      const center: LatLng = { lat: 37.7749, lng: -122.4194 }
      const polygon = createCircularPolygon(center, 1, 8) // 1km radius, 8 points
      
      expect(polygon).toHaveLength(8)
      polygon.forEach(point => {
        expect(isValidLatLng(point)).toBe(true)
        const distance = calculateDistance(center, point)
        expect(distance).toBeCloseTo(1, 0) // Within 1 km tolerance
      })
    })
  })

  describe('Error Handling', () => {
    it('should throw errors for invalid inputs', () => {
      expect(() => calculateBoundingBox([])).toThrow()
      expect(() => expandBoundingBox({ north: 30, south: 40, east: -70, west: -80 }, 10)).toThrow()
      expect(() => calculateDistance(invalidCoords, sanFrancisco)).toThrow()
      expect(() => createCircularPolygon(invalidCoords, 1)).toThrow()
      expect(() => createCircularPolygon(sanFrancisco, -1)).toThrow()
      expect(() => createCircularPolygon(sanFrancisco, 1, 2)).toThrow()
    })
  })
})