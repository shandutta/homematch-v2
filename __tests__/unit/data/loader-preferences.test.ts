import { describe, expect, test } from '@jest/globals'
import {
  buildPropertyFiltersFromPreferences,
  type DashboardPreferences,
} from '@/lib/data/loader'

describe('buildPropertyFiltersFromPreferences', () => {
  test('returns empty filters for null preferences', () => {
    expect(buildPropertyFiltersFromPreferences(null)).toEqual({})
  })

  test('prefers neighborhoods over cities when both are set', () => {
    const prefs: DashboardPreferences = {
      cities: [{ city: 'Austin', state: 'TX' }],
      neighborhoods: ['11111111-1111-1111-1111-111111111111'],
    }

    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.neighborhoods).toEqual(prefs.neighborhoods)
    expect(filters.cities).toBeUndefined()
  })

  test('uses cities when neighborhoods are empty', () => {
    const prefs: DashboardPreferences = {
      cities: [
        { city: 'Austin', state: 'TX' },
        { city: 'San Francisco', state: 'CA' },
      ],
    }

    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.cities).toEqual(prefs.cities)
    expect(filters.neighborhoods).toBeUndefined()
  })

  test('maps price range to min/max filters', () => {
    const prefs: DashboardPreferences = { priceRange: [250000, 900000] }

    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.price_min).toBe(250000)
    expect(filters.price_max).toBe(900000)
  })
})
