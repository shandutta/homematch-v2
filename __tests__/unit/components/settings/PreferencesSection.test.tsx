import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/services/users-client', () => ({
  UserServiceClient: {
    updateUserProfile: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateUserProfile = jest
      .spyOn(UserServiceClient, 'updateUserProfile')
      .mockResolvedValue(true as any)
  })

  afterEach(() => {
    mockUpdateUserProfile.mockRestore()
  })

  it('renders all preference controls with initial values', () => {
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    // Price range
    expect(
      screen.getByText(/price range: \$300,000 - \$700,000/i)
    ).toBeInTheDocument()

    // Bedrooms and bathrooms
    expect(screen.getByText('3+ Bedrooms')).toBeInTheDocument()
    expect(screen.getByText('2+ Bathrooms')).toBeInTheDocument()

    // Search radius
    expect(screen.getByText('Search Radius: 15 miles')).toBeInTheDocument()

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
  })

  it('handles default preferences when none exist', () => {
    const profileWithoutPrefs = { ...mockProfile, preferences: {} }
    render(<PreferencesSection user={mockUser} profile={profileWithoutPrefs} />)

    expect(
      screen.getByText(/price range: \$200,000 - \$800,000/i)
    ).toBeInTheDocument()
    expect(screen.getByText('2+ Bedrooms')).toBeInTheDocument()
    expect(screen.getByText('2+ Bathrooms')).toBeInTheDocument()
    expect(screen.getByText('Search Radius: 10 miles')).toBeInTheDocument()
  })

  it('updates bedrooms selection', async () => {
    const user = userEvent.setup()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const bedroomsSelect = screen.getByRole('combobox', {
      name: 'Minimum Bedrooms',
    })
    await user.click(bedroomsSelect)
    await user.click(screen.getByText('4+ Bedrooms'))

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          bedrooms: 4,
        }),
      })
    })
  })

  it('updates bathrooms selection', async () => {
    const user = userEvent.setup()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const bathroomsSelect = screen.getByRole('combobox', {
      name: 'Minimum Bathrooms',
    })
    await user.click(bathroomsSelect)
    await user.click(screen.getByText('2.5+ Bathrooms'))

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          bathrooms: 2.5,
        }),
      })
    })
  })

  it('toggles property types', async () => {
    const user = userEvent.setup()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const condoSwitch = screen.getByLabelText('Condo/Apartment')
    const houseSwitch = screen.getByLabelText('Single Family Home')

    await user.click(condoSwitch) // Turn on
    await user.click(houseSwitch) // Turn off

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    await user.click(saveButton)

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

  it('toggles must-have features', async () => {
    const user = userEvent.setup()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const poolSwitch = screen.getByLabelText('Pool')
    const parkingSwitch = screen.getByLabelText('Parking')

    await user.click(poolSwitch) // Turn on
    await user.click(parkingSwitch) // Turn off

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    await user.click(saveButton)

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

  it('shows success message on save', async () => {
    const user = userEvent.setup()
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Preferences saved successfully'
      )
    })
  })

  it('shows error message on save failure', async () => {
    const user = userEvent.setup()
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('Network error'))
    render(<PreferencesSection user={mockUser} profile={mockProfile} />)

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
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

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    await user.click(saveButton)

    expect(await screen.findByText(/saving.../i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled()
  })
})
