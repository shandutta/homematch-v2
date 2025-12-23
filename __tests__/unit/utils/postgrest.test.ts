import { describe, expect, test } from '@jest/globals'
import {
  buildCityStateKeys,
  buildCityStateOrClause,
} from '@/lib/utils/postgrest'

describe('buildCityStateOrClause', () => {
  test('returns null for empty input', () => {
    expect(buildCityStateOrClause([])).toBeNull()
    expect(buildCityStateOrClause(undefined)).toBeNull()
    expect(buildCityStateOrClause(null)).toBeNull()
  })

  test('builds an OR clause for multiple city/state pairs', () => {
    const clause = buildCityStateOrClause([
      { city: 'Austin', state: 'TX' },
      { city: 'San Francisco', state: 'CA' },
    ])

    expect(clause).toBe(
      'and(city.eq.Austin,state.eq.TX),and(city.eq.San Francisco,state.eq.CA)'
    )
  })

  test('sanitizes commas and parentheses in values', () => {
    const clause = buildCityStateOrClause([
      { city: 'San,Fran(cisco)', state: 'CA' },
    ])

    expect(clause).toBe('and(city.eq.San Fran cisco,state.eq.CA)')
  })

  test('dedupes city/state pairs case-insensitively', () => {
    const clause = buildCityStateOrClause([
      { city: 'Austin', state: 'TX' },
      { city: 'austin', state: 'tx' },
      { city: 'Austin', state: 'TX' },
    ])

    expect(clause).toBe('and(city.eq.Austin,state.eq.TX)')
  })
})

describe('buildCityStateKeys', () => {
  test('returns an empty array for empty input', () => {
    expect(buildCityStateKeys([])).toEqual([])
    expect(buildCityStateKeys(undefined)).toEqual([])
    expect(buildCityStateKeys(null)).toEqual([])
  })

  test('builds normalized, deduped keys', () => {
    const keys = buildCityStateKeys([
      { city: 'Austin', state: 'TX' },
      { city: 'austin', state: 'tx' },
      { city: 'San Francisco', state: 'CA' },
    ])

    expect(keys).toEqual(['austin|tx', 'san francisco|ca'])
  })
})
