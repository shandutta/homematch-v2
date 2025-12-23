import { describe, expect, test } from '@jest/globals'
import {
  buildPropertyFiltersFromPreferences,
  type DashboardPreferences,
} from '@/lib/data/loader'
import {
  ALL_CITIES_SENTINEL_THRESHOLD,
  DEFAULT_PRICE_RANGE,
} from '@/lib/constants/preferences'

describe('buildPropertyFiltersFromPreferences', () => {
  test('applies default price range when preferences are null', () => {
    expect(buildPropertyFiltersFromPreferences(null)).toEqual({
      price_min: DEFAULT_PRICE_RANGE[0],
      price_max: DEFAULT_PRICE_RANGE[1],
    })
  })

  test('applies default price range when preferences omit priceRange', () => {
    const prefs: DashboardPreferences = { bedrooms: 2 }
    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.price_min).toBe(DEFAULT_PRICE_RANGE[0])
    expect(filters.price_max).toBe(DEFAULT_PRICE_RANGE[1])
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

  test('skips city filters when allCities is true', () => {
    const prefs: DashboardPreferences = {
      allCities: true,
      cities: [{ city: 'Austin', state: 'TX' }],
    }

    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.cities).toBeUndefined()
    expect(filters.neighborhoods).toBeUndefined()
  })

  test('skips city filters when the city selection is oversized', () => {
    const cities = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD },
      () => ({
        city: 'Austin',
        state: 'TX',
      })
    )
    const prefs: DashboardPreferences = { cities }

    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.cities).toBeUndefined()
    expect(filters.neighborhoods).toBeUndefined()
  })

  test('skips neighborhood filters when the neighborhood selection is oversized', () => {
    const neighborhoods = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD },
      (_, index) => `neighborhood-${index}`
    )
    const prefs: DashboardPreferences = { neighborhoods }

    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.cities).toBeUndefined()
    expect(filters.neighborhoods).toBeUndefined()
  })

  test('maps price range to min/max filters', () => {
    const prefs: DashboardPreferences = { priceRange: [250000, 900000] }

    const filters = buildPropertyFiltersFromPreferences(prefs)

    expect(filters.price_min).toBe(250000)
    expect(filters.price_max).toBe(900000)
  })
})
