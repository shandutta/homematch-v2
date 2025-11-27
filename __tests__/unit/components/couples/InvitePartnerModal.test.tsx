import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvitePartnerModal } from '@/components/couples/InvitePartnerModal'

// Mock the UserServiceClient
jest.mock('@/lib/services/users-client', () => ({
  UserServiceClient: {
    getHouseholdInvitations: jest.fn(),
    createHouseholdInvitation: jest.fn(),
  },
}))

// Mock the toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock getBrowserAppUrl
jest.mock('@/lib/utils/site-url', () => ({
  getBrowserAppUrl: () => 'https://test.homematch.com',
}))

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
    size,
    ...props
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    disabled,
    className,
    type,
    ...props
  }: any) => (
    <input
      type={type || 'text'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      {...props}
    />
  ),
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) => (
    <div data-testid="alert" data-variant={variant} className={className}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-description">{children}</p>
  ),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

jest.mock('lucide-react', () => ({
  UserPlus: () => <span data-testid="icon-user-plus" />,
  Mail: () => <span data-testid="icon-mail" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
  Search: () => <span data-testid="icon-search" />,
  User: () => <span data-testid="icon-user" />,
  Loader2: () => <span data-testid="icon-loader" />,
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as jest.MockedFunction<typeof fetch>

// Mock clipboard
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
}
Object.assign(navigator, { clipboard: mockClipboard })

import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'

const mockedUserService = UserServiceClient as jest.Mocked<
  typeof UserServiceClient
>
const mockedToast = toast as jest.Mocked<typeof toast>

describe('InvitePartnerModal Component', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    householdId: 'test-household-123',
    userId: 'test-user-456',
  }

  const mockPendingInvites = [
    {
      id: 'invite-1',
      household_id: 'test-household-123',
      invited_email: 'partner1@example.com',
      invited_name: 'Partner One',
      created_by: 'test-user-456',
      message: null,
      token: 'token-abc',
      status: 'pending',
      expires_at: '2024-12-31T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockedUserService.getHouseholdInvitations as jest.Mock).mockResolvedValue(
      []
    )
    ;(
      mockedUserService.createHouseholdInvitation as jest.Mock
    ).mockResolvedValue({ id: 'new-invite' })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    test('should render modal when open is true', () => {
      render(<InvitePartnerModal {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Invite Your Partner')).toBeInTheDocument()
    })

    test('should not render modal when open is false', () => {
      render(<InvitePartnerModal {...defaultProps} open={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    test('should show search input for finding users', () => {
      render(<InvitePartnerModal {...defaultProps} />)

      expect(
        screen.getByPlaceholderText('Search by email address...')
      ).toBeInTheDocument()
    })

    test('should show email input fields', () => {
      render(<InvitePartnerModal {...defaultProps} />)

      expect(
        screen.getByPlaceholderText('Their name (optional)')
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('partner@example.com')
      ).toBeInTheDocument()
    })

    test('should show household code section', () => {
      render(<InvitePartnerModal {...defaultProps} />)

      expect(
        screen.getByText('Or share your household code')
      ).toBeInTheDocument()
      expect(screen.getByText('test-household-123')).toBeInTheDocument()
    })
  })

  describe('User Search', () => {
    test('should show search results when query has 3+ characters', async () => {
      const mockUsers = [
        {
          id: 'found-user-1',
          email: 'john@example.com',
          display_name: 'John Doe',
          avatar_url: null,
          household_id: null,
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ users: mockUsers }),
      } as Response)

      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(
        'Search by email address...'
      )
      await user.type(searchInput, 'john@')

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    test('should not search when query is less than 3 characters', async () => {
      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(
        'Search by email address...'
      )
      await user.type(searchInput, 'jo')

      // Give time for potential fetch
      await new Promise((r) => setTimeout(r, 400))

      // The fetch should only be called for initial invite loading, not search
      const searchCalls = mockFetch.mock.calls.filter((call) =>
        (call[0] as string).includes('/api/users/search')
      )
      expect(searchCalls.length).toBe(0)
    })

    test('should show "no users found" message when search returns empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ users: [] }),
      } as Response)

      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(
        'Search by email address...'
      )
      await user.type(searchInput, 'nonexistent@email.com')

      await waitFor(() => {
        expect(
          screen.getByText(
            'No users found. You can still invite them by email below.'
          )
        ).toBeInTheDocument()
      })
    })

    test('should select user and populate email field when clicked', async () => {
      const mockUsers = [
        {
          id: 'found-user-1',
          email: 'selected@example.com',
          display_name: 'Selected User',
          avatar_url: null,
          household_id: null,
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ users: mockUsers }),
      } as Response)

      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(
        'Search by email address...'
      )
      await user.type(searchInput, 'selected@')

      await waitFor(() => {
        expect(screen.getByText('Selected User')).toBeInTheDocument()
      })

      // Click on the user to select them
      const userButton = screen.getByText('Selected User').closest('button')
      if (userButton) {
        await user.click(userButton)
      }

      await waitFor(() => {
        // Email field should be populated
        const emailInput = screen.getByPlaceholderText(
          'partner@example.com'
        ) as HTMLInputElement
        expect(emailInput.value).toBe('selected@example.com')
      })
    })
  })

  describe('Sending Invitations', () => {
    test('should send invitation when form is filled and submitted', async () => {
      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('Their name (optional)')
      const emailInput = screen.getByPlaceholderText('partner@example.com')
      const sendButton = screen.getByRole('button', {
        name: /send invitation/i,
      })

      await user.type(nameInput, 'Partner Name')
      await user.type(emailInput, 'partner@test.com')
      await user.click(sendButton)

      await waitFor(() => {
        expect(
          mockedUserService.createHouseholdInvitation
        ).toHaveBeenCalledWith({
          household_id: 'test-household-123',
          invited_email: 'partner@test.com',
          invited_name: 'Partner Name',
          message: null,
        })
      })
    })

    test('should show success toast when invitation is sent', async () => {
      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('partner@example.com')
      const sendButton = screen.getByRole('button', {
        name: /send invitation/i,
      })

      await user.type(emailInput, 'partner@test.com')
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockedToast.success).toHaveBeenCalledWith('Invitation sent!')
      })
    })

    test('should show error when sending invitation fails', async () => {
      ;(
        mockedUserService.createHouseholdInvitation as jest.Mock
      ).mockRejectedValue(new Error('Failed to send'))

      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('partner@example.com')
      const sendButton = screen.getByRole('button', {
        name: /send invitation/i,
      })

      await user.type(emailInput, 'partner@test.com')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('Failed to send')).toBeInTheDocument()
      })
    })

    test('should show error when email is empty', async () => {
      render(<InvitePartnerModal {...defaultProps} />)

      const sendButton = screen.getByRole('button', {
        name: /send invitation/i,
      })

      // The button should be disabled when email is empty
      expect(sendButton).toBeDisabled()
    })

    test('should clear form after successful submission', async () => {
      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText(
        'Their name (optional)'
      ) as HTMLInputElement
      const emailInput = screen.getByPlaceholderText(
        'partner@example.com'
      ) as HTMLInputElement
      const sendButton = screen.getByRole('button', {
        name: /send invitation/i,
      })

      await user.type(nameInput, 'Partner Name')
      await user.type(emailInput, 'partner@test.com')
      await user.click(sendButton)

      await waitFor(() => {
        expect(nameInput.value).toBe('')
        expect(emailInput.value).toBe('')
      })
    })
  })

  describe('Pending Invitations', () => {
    test('should show pending invitations when they exist', async () => {
      ;(
        mockedUserService.getHouseholdInvitations as jest.Mock
      ).mockResolvedValue(mockPendingInvites)

      render(<InvitePartnerModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Partner One')).toBeInTheDocument()
        expect(screen.getByText('partner1@example.com')).toBeInTheDocument()
      })
    })

    test('should show badge with pending invite count', async () => {
      ;(
        mockedUserService.getHouseholdInvitations as jest.Mock
      ).mockResolvedValue(mockPendingInvites)

      render(<InvitePartnerModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
      })
    })
  })

  describe('Copy Functionality', () => {
    test('should display household code for copying', async () => {
      render(<InvitePartnerModal {...defaultProps} />)

      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByText('test-household-123')).toBeInTheDocument()
      })

      // Verify the household code is displayed in a code element
      const codeElement = screen.getByText('test-household-123')
      expect(codeElement.tagName.toLowerCase()).toBe('code')

      // Verify copy button exists near the household code
      const copyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('data-variant') === 'outline')
      expect(copyButtons.length).toBeGreaterThan(0)
    })

    test('should display pending invitations with copy buttons', async () => {
      ;(
        mockedUserService.getHouseholdInvitations as jest.Mock
      ).mockResolvedValue(mockPendingInvites)

      render(<InvitePartnerModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Partner One')).toBeInTheDocument()
        expect(screen.getByText('partner1@example.com')).toBeInTheDocument()
      })

      // Verify copy buttons exist for pending invites
      const outlineButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('data-variant') === 'outline')
      // Should have at least one copy button (for the invite link)
      expect(outlineButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Loading States', () => {
    test('should show loading indicator when fetching pending invites', async () => {
      // Create a promise that doesn't resolve immediately
      let resolveInvites: (value: any) => void
      const invitesPromise = new Promise((resolve) => {
        resolveInvites = resolve
      })
      ;(mockedUserService.getHouseholdInvitations as jest.Mock).mockReturnValue(
        invitesPromise
      )

      render(<InvitePartnerModal {...defaultProps} />)

      // Initially should show loading indicators (there may be multiple)
      const loaders = screen.getAllByTestId('icon-loader')
      expect(loaders.length).toBeGreaterThan(0)

      // Resolve the promise
      resolveInvites!(mockPendingInvites)

      await waitFor(() => {
        expect(screen.getByText('Partner One')).toBeInTheDocument()
      })
    })

    test('should show loading state when sending invitation', async () => {
      // Create a promise that doesn't resolve immediately
      let resolveCreate: (value: any) => void
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve
      })
      ;(
        mockedUserService.createHouseholdInvitation as jest.Mock
      ).mockReturnValue(createPromise)

      const user = userEvent.setup()
      render(<InvitePartnerModal {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('partner@example.com')
      const sendButton = screen.getByRole('button', {
        name: /send invitation/i,
      })

      await user.type(emailInput, 'partner@test.com')
      await user.click(sendButton)

      // Should show sending state
      expect(screen.getByText('Sending...')).toBeInTheDocument()

      // Resolve the promise
      resolveCreate!({ id: 'new-invite' })

      await waitFor(() => {
        expect(screen.queryByText('Sending...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('should have proper dialog title', () => {
      render(<InvitePartnerModal {...defaultProps} />)

      expect(screen.getByText('Invite Your Partner')).toBeInTheDocument()
    })

    test('should have proper dialog description', () => {
      render(<InvitePartnerModal {...defaultProps} />)

      expect(
        screen.getByText(/Send an invitation to your partner/)
      ).toBeInTheDocument()
    })

    test('should have labeled form inputs', () => {
      render(<InvitePartnerModal {...defaultProps} />)

      expect(screen.getByText("Partner's name")).toBeInTheDocument()
      expect(screen.getByText('Email address')).toBeInTheDocument()
      expect(
        screen.getByText('Personal message (optional)')
      ).toBeInTheDocument()
    })
  })
})
