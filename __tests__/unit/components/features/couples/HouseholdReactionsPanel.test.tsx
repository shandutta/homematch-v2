import { jest, describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'

// Mock the usePropertyReactions hook
const mockUsePropertyReactions = jest.fn()

jest.mock('@/hooks/useCouples', () => ({
  usePropertyReactions: (propertyId: string) =>
    mockUsePropertyReactions(propertyId),
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
}))

// Mock motion components
jest.mock('@/components/ui/motion-components', () => ({
  MotionDiv: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    [key: string]: unknown
  }) => <div {...props}>{children}</div>,
}))

// Mock skeleton
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}))

import { HouseholdReactionsPanel } from '@/components/features/couples/HouseholdReactionsPanel'

describe('HouseholdReactionsPanel', () => {
  const testPropertyId = 'test-property-123'

  beforeEach(() => {
    mockUsePropertyReactions.mockReset()
  })

  describe('Loading state', () => {
    test('renders skeleton while loading', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })

      render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(screen.getByText('Household reactions')).toBeInTheDocument()
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    })
  })

  describe('Error states', () => {
    test('renders nothing on auth errors (silent)', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Please sign in'),
      })

      const { container } = render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(container.firstChild).toBeNull()
    })

    test('renders nothing on 401 errors (silent)', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('401'),
      })

      const { container } = render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(container.firstChild).toBeNull()
    })

    test('renders nothing on 403 errors (silent)', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('403'),
      })

      const { container } = render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(container.firstChild).toBeNull()
    })

    test('renders error message for non-auth errors', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch household reactions'),
      })

      render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(
        screen.getByText("Couldn't load household reactions")
      ).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    test('renders nothing when no reactions returned', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      const { container } = render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(container.firstChild).toBeNull()
    })

    test('renders nothing when reactions is null', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      })

      const { container } = render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Populated state', () => {
    test('renders household member reactions', () => {
      const mockReactions = [
        {
          user_id: 'user-1',
          display_name: 'Alice',
          interaction_type: 'like' as const,
          created_at: '2026-05-09T12:00:00Z',
        },
        {
          user_id: 'user-2',
          display_name: 'Bob',
          interaction_type: 'dislike' as const,
          created_at: '2026-05-09T11:00:00Z',
        },
      ]

      mockUsePropertyReactions.mockReturnValue({
        data: mockReactions,
        isLoading: false,
        error: null,
      })

      render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      // Should show the section header
      expect(screen.getByText('Household reactions')).toBeInTheDocument()

      // Should show both member names
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()

      // Should show reaction labels
      expect(screen.getByText('liked')).toBeInTheDocument()
      expect(screen.getByText('passed on')).toBeInTheDocument()
    })

    test('renders all reaction types correctly', () => {
      const mockReactions = [
        {
          user_id: 'user-1',
          display_name: 'Charlie',
          interaction_type: 'like' as const,
          created_at: '2026-05-09T12:00:00Z',
        },
        {
          user_id: 'user-2',
          display_name: 'Dana',
          interaction_type: 'skip' as const,
          created_at: '2026-05-09T11:00:00Z',
        },
        {
          user_id: 'user-3',
          display_name: 'Eve',
          interaction_type: 'view' as const,
          created_at: '2026-05-09T10:00:00Z',
        },
      ]

      mockUsePropertyReactions.mockReturnValue({
        data: mockReactions,
        isLoading: false,
        error: null,
      })

      render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(screen.getByText('liked')).toBeInTheDocument()
      expect(screen.getByText('skipped')).toBeInTheDocument()
      expect(screen.getByText('viewed')).toBeInTheDocument()
    })

    test('applies custom className', () => {
      mockUsePropertyReactions.mockReturnValue({
        data: [
          {
            user_id: 'user-1',
            display_name: 'Alice',
            interaction_type: 'like' as const,
            created_at: '2026-05-09T12:00:00Z',
          },
        ],
        isLoading: false,
        error: null,
      })

      render(
        <HouseholdReactionsPanel
          propertyId={testPropertyId}
          className="custom-class"
        />
      )

      // The container div should include the custom class
      const container = screen.getByText('Household reactions').parentElement
      expect(container?.className).toContain('custom-class')
    })
  })

  describe('Unique keys', () => {
    test('uses unique key per user-interaction combination', () => {
      const mockReactions = [
        {
          user_id: 'user-1',
          display_name: 'Alice',
          interaction_type: 'like' as const,
          created_at: '2026-05-09T12:00:00Z',
        },
        {
          user_id: 'user-1',
          display_name: 'Alice',
          interaction_type: 'view' as const,
          created_at: '2026-05-09T11:00:00Z',
        },
      ]

      mockUsePropertyReactions.mockReturnValue({
        data: mockReactions,
        isLoading: false,
        error: null,
      })

      // Should not throw on duplicate keys
      const { container } = render(
        <HouseholdReactionsPanel propertyId={testPropertyId} />
      )

      expect(container).toBeTruthy()
    })
  })
})
