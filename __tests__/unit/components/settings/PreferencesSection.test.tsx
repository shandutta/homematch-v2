import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { UserServiceClient } from '@/lib/services/users-client'
import {
  ALL_CITIES_SENTINEL_THRESHOLD,
  DEFAULT_BATHROOMS,
  DEFAULT_BEDROOMS,
  DEFAULT_PRICE_RANGE,
  DEFAULT_SEARCH_RADIUS,
} from '@/lib/constants/preferences'
import { LocationsClient } from '@/lib/services/locations-client'
import { toast } from 'sonner'
import { mockNextRouter } from '../../../utils/mock-helpers'

// Mock dependencies
jest.mock('@/lib/services/users-client', () => ({
  UserServiceClient: {
    updateUserProfile: jest.fn(),
    createSavedSearch: jest.fn(),
  },
}))
jest.mock('@/lib/services/locations-client', () => ({
  LocationsClient: {
    getCities: jest.fn(),
    getNeighborhoodsForCities: jest.fn(),
  },
}))
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
} as any

const mockProfile = {
  id: 'user-123',
  preferences: {
    priceRange: [300000, 700000],
    bedrooms: 3,
    bathrooms: 2,
    propertyTypes: {
      house: true,
      condo: false,
      townhouse: true,
    },
    mustHaves: {
      parking: true,
      pool: false,
      gym: true,
      petFriendly: false,
    },
    searchRadius: 15,
  },
} as any

async function ensureListView(user: ReturnType<typeof userEvent.setup>) {
  const listTab = screen.queryByRole('tab', { name: /list view/i })
  if (listTab) {
    await user.click(listTab)
  }
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(global as any).ResizeObserver = ResizeObserverMock
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

describe('PreferencesSection', () => {
  let mockUpdateUserProfile: jest.Mock
  let mockCreateSavedSearch: jest.Mock
  let mockGetCities: jest.Mock
  let mockGetNeighborhoodsForCities: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateUserProfile = jest
      .spyOn(UserServiceClient, 'updateUserProfile')
      .mockResolvedValue(true as any)
    mockCreateSavedSearch = jest
      .spyOn(UserServiceClient, 'createSavedSearch')
      .mockResolvedValue({
        id: 'search-1',
      } as any)
    mockGetCities = LocationsClient.getCities as jest.Mock
    mockGetNeighborhoodsForCities =
      LocationsClient.getNeighborhoodsForCities as jest.Mock
    mockGetCities.mockResolvedValue([
      { city: 'Austin', state: 'TX' },
      { city: 'Dallas', state: 'TX' },
    ])
    mockGetNeighborhoodsForCities.mockResolvedValue([])
  })

  afterEach(() => {
    mockUpdateUserProfile.mockRestore()
    mockCreateSavedSearch.mockRestore()
    jest.useRealTimers()
  })

  it('renders all preference controls with initial values', () => {
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    // Price range
    expect(screen.getByText('Price Range')).toBeInTheDocument()
    expect(screen.getByText(/\$300,000\s*-\s*\$700,000/i)).toBeInTheDocument()

    // Bedrooms and bathrooms
    expect(screen.getByText('3+ Bedrooms')).toBeInTheDocument()
    expect(screen.getByText('2+ Bathrooms')).toBeInTheDocument()

    // Search radius
    expect(screen.getByText('Search Radius')).toBeInTheDocument()
    expect(screen.getByText('15 miles')).toBeInTheDocument()

    // Property types
    expect(screen.getByLabelText('Single Family Home')).toBeChecked()
    expect(screen.getByLabelText('Condo/Apartment')).not.toBeChecked()
    expect(screen.getByLabelText('Townhome')).toBeChecked()
    expect(screen.getByLabelText('Multi-family / Duplex')).toBeChecked()
    expect(screen.getByLabelText('Manufactured / Mobile')).toBeChecked()
    expect(screen.getByLabelText('Land / Lots')).toBeChecked()
    expect(screen.getByLabelText('Other / Unique')).toBeChecked()

    // Must-have features
    expect(screen.getByLabelText('Parking')).toBeChecked()
    expect(screen.getByLabelText('Pool')).not.toBeChecked()
    expect(screen.getByLabelText('Gym/Fitness Center')).toBeChecked()
    expect(screen.getByLabelText('Pet Friendly')).not.toBeChecked()

    expect(
      screen.getByRole('button', { name: /reset filters/i })
    ).toBeInTheDocument()
  })

  it('handles default preferences when none exist', () => {
    const profileWithoutPrefs = { ...mockProfile, preferences: {} }
    render(<PreferencesSection user={mockUser} profile={profileWithoutPrefs} />)

    expect(screen.getByText(/\$200,000\s*-\s*\$800,000/i)).toBeInTheDocument()
    expect(screen.getByText('2+ Bedrooms')).toBeInTheDocument()
    expect(screen.getByText('2+ Bathrooms')).toBeInTheDocument()
    expect(screen.getByText('Search Radius')).toBeInTheDocument()
    expect(screen.getByText('10 miles')).toBeInTheDocument()
  })

  it('auto-saves bedrooms selection', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const bedroomsSelect = screen.getByRole('combobox', {
      name: 'Minimum Bedrooms',
    })
    await user.click(bedroomsSelect)
    await user.click(screen.getByText('4+ Bedrooms'))

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          bedrooms: 4,
        }),
      })
    })
  })

  it('auto-saves bathrooms selection', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const bathroomsSelect = screen.getByRole('combobox', {
      name: 'Minimum Bathrooms',
    })
    await user.click(bathroomsSelect)
    await user.click(screen.getByText('2.5+ Bathrooms'))

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          bathrooms: 2.5,
        }),
      })
    })
  })

  it('auto-saves property type toggles', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const condoSwitch = screen.getByLabelText('Condo/Apartment')
    const houseSwitch = screen.getByLabelText('Single Family Home')

    await user.click(condoSwitch) // Turn on
    await user.click(houseSwitch) // Turn off

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          propertyTypes: expect.objectContaining({
            house: false,
            single_family: false,
            condo: true,
            townhome: true,
            townhouse: true,
            multi_family: true,
            manufactured: true,
            land: true,
            other: true,
          }),
        }),
      })
    })
  })

  it('auto-saves must-have feature toggles', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const poolSwitch = screen.getByLabelText('Pool')
    const parkingSwitch = screen.getByLabelText('Parking')

    await user.click(poolSwitch) // Turn on
    await user.click(parkingSwitch) // Turn off

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          mustHaves: {
            parking: false,
            pool: true,
            gym: true,
            petFriendly: false,
          },
        }),
      })
    })
  })

  it('shows success message on manual save', async () => {
    const user = userEvent.setup()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const poolSwitch = screen.getByLabelText('Pool')
    await user.click(poolSwitch)

    const saveButton = screen.getByTestId('save-preferences')
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Preferences saved successfully'
      )
    })
  })

  it('shows error message on manual save failure', async () => {
    const user = userEvent.setup()
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('Network error'))
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const poolSwitch = screen.getByLabelText('Pool')
    await user.click(poolSwitch)

    const saveButton = screen.getByTestId('save-preferences')
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save preferences')
    })
  })

  it('shows loading state while saving', async () => {
    const user = userEvent.setup()
    // Use a promise that never resolves to ensure loading state persists
    mockUpdateUserProfile.mockImplementation(() => new Promise(() => {}))
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const poolSwitch = screen.getByLabelText('Pool')
    await user.click(poolSwitch)

    const saveButton = screen.getByTestId('save-preferences')
    await user.click(saveButton)

    expect(await screen.findByText(/saving.../i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled()
  })

  it('auto-generates a saved search name when empty', async () => {
    const user = userEvent.setup()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const saveSearchButton = screen.getByRole('button', {
      name: /save search/i,
    })
    await user.click(saveSearchButton)

    await waitFor(() => {
      expect(mockCreateSavedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          household_id: null,
          name: expect.stringContaining('Anywhere'),
          filters: expect.objectContaining({
            priceMin: 300000,
            priceMax: 700000,
            bedrooms: 3,
            bathrooms: 2,
          }),
        })
      )
    })
  })

  it('resets filters to defaults', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    await user.click(screen.getByRole('button', { name: /reset filters/i }))

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          priceRange: DEFAULT_PRICE_RANGE,
          bedrooms: DEFAULT_BEDROOMS,
          bathrooms: DEFAULT_BATHROOMS,
          searchRadius: DEFAULT_SEARCH_RADIUS,
          allCities: false,
          cities: [],
          neighborhoods: [],
          mustHaves: {
            parking: false,
            pool: false,
            gym: false,
            petFriendly: false,
          },
          propertyTypes: expect.objectContaining({
            single_family: true,
            townhome: true,
            house: true,
            townhouse: true,
          }),
        }),
      })
    })
  })

  it('promotes oversized city selections to all cities', async () => {
    const cities = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD },
      (_, index) => ({
        city: `City ${index}`,
        state: 'CA',
      })
    )
    const profileWithManyCities = {
      ...mockProfile,
      preferences: {
        ...mockProfile.preferences,
        allCities: false,
        cities,
        neighborhoods: [],
      },
    }

    render(
      <PreferencesSection user={mockUser} profile={profileWithManyCities} />
    )

    const user = userEvent.setup()
    await ensureListView(user)

    await waitFor(() => {
      expect(screen.getByTestId('city-search')).toBeDisabled()
    })

    expect(mockGetNeighborhoodsForCities).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        'Neighborhood filtering is disabled when all cities are selected.'
      )
    ).toBeInTheDocument()
  })

  it('promotes oversized neighborhood selections to all cities', async () => {
    const neighborhoods = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD },
      (_, index) => `neighborhood-${index}`
    )
    const profileWithManyNeighborhoods = {
      ...mockProfile,
      preferences: {
        ...mockProfile.preferences,
        allCities: false,
        cities: [{ city: 'Austin', state: 'TX' }],
        neighborhoods,
      },
    }

    render(
      <PreferencesSection
        user={mockUser}
        profile={profileWithManyNeighborhoods}
      />
    )

    const user = userEvent.setup()
    await ensureListView(user)

    await waitFor(() => {
      expect(screen.getByTestId('city-search')).toBeDisabled()
    })

    expect(mockGetNeighborhoodsForCities).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        'Neighborhood filtering is disabled when all cities are selected.'
      )
    ).toBeInTheDocument()
  })

  it('loads neighborhoods when selection is below the sentinel threshold', async () => {
    mockGetCities.mockResolvedValueOnce([
      { city: 'Austin', state: 'TX' },
      { city: 'Dallas', state: 'TX' },
      { city: 'Houston', state: 'TX' },
    ])

    const profileWithCities = {
      ...mockProfile,
      preferences: {
        ...mockProfile.preferences,
        allCities: false,
        cities: [
          { city: 'Austin', state: 'TX' },
          { city: 'Dallas', state: 'TX' },
        ],
        neighborhoods: [],
      },
    }

    render(<PreferencesSection user={mockUser} profile={profileWithCities} />)

    const user = userEvent.setup()
    await ensureListView(user)

    await waitFor(() => {
      expect(mockGetNeighborhoodsForCities).toHaveBeenCalled()
    })

    expect(mockGetNeighborhoodsForCities).toHaveBeenCalledWith([
      { city: 'Austin', state: 'TX' },
      { city: 'Dallas', state: 'TX' },
    ])
    expect(screen.getByTestId('neighborhood-search')).not.toBeDisabled()
  })

  it('redirects to the dashboard after saving a search', async () => {
    const user = userEvent.setup()
    const router = mockNextRouter()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const saveSearchButton = screen.getByRole('button', {
      name: /save search/i,
    })
    await user.click(saveSearchButton)

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/dashboard')
    })
  })
})
