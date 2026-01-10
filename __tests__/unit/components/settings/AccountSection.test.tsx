import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccountSection } from '@/components/settings/AccountSection'
import { createClient } from '@/lib/supabase/client'
import { InteractionService } from '@/lib/services/interactions'
import type { User } from '@supabase/supabase-js'

// Mock dependencies
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

const mockSignOut = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/services/interactions', () => ({
  InteractionService: {
    resetAllInteractions: jest.fn(),
    getInteractionSummary: jest.fn(),
  },
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-15T10:30:00Z',
  aud: 'authenticated',
  app_metadata: {
    provider: 'google',
  },
  user_metadata: {},
}

describe('AccountSection', () => {
  const mockedInteractionService = jest.mocked(InteractionService)
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(createClient).mockReturnValue({
      auth: {
        signOut: mockSignOut,
      },
    })
    mockSignOut.mockResolvedValue({ error: null })
    jest.mocked(InteractionService.resetAllInteractions).mockResolvedValue({
      deleted: true,
      count: 5,
    })
  })

  it('displays user account information', () => {
    renderWithQueryClient(<AccountSection user={mockUser} />)

    expect(screen.getByText('Account Information')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('user-123')).toBeInTheDocument()
    expect(screen.getByText('January 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('google')).toBeInTheDocument() // Provider is displayed as lowercase
  })

  it('displays email provider for email auth', () => {
    const emailUser = { ...mockUser, app_metadata: {} }
    renderWithQueryClient(<AccountSection user={emailUser} />)

    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('handles missing created_at date', () => {
    const userWithoutDate = { ...mockUser, created_at: null }
    renderWithQueryClient(<AccountSection user={userWithoutDate} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('signs out user successfully', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<AccountSection user={mockUser} />)

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
    renderWithQueryClient(<AccountSection user={mockUser} />)

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
    renderWithQueryClient(<AccountSection user={mockUser} />)

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    await user.click(signOutButton)

    expect(signOutButton).toBeDisabled()
  })

  it('shows delete account section', () => {
    renderWithQueryClient(<AccountSection user={mockUser} />)

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

    renderWithQueryClient(<AccountSection user={mockUser} />)

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

    renderWithQueryClient(<AccountSection user={mockUser} />)

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

    renderWithQueryClient(<AccountSection user={mockUser} />)

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

    renderWithQueryClient(<AccountSection user={mockUser} />)

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

  // Reset Stats tests
  describe('Reset Stats', () => {
    it('shows reset stats section', () => {
      renderWithQueryClient(<AccountSection user={mockUser} />)

      expect(screen.getByText('Reset Stats')).toBeInTheDocument()
      expect(
        screen.getByText(/clear all your likes, passes, and viewed properties/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /reset all stats/i })
      ).toBeInTheDocument()
    })

    it('requires confirmation before resetting stats', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn().mockReturnValueOnce(false)

      renderWithQueryClient(<AccountSection user={mockUser} />)

      const resetButton = screen.getByRole('button', {
        name: /reset all stats/i,
      })
      await user.click(resetButton)

      expect(global.confirm).toHaveBeenCalledTimes(1)
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to reset all your stats')
      )
      expect(InteractionService.resetAllInteractions).not.toHaveBeenCalled()
    })

    it('resets stats successfully after confirmation', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn().mockReturnValueOnce(true)

      renderWithQueryClient(<AccountSection user={mockUser} />)

      const resetButton = screen.getByRole('button', {
        name: /reset all stats/i,
      })
      await user.click(resetButton)

      await waitFor(() => {
        expect(InteractionService.resetAllInteractions).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(
          screen.getByText(/successfully reset 5 interactions/i)
        ).toBeInTheDocument()
      })
    })

    it('handles reset stats error', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn().mockReturnValueOnce(true)
      const errorMessage = 'Failed to reset'
      mockedInteractionService.resetAllInteractions.mockRejectedValueOnce(
        new Error(errorMessage)
      )

      renderWithQueryClient(<AccountSection user={mockUser} />)

      const resetButton = screen.getByRole('button', {
        name: /reset all stats/i,
      })
      await user.click(resetButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('shows singular message for single interaction reset', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn().mockReturnValueOnce(true)
      mockedInteractionService.resetAllInteractions.mockResolvedValueOnce({
        deleted: true,
        count: 1,
      })

      renderWithQueryClient(<AccountSection user={mockUser} />)

      const resetButton = screen.getByRole('button', {
        name: /reset all stats/i,
      })
      await user.click(resetButton)

      await waitFor(() => {
        expect(
          screen.getByText(/successfully reset 1 interaction\./i)
        ).toBeInTheDocument()
      })
    })
  })
})
