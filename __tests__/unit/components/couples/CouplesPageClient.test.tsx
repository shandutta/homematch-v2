/**
 * CouplesPageClient Unit Tests
 *
 * These tests focus ONLY on simple, isolated behaviors that don't require
 * complex database mocking:
 * - Authentication check (no session → toast)
 * - Loading state (pending query → skeleton)
 *
 * State-specific tests (No Household, Waiting for Partner, Active Household)
 * are in integration tests to avoid excessive mocking of Supabase queries.
 *
 * See: __tests__/integration/couples-page-client.test.tsx
 * Run with: pnpm run test:integration
 */
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'

// Mock toast - only need authRequired for these tests
const mockToastAuthRequired = jest.fn()

jest.mock('@/lib/utils/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    authRequired: mockToastAuthRequired,
    networkError: jest.fn(),
  },
}))

// Import after mocks are set up
import { CouplesPageClient } from '@/components/couples/CouplesPageClient'

// Mock the Supabase client - minimal mock for auth and loading tests
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
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

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

// Mock only the loading skeleton - that's all we need for these tests
jest.mock('@/components/couples/CouplesLoadingStates', () => ({
  CouplesPageSkeleton: () => (
    <div data-testid="couples-skeleton">Loading...</div>
  ),
}))

// Mock empty states (needed if component tries to render them)
jest.mock('@/components/couples/CouplesEmptyStates', () => ({
  NoHouseholdState: () => <div data-testid="no-household-state" />,
  WaitingForPartnerState: () => <div data-testid="waiting-partner-state" />,
  NetworkErrorState: () => <div data-testid="network-error-state" />,
}))

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
  })

  afterEach(() => {
    jest.restoreAllMocks()
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
      // Make the query hang (never resolves)
      const pending = jest.fn().mockReturnValue(new Promise(() => {}))
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: pending,
            maybeSingle: pending,
          }),
        }),
      })

      render(<CouplesPageClient />)

      expect(screen.getByTestId('couples-skeleton')).toBeInTheDocument()
    })
  })
})
