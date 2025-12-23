export type CityStatePair = {
  city: string
  state: string
}

export function sanitizePostgrestFilterValue(value: string): string {
  return value
    .replace(/[(),]/g, ' ')
    .replace(/["`;\\/]/g, '')
    .trim()
}

export function buildCityStateKey(city: string, state: string): string | null {
  const safeCity = city.trim()
  const safeState = state.trim()

  if (!safeCity || !safeState) return null
  return `${safeCity.toLowerCase()}|${safeState.toLowerCase()}`
}

export function buildCityStateKeys(
  pairs: CityStatePair[] | undefined | null
): string[] {
  if (!pairs || pairs.length === 0) return []

  const seen = new Set<string>()

  for (const pair of pairs) {
    const key = buildCityStateKey(pair.city, pair.state)
    if (!key || seen.has(key)) continue
    seen.add(key)
  }

  return Array.from(seen)
}

export function buildCityStateOrClause(
  pairs: CityStatePair[] | undefined | null
): string | null {
  if (!pairs || pairs.length === 0) return null

  const seen = new Set<string>()
  const clauses: string[] = []

  for (const pair of pairs) {
    const city = sanitizePostgrestFilterValue(pair.city)
    const state = sanitizePostgrestFilterValue(pair.state)

    if (!city || !state) continue

    const key = `${city.toLowerCase()}|${state.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    clauses.push(`and(city.eq.${city},state.eq.${state})`)
  }

  if (clauses.length === 0) return null
  return clauses.join(',')
}
