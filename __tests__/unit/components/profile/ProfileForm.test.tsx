import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { UserService } from '@/lib/services/users'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/services/users')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
} as any

const mockProfile = {
  id: 'user-123',
  preferences: {
    display_name: 'Test User',
    phone: '123-456-7890',
    bio: 'Test bio',
  },
} as any

describe('ProfileForm', () => {
  let mockUpdateUserProfile: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateUserProfile = jest.fn().mockResolvedValue(mockProfile)
    ;(UserService as jest.Mock).mockImplementation(() => ({
      updateUserProfile: mockUpdateUserProfile,
    }))
  })

  it('renders form with initial values from profile', () => {
    render(<ProfileForm user={mockUser} profile={mockProfile} />)

    expect(screen.getByLabelText(/display name/i)).toHaveValue('Test User')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('123-456-7890')
    expect(screen.getByLabelText(/bio/i)).toHaveValue('Test bio')
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
  })

  it('uses email username as default display name when not set', () => {
    const profileWithoutPrefs = {
      ...mockProfile,
      preferences: {},
    }
    render(<ProfileForm user={mockUser} profile={profileWithoutPrefs} />)

    expect(screen.getByLabelText(/display name/i)).toHaveValue('test')
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} profile={mockProfile} />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    await user.clear(displayNameInput)
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument()
    })
  })

  it('submits form with updated values', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} profile={mockProfile} />)

    const displayNameInput = screen.getByLabelText(/display name/i)
    const phoneInput = screen.getByLabelText(/phone number/i)
    const bioInput = screen.getByLabelText(/bio/i)

    await user.clear(displayNameInput)
    await user.type(displayNameInput, 'New Name')
    await user.clear(phoneInput)
    await user.type(phoneInput, '987-654-3210')
    await user.clear(bioInput)
    await user.type(bioInput, 'New bio text')

    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: {
          display_name: 'New Name',
          phone: '987-654-3210',
          bio: 'New bio text',
        },
        onboarding_completed: true,
      })
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully')
    })
  })

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup()
    mockUpdateUserProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<ProfileForm user={mockUser} profile={mockProfile} />)

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    expect(screen.getByText(/saving.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('handles submission errors', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to update profile'
    mockUpdateUserProfile.mockRejectedValueOnce(new Error(errorMessage))

    render(<ProfileForm user={mockUser} profile={mockProfile} />)

    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('handles null update response', async () => {
    const user = userEvent.setup()
    mockUpdateUserProfile.mockResolvedValueOnce(null)

    render(<ProfileForm user={mockUser} profile={mockProfile} />)

    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument()
    })
  })
})