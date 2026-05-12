/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Casts: we synthesize partial Response/fetch shapes for jest mocks; full
// Response construction is over-specified for what these unit tests assert.
/**
 * CouplesPageClient Unit Tests
 *
 * These tests focus ONLY on simple, isolated behaviors that don't require
 * complex database mocking:
 * - Authentication check (no session → NetworkErrorState card)
 * - Loading state (pending query → skeleton)
 *
 * State-specific tests (No Household, Waiting for Partner, Active Household)
 * are in integration tests to avoid excessive mocking of Supabase queries.
 *
 * See: __tests__/integration/couples-page-client.test.tsx
 * Run with: pnpm run test:integration
 *
 * NOTE: Identity is sourced from /api/users/me (Clerk-aware) since the
 * QA ISSUE-004 fix. Tests mock global.fetch for that endpoint and stop
 * asserting the old `toast.authRequired()` side effect.
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

// Toast mock — fix-001 removed the authRequired spam from the unauth path,
// but the surface is still wired for other call sites.
jest.mock('@/lib/utils/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    authRequired: jest.fn(),
    networkError: jest.fn(),
  },
}))

// Import after mocks are set up
import { CouplesPageClient } from '@/components/couples/CouplesPageClient'

// Mock the Supabase client — used for household lookup once we have an id.
const mockSupabaseClient = {
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
jest.mock('framer-motion')

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
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  describe('Authentication', () => {
    test('should render NetworkErrorState when /api/users/me returns 401', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }) as unknown as typeof global.fetch

      render(<CouplesPageClient />)

      await waitFor(() => {
        expect(screen.getByTestId('network-error-state')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    test('should show skeleton while loading', async () => {
      // /api/users/me hangs so the component never advances past loading.
      global.fetch = jest
        .fn()
        .mockReturnValue(
          new Promise(() => {})
        ) as unknown as typeof global.fetch

      render(<CouplesPageClient />)

      expect(screen.getByTestId('couples-skeleton')).toBeInTheDocument()
    })
  })
})
