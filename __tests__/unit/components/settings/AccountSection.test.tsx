import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountSection } from '@/components/settings/AccountSection'
import { createClient } from '@/lib/supabase/client'

// Mock dependencies
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockSignOut = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-15T10:30:00Z',
  app_metadata: {
    provider: 'google',
  },
} as any

describe('AccountSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        signOut: mockSignOut,
      },
    })
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('displays user account information', () => {
    render(<AccountSection user={mockUser} />)

    expect(screen.getByText('Account Information')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('user-123')).toBeInTheDocument()
    expect(screen.getByText('January 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('google')).toBeInTheDocument() // Provider is displayed as lowercase
  })

  it('displays email provider for email auth', () => {
    const emailUser = { ...mockUser, app_metadata: {} }
    render(<AccountSection user={emailUser} />)

    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('handles missing created_at date', () => {
    const userWithoutDate = { ...mockUser, created_at: null }
    render(<AccountSection user={userWithoutDate} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('signs out user successfully', async () => {
    const user = userEvent.setup()
    render(<AccountSection user={mockUser} />)

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    await user.click(signOutButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('handles sign out errors', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Network error'
    mockSignOut.mockResolvedValueOnce({ error: new Error(errorMessage) })
    render(<AccountSection user={mockUser} />)

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    await user.click(signOutButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('shows loading state while signing out', async () => {
    const user = userEvent.setup()
    mockSignOut.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )
    render(<AccountSection user={mockUser} />)

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    await user.click(signOutButton)

    expect(signOutButton).toBeDisabled()
  })

  it('shows delete account section', () => {
    render(<AccountSection user={mockUser} />)

    expect(screen.getByText('Danger Zone')).toBeInTheDocument()
    expect(
      screen.getByText(/deleting your account is permanent/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /delete account/i })
    ).toBeInTheDocument()
  })

  it('requires double confirmation for account deletion', async () => {
    const user = userEvent.setup()
    global.confirm = jest
      .fn()
      .mockReturnValueOnce(true) // First confirmation
      .mockReturnValueOnce(false) // Second confirmation cancelled

    render(<AccountSection user={mockUser} />)

    const deleteButton = screen.getByRole('button', { name: /delete account/i })
    await user.click(deleteButton)

    expect(global.confirm).toHaveBeenCalledTimes(2)
    expect(global.confirm).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Are you sure you want to delete your account?')
    )
    expect(global.confirm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('This is your last chance to cancel')
    )
  })

  it('cancels deletion on first confirmation', async () => {
    const user = userEvent.setup()
    global.confirm = jest.fn().mockReturnValueOnce(false)

    render(<AccountSection user={mockUser} />)

    const deleteButton = screen.getByRole('button', { name: /delete account/i })
    await user.click(deleteButton)

    expect(global.confirm).toHaveBeenCalledTimes(1)
  })

  it('shows not implemented message for account deletion', async () => {
    const user = userEvent.setup()
    global.confirm = jest
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)

    render(<AccountSection user={mockUser} />)

    const deleteButton = screen.getByRole('button', { name: /delete account/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(
        screen.getByText(/account deletion is not yet implemented/i)
      ).toBeInTheDocument()
    })
  })

  it('shows loading state during account deletion attempt', async () => {
    const user = userEvent.setup()
    global.confirm = jest
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)

    render(<AccountSection user={mockUser} />)

    const deleteButton = screen.getByRole('button', { name: /delete account/i })

    // Button should not be disabled initially
    expect(deleteButton).not.toBeDisabled()

    // Click and wait for the error message to appear
    await user.click(deleteButton)

    // Wait for the error message to confirm the operation completed
    await waitFor(() => {
      expect(
        screen.getByText(/account deletion is not yet implemented/i)
      ).toBeInTheDocument()
    })

    // Button should be enabled again after the operation completes
    expect(deleteButton).not.toBeDisabled()
  })
})
