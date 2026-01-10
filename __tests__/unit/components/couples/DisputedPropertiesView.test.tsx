import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DisputedPropertiesView } from '@/components/couples/DisputedPropertiesView'
import { createJsonResponse } from '@/__tests__/utils/http-helpers'

jest.mock('@/lib/utils/toast', () => ({
  toast: {
    authRequired: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

jest.mock('@/components/ui/motion-components', () => ({
  MotionDiv: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    [key: string]: unknown
  }) => <div {...props}>{children}</div>,
}))

jest.mock('@/components/couples/CouplesEmptyStates', () => ({
  NoHouseholdState: () => <div data-testid="no-household-state" />,
  WaitingForPartnerState: ({
    onInvite,
  }: {
    onInvite?: () => void
    householdId?: string
  }) => (
    <div data-testid="waiting-partner-state">
      <button type="button" onClick={onInvite}>
        Invite Someone
      </button>
    </div>
  ),
}))

jest.mock('@/components/couples/InvitePartnerModal', () => ({
  InvitePartnerModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="invite-partner-modal" /> : null,
}))

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
  },
  from: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('DisputedPropertiesView', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn()
  const mockSession = {
    access_token: 'test-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.mockReset()
    Object.defineProperty(global, 'fetch', {
      value: fetchMock,
      writable: true,
    })

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    })
  })

  it('renders the no-household empty state when the user has no household', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { household_id: null },
            error: null,
          }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    })

    render(<DisputedPropertiesView />)

    await waitFor(() => {
      expect(screen.getByTestId('no-household-state')).toBeInTheDocument()
    })
  })

  it('renders the waiting-partner empty state and opens invite modal', async () => {
    const user = userEvent.setup()

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { household_id: 'household-1' },
            error: null,
          }),
        }
      }

      if (table === 'households') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { user_count: 1 },
            error: null,
          }),
        }
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    })

    render(<DisputedPropertiesView />)

    await waitFor(() => {
      expect(screen.getByTestId('waiting-partner-state')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Invite Someone' }))

    await waitFor(() => {
      expect(screen.getByTestId('invite-partner-modal')).toBeInTheDocument()
    })
  })

  it('renders the empty disputes state when there are no disputed properties', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { household_id: 'household-2' },
            error: null,
          }),
        }
      }

      if (table === 'households') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { user_count: 2 },
            error: null,
          }),
        }
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
    fetchMock.mockResolvedValue(createJsonResponse({ disputedProperties: [] }))

    render(<DisputedPropertiesView />)

    await waitFor(() => {
      expect(screen.getByText('No Disputed Properties')).toBeInTheDocument()
    })
  })

  it('renders an error state when the disputed properties endpoint fails', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { household_id: 'household-3' },
            error: null,
          }),
        }
      }

      if (table === 'households') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { user_count: 2 },
            error: null,
          }),
        }
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }))

    render(<DisputedPropertiesView />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Properties')).toBeInTheDocument()
    })
  })
})
