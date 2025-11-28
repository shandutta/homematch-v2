import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HouseholdSection } from '@/components/profile/HouseholdSection'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import { TEST_USERS, TEST_MESSAGES } from '@/__tests__/fixtures/test-data'

// Mock dependencies
jest.mock('@/lib/services/users-client')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}))

describe('HouseholdSection', () => {
  let mockCreateHousehold: jest.Mock
  let mockJoinHousehold: jest.Mock
  let mockLeaveHousehold: jest.Mock
  let mockGetInvites: jest.Mock
  let mockCreateInvite: jest.Mock
  let mockRevokeInvite: jest.Mock
  let originalClipboard: Clipboard

  beforeAll(() => {
    // Save original clipboard
    originalClipboard = navigator.clipboard
  })

  afterAll(() => {
    // Restore original clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock clipboard for each test
    const mockWriteText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })

    mockCreateHousehold = jest
      .fn()
      .mockResolvedValue({ id: 'household-123', name: 'Test Household' })
    mockJoinHousehold = jest.fn().mockResolvedValue(true)
    mockLeaveHousehold = jest.fn().mockResolvedValue(true)
    mockGetInvites = jest.fn().mockResolvedValue([])
    mockCreateInvite = jest.fn().mockResolvedValue({
      id: 'invite-1',
      status: 'pending',
    })
    mockRevokeInvite = jest.fn().mockResolvedValue(true)
    ;(UserServiceClient.createHousehold as jest.Mock) = mockCreateHousehold
    ;(UserServiceClient.joinHousehold as jest.Mock) = mockJoinHousehold
    ;(UserServiceClient.leaveHousehold as jest.Mock) = mockLeaveHousehold
    ;(UserServiceClient.getHouseholdInvitations as jest.Mock) = mockGetInvites
    ;(UserServiceClient.createHouseholdInvitation as jest.Mock) =
      mockCreateInvite
    ;(UserServiceClient.revokeHouseholdInvitation as jest.Mock) =
      mockRevokeInvite
  })

  describe('without household', () => {
    const profileWithoutHousehold = TEST_USERS.withoutHousehold.profile

    it('renders create and join household options', () => {
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      expect(screen.getByText('Create a Household')).toBeInTheDocument()
      expect(screen.getByText('Join a Household')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Enter household name')
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Enter household code')
      ).toBeInTheDocument()
    })

    it('creates a new household', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const nameInput = screen.getByPlaceholderText('Enter household name')
      const createButton = screen.getByRole('button', {
        name: /create household/i,
      })

      await user.type(nameInput, 'My Family')
      await user.click(createButton)

      await waitFor(() => {
        expect(mockCreateHousehold).toHaveBeenCalledWith({ name: 'My Family' })
        // Note: joinHousehold is no longer called - the RPC handles linking atomically
        expect(toast.success).toHaveBeenCalledWith(
          TEST_MESSAGES.household.created
        )
      })
    })

    it('validates household name is required', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const createButton = screen.getByRole('button', {
        name: /create household/i,
      })
      await user.click(createButton)

      expect(
        screen.getByText('Please enter a household name')
      ).toBeInTheDocument()
      expect(mockCreateHousehold).not.toHaveBeenCalled()
    })

    it('joins an existing household', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const codeInput = screen.getByPlaceholderText('Enter household code')
      const joinButton = screen.getByRole('button', { name: /join household/i })

      await user.type(codeInput, 'existing-household-123')
      await user.click(joinButton)

      await waitFor(() => {
        expect(mockJoinHousehold).toHaveBeenCalledWith(
          TEST_USERS.withoutHousehold.id,
          'existing-household-123'
        )
        expect(toast.success).toHaveBeenCalledWith(
          TEST_MESSAGES.household.joined
        )
      })
    })

    it('validates household code is required', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const joinButton = screen.getByRole('button', { name: /join household/i })
      await user.click(joinButton)

      expect(
        screen.getByText('Please enter a household code')
      ).toBeInTheDocument()
      expect(mockJoinHousehold).not.toHaveBeenCalled()
    })

    it('handles create household errors', async () => {
      const user = userEvent.setup()
      mockCreateHousehold.mockResolvedValueOnce(null)
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const nameInput = screen.getByPlaceholderText('Enter household name')
      const createButton = screen.getByRole('button', {
        name: /create household/i,
      })

      await user.type(nameInput, 'My Family')
      await user.click(createButton)

      await waitFor(() => {
        expect(
          screen.getByText(TEST_MESSAGES.household.error)
        ).toBeInTheDocument()
      })
    })
  })

  describe('with household', () => {
    const profileWithHousehold = TEST_USERS.withHousehold.profile

    it('displays household information', () => {
      render(<HouseholdSection profile={profileWithHousehold} />)

      expect(screen.getByText('Current Household')).toBeInTheDocument()
      expect(
        screen.getByText(TEST_USERS.withHousehold.profile.household.name)
      ).toBeInTheDocument()
      expect(
        screen.getByText(TEST_USERS.withHousehold.profile.household.id)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/share this code or send an invitation link/i)
      ).toBeInTheDocument()
    })

    it('renders copy button and shows success toast when clicked', async () => {
      // Focus on component logic: button renders and toast is called
      // Actual clipboard functionality is tested in integration tests
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')
      expect(copyButton).toBeInTheDocument()

      await user.click(copyButton)

      // Verify toast is called (component logic)
      expect(toast.success).toHaveBeenCalledWith(
        TEST_MESSAGES.clipboard.success
      )
    })

    it('loads existing invitations', async () => {
      const invite = {
        id: 'invite-1',
        invited_email: 'partner@example.com',
        invited_name: 'Partner',
        status: 'pending',
        expires_at: new Date().toISOString(),
      }
      mockGetInvites.mockResolvedValueOnce([invite])
      render(<HouseholdSection profile={profileWithHousehold} />)

      await waitFor(() => {
        expect(screen.getByText(invite.invited_email)).toBeInTheDocument()
      })
    })

    it('sends a new invitation', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithHousehold} />)

      const emailInput = screen.getByTestId('invite-email-input')
      const sendButton = screen.getByTestId('send-invite-button')

      await user.type(emailInput, 'partner@example.com')
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockCreateInvite).toHaveBeenCalledWith({
          household_id: TEST_USERS.withHousehold.profile.household.id,
          invited_email: 'partner@example.com',
          invited_name: null,
          message: null,
        })
        expect(toast.success).toHaveBeenCalledWith('Invitation sent')
      })
    })

    it('revokes an invitation', async () => {
      const user = userEvent.setup()
      mockGetInvites.mockResolvedValueOnce([
        {
          id: 'invite-1',
          invited_email: 'partner@example.com',
          invited_name: 'Partner',
          status: 'pending',
          expires_at: new Date().toISOString(),
        },
      ])
      global.confirm = jest.fn().mockReturnValue(true)

      render(<HouseholdSection profile={profileWithHousehold} />)

      const revokeButton = await screen.findByRole('button', {
        name: /revoke/i,
      })
      await user.click(revokeButton)

      expect(mockRevokeInvite).toHaveBeenCalledWith('invite-1')
    })

    it('leaves household with confirmation', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn().mockReturnValue(true)
      render(<HouseholdSection profile={profileWithHousehold} />)

      const leaveButton = screen.getByRole('button', {
        name: /leave household/i,
      })
      await user.click(leaveButton)

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to leave this household?'
      )
      await waitFor(() => {
        expect(mockLeaveHousehold).toHaveBeenCalledWith(
          TEST_USERS.withHousehold.id
        )
        expect(toast.success).toHaveBeenCalledWith(TEST_MESSAGES.household.left)
      })
    })

    it('cancels leaving household when not confirmed', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn().mockReturnValue(false)
      render(<HouseholdSection profile={profileWithHousehold} />)

      const leaveButton = screen.getByRole('button', {
        name: /leave household/i,
      })
      await user.click(leaveButton)

      expect(mockLeaveHousehold).not.toHaveBeenCalled()
    })

    it('handles leave household errors', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn().mockReturnValue(true)
      mockLeaveHousehold.mockRejectedValueOnce(new Error('Network error'))
      render(<HouseholdSection profile={profileWithHousehold} />)

      const leaveButton = screen.getByRole('button', {
        name: /leave household/i,
      })
      await user.click(leaveButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })
})
