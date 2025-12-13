export function getGoogleMapsMapId(): string | undefined {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
  const trimmed = mapId?.trim()
  return trimmed ? trimmed : undefined
}

export function shouldLoadGoogleMapsMarkerLibrary(): boolean {
  return Boolean(getGoogleMapsMapId())
}
