// Phase 0/1 closure: DB-P1.2-dashboard-dedupe
import type { PropertySearch } from '@/lib/schemas/property'

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

const { searchPropertiesMock, getNeighborhoodsByCityMock } = jest.requireMock(
  '@/lib/services/properties'
).__mock__

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('dashboard query dedupe', () => {
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

  it('dedupes concurrent dashboard searches with identical service-boundary parameters', async () => {
    const pendingSearch = deferred<{
      properties: Array<{ id: string }>
      total: number
      page: number
      limit: number
    }>()
    searchPropertiesMock.mockReturnValueOnce(pendingSearch.promise)

    const options = {
      limit: 12,
      offset: 0,
      includeNeighborhoods: false,
      includeCount: false,
      propertySelect: 'id,address',
      userPreferences: {
        allCities: false,
        cities: [{ city: 'Austin', state: 'TX' }],
      },
    }

    const first = loadDashboardData(options)
    const second = loadDashboardData({ ...options })

    pendingSearch.resolve({
      properties: [{ id: 'property-1' }],
      total: 1,
      page: 1,
      limit: 12,
    })

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ totalProperties: 1 }),
      expect.objectContaining({ totalProperties: 1 }),
    ])

    expect(searchPropertiesMock).toHaveBeenCalledTimes(1)
    const [searchParams, searchOptions]: [
      PropertySearch,
      {
        select?: string
        includeCount?: boolean
        includeNeighborhoods?: boolean
      },
    ] = searchPropertiesMock.mock.calls[0]
    expect(searchParams.filters?.cities).toEqual([
      { city: 'Austin', state: 'TX' },
    ])
    expect(searchOptions).toEqual({
      select: 'id,address',
      includeCount: false,
      includeNeighborhoods: false,
    })
  })

  it('clears failed in-flight entries so later retries issue a fresh search', async () => {
    searchPropertiesMock.mockRejectedValueOnce(new Error('temporary failure'))

    await loadDashboardData({ includeNeighborhoods: false })
    await loadDashboardData({ includeNeighborhoods: false })

    expect(searchPropertiesMock).toHaveBeenCalledTimes(2)
  })

  it('does not dedupe concurrent dashboard searches with distinct service-boundary parameters', async () => {
    const baseOptions = {
      limit: 12,
      offset: 0,
      includeNeighborhoods: false,
      includeCount: false,
      propertySelect: 'id,address',
    }

    await Promise.all([
      loadDashboardData({
        ...baseOptions,
        userPreferences: {
          allCities: false,
          cities: [{ city: 'Austin', state: 'TX' }],
        },
      }),
      loadDashboardData({
        ...baseOptions,
        userPreferences: {
          allCities: false,
          cities: [{ city: 'Dallas', state: 'TX' }],
        },
      }),
      loadDashboardData({
        ...baseOptions,
        limit: 24,
        userPreferences: {
          allCities: false,
          cities: [{ city: 'Austin', state: 'TX' }],
        },
      }),
      loadDashboardData({
        ...baseOptions,
        propertySelect: 'id,price',
        userPreferences: {
          allCities: false,
          cities: [{ city: 'Austin', state: 'TX' }],
        },
      }),
    ])

    expect(searchPropertiesMock).toHaveBeenCalledTimes(4)
    const calls: Array<[PropertySearch, { select?: string }]> =
      searchPropertiesMock.mock.calls
    const callCities = calls.map(([params, options]) => ({
      cities: params.filters?.cities,
      limit: params.pagination?.limit,
      select: options?.select,
    }))
    expect(callCities).toEqual([
      {
        cities: [{ city: 'Austin', state: 'TX' }],
        limit: 12,
        select: 'id,address',
      },
      {
        cities: [{ city: 'Dallas', state: 'TX' }],
        limit: 12,
        select: 'id,address',
      },
      {
        cities: [{ city: 'Austin', state: 'TX' }],
        limit: 24,
        select: 'id,address',
      },
      {
        cities: [{ city: 'Austin', state: 'TX' }],
        limit: 12,
        select: 'id,price',
      },
    ])
  })

  it('clears resolved in-flight entries so sequential identical calls issue fresh searches', async () => {
    await loadDashboardData({ includeNeighborhoods: false })
    await loadDashboardData({ includeNeighborhoods: false })

    expect(searchPropertiesMock).toHaveBeenCalledTimes(2)
  })
})
