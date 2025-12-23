import { loadDashboardData } from '@/lib/data/loader'
import { ALL_CITIES_SENTINEL_THRESHOLD } from '@/lib/constants/preferences'

const searchPropertiesMock = jest.fn()
const getNeighborhoodsByCityMock = jest.fn()

class PropertyServiceMock {
  searchProperties = searchPropertiesMock
  getNeighborhoodsByCity = getNeighborhoodsByCityMock
}

jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
}))

jest.mock('@/lib/services/properties', () => ({
  PropertyService: PropertyServiceMock,
}))

describe('loadDashboardData', () => {
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
})
