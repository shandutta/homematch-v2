// Google Maps API types for TypeScript
export interface GoogleMapInstance {
  setCenter: (latLng: unknown) => void
  setZoom: (zoom: number) => void
  addListener: (event: string, handler: () => void) => void
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
        LatLngBounds: new (sw?: unknown, ne?: unknown) => unknown
        Size: new (width: number, height: number) => unknown
        Point: new (x: number, y: number) => unknown
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
