export type GeoPoint = {
  lat: number
  lng: number
}

export function convexHull(points: GeoPoint[]): GeoPoint[] {
  const unique = new Map<string, GeoPoint>()
  points.forEach((point) => {
    const key = `${point.lng.toFixed(6)}|${point.lat.toFixed(6)}`
    if (!unique.has(key)) unique.set(key, point)
  })

  const sorted = Array.from(unique.values()).sort((a, b) => {
    if (a.lng === b.lng) return a.lat - b.lat
    return a.lng - b.lng
  })

  if (sorted.length <= 2) return sorted

  const lower: GeoPoint[] = []
  for (const point of sorted) {
    while (lower.length >= 2) {
      const a = lower[lower.length - 2]!
      const b = lower[lower.length - 1]!
      if (cross(a, b, point) <= 0) {
        lower.pop()
      } else {
        break
      }
    }
    lower.push(point)
  }

  const upper: GeoPoint[] = []
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i]!
    while (upper.length >= 2) {
      const a = upper[upper.length - 2]!
      const b = upper[upper.length - 1]!
      if (cross(a, b, point) <= 0) {
        upper.pop()
      } else {
        break
      }
    }
    upper.push(point)
  }

  upper.pop()
  lower.pop()

  return [...lower, ...upper]
}

export function polygonCentroid(ring: GeoPoint[]): GeoPoint | null {
  if (!ring || ring.length < 3) return null

  let area = 0
  let centroidLng = 0
  let centroidLat = 0

  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i]!
    const next = ring[(i + 1) % ring.length]!
    const crossValue = current.lng * next.lat - next.lng * current.lat
    area += crossValue
    centroidLng += (current.lng + next.lng) * crossValue
    centroidLat += (current.lat + next.lat) * crossValue
  }

  area *= 0.5
  if (Math.abs(area) < 1e-7) {
    return meanPoint(ring)
  }

  const factor = 1 / (6 * area)
  return {
    lng: centroidLng * factor,
    lat: centroidLat * factor,
  }
}

export function isPointInPolygon(point: GeoPoint, ring: GeoPoint[]): boolean {
  if (!ring || ring.length < 3) return false

  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i]!.lng
    const yi = ring[i]!.lat
    const xj = ring[j]!.lng
    const yj = ring[j]!.lat

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng <
        ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersects) inside = !inside
  }

  return inside
}

function cross(a: GeoPoint, b: GeoPoint, c: GeoPoint) {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)
}

function meanPoint(points: GeoPoint[]): GeoPoint | null {
  if (!points.length) return null
  const total = points.reduce(
    (acc, point) => {
      acc.lat += point.lat
      acc.lng += point.lng
      return acc
    },
    { lat: 0, lng: 0 }
  )
  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  }
}
