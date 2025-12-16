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
