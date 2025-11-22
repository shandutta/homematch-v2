const CITY_NORMALIZATION_MAP: Record<string, string> = {
  SANJOSE: 'San Jose',
  SANJO: 'San Jose',
  SANJOS: 'San Jose',
  SANJOSECA: 'San Jose',
  WALNUTCREEK: 'Walnut Creek',
  SANMATEO: 'San Mateo',
  MOUNTAINVIEW: 'Mountain View',
  SANTACLARA: 'Santa Clara',
  SOUTHSANFRANCISCO: 'South San Francisco',
  DALYCITY: 'Daly City',
}

export function normalizeCityName(city: string | null | undefined): string {
  if (!city) return 'Unknown'
  const trimmed = city.trim()
  if (!trimmed) return 'Unknown'
  const key = trimmed.replace(/[\s.-]/g, '').toUpperCase()
  const normalized = CITY_NORMALIZATION_MAP[key]
  if (normalized) return normalized
  // Title-case fallback
  return trimmed.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
