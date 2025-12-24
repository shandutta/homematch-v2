import { ALL_CITIES_SENTINEL_THRESHOLD } from '@/lib/constants/preferences'

type LoaderModule = typeof import('@/lib/data/loader')

jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

jest.mock('@/lib/services/properties', () => {
  const searchPropertiesMock = jest.fn()
  const getNeighborhoodsByCityMock = jest.fn()

  class PropertyServiceMock {
    searchProperties = searchPropertiesMock
    getNeighborhoodsByCity = getNeighborhoodsByCityMock
  }

  return {
    PropertyService: PropertyServiceMock,
    __mock__: { searchPropertiesMock, getNeighborhoodsByCityMock },
  }
})

const { searchPropertiesMock, getNeighborhoodsByCityMock } = (
  jest.requireMock('@/lib/services/properties') as {
    __mock__: {
      searchPropertiesMock: jest.Mock
      getNeighborhoodsByCityMock: jest.Mock
    }
  }
).__mock__

describe('loadDashboardData', () => {
  let loadDashboardData: LoaderModule['loadDashboardData']

  beforeAll(async () => {
    ;({ loadDashboardData } = await import('@/lib/data/loader'))
  })

  beforeEach(() => {
    searchPropertiesMock.mockResolvedValue({
      properties: [],
      total: 0,
      page: 1,
      limit: 20,
    })
    getNeighborhoodsByCityMock.mockResolvedValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('skips neighborhood fetching when allCities is true', async () => {
    await loadDashboardData({
      userPreferences: {
        allCities: true,
        cities: [{ city: 'Austin', state: 'TX' }],
        neighborhoods: ['neighborhood-1'],
      },
    })

    expect(getNeighborhoodsByCityMock).not.toHaveBeenCalled()
    const [{ filters }] = searchPropertiesMock.mock.calls[0]
    expect(filters.cities).toBeUndefined()
    expect(filters.neighborhoods).toBeUndefined()
  })

  it('skips neighborhood fetching when cities exceed the sentinel threshold', async () => {
    const cities = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD },
      (_, index) => ({
        city: `City ${index}`,
        state: 'CA',
      })
    )

    await loadDashboardData({
      userPreferences: {
        allCities: false,
        cities,
        neighborhoods: [],
      },
    })

    expect(getNeighborhoodsByCityMock).not.toHaveBeenCalled()
    const [{ filters }] = searchPropertiesMock.mock.calls[0]
    expect(filters.cities).toBeUndefined()
    expect(filters.neighborhoods).toBeUndefined()
  })

  it('skips neighborhood fetching when neighborhoods exceed the sentinel threshold', async () => {
    const neighborhoods = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD },
      (_, index) => `neighborhood-${index}`
    )

    await loadDashboardData({
      userPreferences: {
        allCities: false,
        cities: [{ city: 'Austin', state: 'TX' }],
        neighborhoods,
      },
    })

    expect(getNeighborhoodsByCityMock).not.toHaveBeenCalled()
    const [{ filters }] = searchPropertiesMock.mock.calls[0]
    expect(filters.cities).toBeUndefined()
    expect(filters.neighborhoods).toBeUndefined()
  })

  it('fetches neighborhoods for each selected city under the sentinel threshold', async () => {
    const cities = [
      { city: 'Austin', state: 'TX' },
      { city: 'Dallas', state: 'TX' },
    ]

    await loadDashboardData({
      userPreferences: {
        allCities: false,
        cities,
        neighborhoods: [],
      },
    })

    expect(getNeighborhoodsByCityMock).toHaveBeenCalledTimes(cities.length)
    expect(getNeighborhoodsByCityMock).toHaveBeenNthCalledWith(
      1,
      'Austin',
      'TX'
    )
    expect(getNeighborhoodsByCityMock).toHaveBeenNthCalledWith(
      2,
      'Dallas',
      'TX'
    )
    const [{ filters }] = searchPropertiesMock.mock.calls[0]
    expect(filters.cities).toEqual(cities)
    expect(filters.neighborhoods).toBeUndefined()
  })

  it('returns properties and deduped neighborhoods from services', async () => {
    const cities = [
      { city: 'Austin', state: 'TX' },
      { city: 'Dallas', state: 'TX' },
    ]

    const neighborhoodA = { id: 'neighborhood-a' }
    const neighborhoodB = { id: 'neighborhood-b' }
    const neighborhoodC = { id: 'neighborhood-c' }

    getNeighborhoodsByCityMock
      .mockResolvedValueOnce([neighborhoodA, neighborhoodB])
      .mockResolvedValueOnce([neighborhoodB, neighborhoodC])

    searchPropertiesMock.mockResolvedValue({
      properties: [{ id: 'property-1' }],
      total: 1,
      page: 1,
      limit: 20,
    })

    const result = await loadDashboardData({
      userPreferences: {
        allCities: false,
        cities,
        neighborhoods: [],
      },
    })

    expect(result.properties).toHaveLength(1)
    expect(result.totalProperties).toBe(1)
    expect(result.neighborhoods.map((item) => item.id)).toEqual([
      'neighborhood-a',
      'neighborhood-b',
      'neighborhood-c',
    ])
    expect(result.scored).toBe(true)
  })

  it('returns empty data when a service call fails', async () => {
    searchPropertiesMock.mockRejectedValueOnce(new Error('boom'))

    const result = await loadDashboardData({
      userPreferences: {
        allCities: false,
        cities: [{ city: 'Austin', state: 'TX' }],
        neighborhoods: [],
      },
    })

    expect(result.properties).toEqual([])
    expect(result.totalProperties).toBe(0)
    expect(result.scored).toBe(false)
  })
})
