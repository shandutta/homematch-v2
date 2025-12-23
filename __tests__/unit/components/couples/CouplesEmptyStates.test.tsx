import { jest, describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  NoHouseholdState,
  WaitingForPartnerState,
  NoMutualLikesState,
  NetworkErrorState,
} from '@/components/couples/CouplesEmptyStates'

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
  normalTransition: {},
}))

describe('CouplesEmptyStates', () => {
  describe('NoHouseholdState', () => {
    test('should render without invite button when onInvitePartner is not provided', () => {
      render(<NoHouseholdState />)

      expect(
        screen.getByRole('link', { name: /create household/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /join existing/i })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /invite someone/i })
      ).not.toBeInTheDocument()
    })

    test('should render invite button when onInvitePartner is provided', () => {
      const mockOnInvite = jest.fn()
      render(<NoHouseholdState onInvitePartner={mockOnInvite} />)

      expect(
        screen.getByRole('button', { name: /invite someone/i })
      ).toBeInTheDocument()
    })

    test('should call onInvitePartner when invite button is clicked', async () => {
      const mockOnInvite = jest.fn()
      const user = userEvent.setup()
      render(<NoHouseholdState onInvitePartner={mockOnInvite} />)

      const inviteButton = screen.getByRole('button', {
        name: /invite someone/i,
      })
      await user.click(inviteButton)

      expect(mockOnInvite).toHaveBeenCalledTimes(1)
    })

    test('should show invite button as primary when onInvitePartner is provided', () => {
      const mockOnInvite = jest.fn()
      render(<NoHouseholdState onInvitePartner={mockOnInvite} />)

      const inviteButton = screen.getByRole('button', {
        name: /invite someone/i,
      })

      // Invite button should be visible and clickable
      expect(inviteButton).toBeInTheDocument()
      expect(inviteButton).toBeEnabled()
    })

    test('should show all three buttons when onInvitePartner is provided', () => {
      const mockOnInvite = jest.fn()
      render(<NoHouseholdState onInvitePartner={mockOnInvite} />)

      // All three options should be present
      expect(
        screen.getByRole('button', { name: /invite someone/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /create household/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /join existing/i })
      ).toBeInTheDocument()
    })

    test('should have correct links for household actions', () => {
      render(<NoHouseholdState />)

      const createLink = screen.getByRole('link', { name: /create household/i })
      const joinLink = screen.getByRole('link', { name: /join existing/i })

      expect(createLink).toHaveAttribute('href', '/household/create')
      expect(joinLink).toHaveAttribute('href', '/household/join')
    })

    test('should display informative text about couples feature', () => {
      render(<NoHouseholdState />)

      expect(
        screen.getByText(/discover mutual likes and track progress/i)
      ).toBeInTheDocument()
    })
  })

  describe('WaitingForPartnerState', () => {
    test('should render send invitation button', () => {
      render(<WaitingForPartnerState />)

      expect(
        screen.getByRole('button', { name: /send invitation/i })
      ).toBeInTheDocument()
    })

    test('should call onInvite when send invitation is clicked', async () => {
      const mockOnInvite = jest.fn()
      const user = userEvent.setup()
      render(<WaitingForPartnerState onInvite={mockOnInvite} />)

      const inviteButton = screen.getByRole('button', {
        name: /send invitation/i,
      })
      await user.click(inviteButton)

      expect(mockOnInvite).toHaveBeenCalledTimes(1)
    })

    test('should display household ID when provided', () => {
      const householdId = 'test-household-123'
      render(<WaitingForPartnerState householdId={householdId} />)

      expect(screen.getByText(householdId)).toBeInTheDocument()
      expect(screen.getByText(/share this household id/i)).toBeInTheDocument()
    })

    test('should not display household ID section when not provided', () => {
      render(<WaitingForPartnerState />)

      expect(
        screen.queryByText(/share this household id/i)
      ).not.toBeInTheDocument()
    })

    test('should have link to start swiping', () => {
      render(<WaitingForPartnerState />)

      const dashboardLink = screen.getByRole('link', {
        name: /start swiping/i,
      })
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    })
  })

  describe('NoMutualLikesState', () => {
    test('should render without stats', () => {
      render(<NoMutualLikesState />)

      expect(
        screen.getByRole('link', { name: /start swiping/i })
      ).toBeInTheDocument()
    })

    test('should show individual likes count when provided', () => {
      render(<NoMutualLikesState stats={{ total_household_likes: 15 }} />)

      expect(screen.getByText(/15 properties/i)).toBeInTheDocument()
    })

    test('should show activity link when there are individual likes', () => {
      render(<NoMutualLikesState stats={{ total_household_likes: 10 }} />)

      expect(
        screen.getByRole('link', { name: /view your journey/i })
      ).toBeInTheDocument()
    })

    test('should not show activity link when no individual likes', () => {
      render(<NoMutualLikesState stats={{ total_household_likes: 0 }} />)

      expect(
        screen.queryByRole('link', { name: /view your journey/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('NetworkErrorState', () => {
    test('should render retry button', () => {
      const mockOnRetry = jest.fn()
      render(<NetworkErrorState onRetry={mockOnRetry} />)

      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument()
    })

    test('should call onRetry when button is clicked', async () => {
      const mockOnRetry = jest.fn()
      const user = userEvent.setup()
      render(<NetworkErrorState onRetry={mockOnRetry} />)

      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)

      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    test('should display connection issue message', () => {
      const mockOnRetry = jest.fn()
      render(<NetworkErrorState onRetry={mockOnRetry} />)

      expect(screen.getByText(/connection issue/i)).toBeInTheDocument()
    })
  })
})
