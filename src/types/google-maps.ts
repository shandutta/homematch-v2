// Google Maps API types for TypeScript
export interface GoogleMapInstance {
  setCenter: (latLng: unknown) => void
  setZoom: (zoom: number) => void
  addListener: (event: string, handler: () => void) => void
  fitBounds?: (bounds: unknown, padding?: number | object) => void
  setOptions?: (options: unknown) => void
}

export interface GoogleMarkerInstance {
  setMap: (map: GoogleMapInstance | null) => void
  addListener: (event: string, handler: () => void) => void
}

export interface GoogleAdvancedMarkerInstance {
  addListener: (event: string, handler: () => void) => void
}

export type GoogleAnyMarkerInstance =
  | GoogleMarkerInstance
  | GoogleAdvancedMarkerInstance

export interface GoogleInfoWindowInstance {
  open: (
    mapOrOptions:
      | GoogleMapInstance
      | {
          map: GoogleMapInstance
          anchor?: GoogleAnyMarkerInstance
        },
    marker?: GoogleMarkerInstance
  ) => void
  close: () => void
}

export interface GooglePolygonInstance {
  setMap: (map: GoogleMapInstance | null) => void
  setOptions: (options: unknown) => void
  addListener: (event: string, handler: (...args: unknown[]) => void) => void
}

export interface GoogleLatLngBoundsInstance {
  extend: (point: unknown) => void
}

export interface GoogleDrawingManagerInstance {
  setMap: (map: GoogleMapInstance | null) => void
  setDrawingMode: (mode: string | null) => void
  setOptions?: (options: unknown) => void
  addListener: (event: string, handler: (event: unknown) => void) => void
}

declare global {
  interface Window {
    google?: {
      maps?: {
        Map: new (
          element?: Element | null,
          options?: unknown
        ) => GoogleMapInstance
        Marker: new (options?: unknown) => GoogleMarkerInstance
        InfoWindow: new (options?: unknown) => GoogleInfoWindowInstance
        LatLng: new (lat: number, lng: number) => unknown
        LatLngBounds: new (
          sw?: unknown,
          ne?: unknown
        ) => GoogleLatLngBoundsInstance
        Size: new (width: number, height: number) => unknown
        Point: new (x: number, y: number) => unknown
        Polygon: new (options?: unknown) => GooglePolygonInstance
        drawing?: {
          DrawingManager: new (
            options?: unknown
          ) => GoogleDrawingManagerInstance
          OverlayType: {
            CIRCLE: string
            MARKER: string
            POLYGON: string
            POLYLINE: string
            RECTANGLE: string
          }
        }
        marker?: {
          AdvancedMarkerElement: new (
            options?: unknown
          ) => GoogleAdvancedMarkerInstance
        }
        MapTypeId: {
          ROADMAP: string
          SATELLITE: string
          HYBRID: string
          TERRAIN: string
        }
        event: {
          addListener: (
            instance: object,
            eventName: string,
            handler: (...args: unknown[]) => void
          ) => unknown
        }
      }
    }
  }
}
