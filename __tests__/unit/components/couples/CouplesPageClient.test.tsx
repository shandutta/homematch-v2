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

// Mock toast - define mock functions first
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
const mockToastAuthRequired = jest.fn()
const mockToastNetworkError = jest.fn()

jest.mock('@/lib/utils/toast', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    authRequired: mockToastAuthRequired,
    networkError: mockToastNetworkError,
  },
}))

// Import after mocks are set up
import { CouplesPageClient } from '@/components/couples/CouplesPageClient'

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
  },
  from: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock next/link
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({
      children,
      href,
    }: {
      children: React.ReactNode
      href: string
    }) => <a href={href}>{children}</a>,
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: React.ReactNode
      [key: string]: unknown
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

// Mock the motion components
jest.mock('@/components/ui/motion-components', () => ({
  MotionDiv: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    [key: string]: unknown
  }) => <div {...props}>{children}</div>,
  scaleIn: {},
  fadeInUp: {},
  slideInRight: {},
  normalTransition: {},
}))

// Mock child components that aren't under test
jest.mock('@/components/couples/CouplesLoadingStates', () => ({
  CouplesPageSkeleton: () => (
    <div data-testid="couples-skeleton">Loading...</div>
  ),
}))

jest.mock('@/components/couples/CouplesMutualLikesSection', () => ({
  CouplesMutualLikesSection: () => <div data-testid="mutual-likes-section" />,
}))

jest.mock('@/components/couples/CouplesActivityFeed', () => ({
  CouplesActivityFeed: () => <div data-testid="activity-feed" />,
}))

jest.mock('@/components/couples/CouplesStats', () => ({
  CouplesStats: () => <div data-testid="couples-stats" />,
}))

jest.mock('@/components/couples/CouplesHero', () => ({
  CouplesHero: () => <div data-testid="couples-hero" />,
}))

jest.mock('@/components/couples/DisputedPropertiesAlert', () => ({
  DisputedPropertiesAlert: () => <div data-testid="disputed-alert" />,
}))

// Mock InvitePartnerModal
jest.mock('@/components/couples/InvitePartnerModal', () => ({
  InvitePartnerModal: ({
    open,
    onOpenChange,
    householdId,
    userId,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    householdId: string
    userId: string
  }) =>
    open ? (
      <div data-testid="invite-partner-modal">
        <span data-testid="modal-household-id">{householdId}</span>
        <span data-testid="modal-user-id">{userId}</span>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}))

// Mock fetch for API calls
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

describe('CouplesPageClient', () => {
  const mockSession = {
    access_token: 'test-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default: user is authenticated
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    })

    // Default: mock fetch to return empty data
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ mutualLikes: [], activity: [], stats: null }),
    } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('No Household State', () => {
    beforeEach(() => {
      // User has no household
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { household_id: null, households: null },
              error: null,
            }),
          }),
        }),
      })
    })

    test('should show NoHouseholdState when user has no household', async () => {
      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /invite partner/i })
        ).toBeInTheDocument()
      })

      expect(
        screen.getByRole('link', { name: /create household/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /join existing/i })
      ).toBeInTheDocument()
    })

    test('should create household and open invite modal when invite partner is clicked', async () => {
      const newHouseholdId = 'new-household-123'

      // Mock household creation
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: newHouseholdId },
            error: null,
          }),
        }),
      })

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      })

      // Initial query returns no household
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { household_id: null, households: null },
                  error: null,
                }),
              }),
            }),
            update: updateMock,
          }
        }
        if (table === 'households') {
          return {
            insert: insertMock,
          }
        }
        return {}
      })

      const user = userEvent.setup()
      render(<CouplesPageClient />)

      // Wait for initial load
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /invite partner/i })
        ).toBeInTheDocument()
      })

      // Click invite partner button
      const inviteButton = screen.getByRole('button', {
        name: /invite partner/i,
      })
      await user.click(inviteButton)

      // Wait for household creation and modal to open
      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledWith({
          created_by: 'test-user-id',
          user_count: 1,
        })
      })

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          'Household created! Now invite your partner.'
        )
      })
    })

    test('should show error toast when household creation fails', async () => {
      // Mock household creation failure
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { household_id: null, households: null },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'households') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      const user = userEvent.setup()
      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /invite partner/i })
        ).toBeInTheDocument()
      })

      const inviteButton = screen.getByRole('button', {
        name: /invite partner/i,
      })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Failed to create household',
          expect.any(String)
        )
      })
    })

    test('should show error toast when user profile update fails after household creation', async () => {
      const newHouseholdId = 'new-household-456'

      // Mock successful household creation but failed profile update
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: newHouseholdId },
            error: null,
          }),
        }),
      })

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Profile update failed' },
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { household_id: null, households: null },
                  error: null,
                }),
              }),
            }),
            update: updateMock,
          }
        }
        if (table === 'households') {
          return {
            insert: insertMock,
          }
        }
        return {}
      })

      const user = userEvent.setup()
      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /invite partner/i })
        ).toBeInTheDocument()
      })

      const inviteButton = screen.getByRole('button', {
        name: /invite partner/i,
      })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Failed to create household',
          expect.any(String)
        )
      })
    })

    test('should show auth required when session expires during household creation', async () => {
      // Initial session exists for loading
      mockSupabaseClient.auth.getSession
        .mockResolvedValueOnce({
          data: { session: mockSession },
        })
        // Second call during household creation returns no session
        .mockResolvedValueOnce({
          data: { session: null },
        })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { household_id: null, households: null },
              error: null,
            }),
          }),
        }),
      })

      const user = userEvent.setup()
      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /invite partner/i })
        ).toBeInTheDocument()
      })

      const inviteButton = screen.getByRole('button', {
        name: /invite partner/i,
      })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(mockToastAuthRequired).toHaveBeenCalled()
      })
    })
  })

  describe('Waiting for Partner State', () => {
    const householdId = 'existing-household-456'

    beforeEach(() => {
      // User has household but is alone
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                household_id: householdId,
                households: { id: householdId, user_count: 1 },
              },
              error: null,
            }),
          }),
        }),
      })
    })

    test('should show WaitingForPartnerState when user is alone in household', async () => {
      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /send invitation/i })
        ).toBeInTheDocument()
      })

      expect(screen.getByText(householdId)).toBeInTheDocument()
    })

    test('should open invite modal when send invitation is clicked', async () => {
      const user = userEvent.setup()
      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /send invitation/i })
        ).toBeInTheDocument()
      })

      const inviteButton = screen.getByRole('button', {
        name: /send invitation/i,
      })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(screen.getByTestId('invite-partner-modal')).toBeInTheDocument()
      })

      // Verify modal receives correct props
      expect(screen.getByTestId('modal-household-id')).toHaveTextContent(
        householdId
      )
      expect(screen.getByTestId('modal-user-id')).toHaveTextContent(
        'test-user-id'
      )
    })
  })

  describe('Active Household State', () => {
    const householdId = 'active-household-789'

    beforeEach(() => {
      // User has household with partner
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                household_id: householdId,
                households: { id: householdId, user_count: 2 },
              },
              error: null,
            }),
          }),
        }),
      })

      // Mock successful API responses
      mockFetch.mockImplementation(async (url) => {
        const urlStr = url as string
        if (urlStr.includes('mutual-likes')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ mutualLikes: [] }),
          } as Response
        }
        if (urlStr.includes('activity')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ activity: [] }),
          } as Response
        }
        if (urlStr.includes('stats')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              stats: { total_household_likes: 5, mutual_like_count: 2 },
            }),
          } as Response
        }
        return { ok: true, status: 200, json: async () => ({}) } as Response
      })
    })

    test('should show active couples dashboard when household has 2+ members', async () => {
      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('couples-hero')).toBeInTheDocument()
      })

      expect(screen.getByTestId('mutual-likes-section')).toBeInTheDocument()
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
      expect(screen.getByTestId('couples-stats')).toBeInTheDocument()
    })
  })

  describe('Authentication', () => {
    test('should show auth required toast when no session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(mockToastAuthRequired).toHaveBeenCalled()
      })
    })
  })

  describe('Loading State', () => {
    test('should show skeleton while loading', async () => {
      // Make the query hang
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue(new Promise(() => {})), // Never resolves
          }),
        }),
      })

      render(<CouplesPageClient />)

      expect(screen.getByTestId('couples-skeleton')).toBeInTheDocument()
    })
  })
})
