import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePageClient } from '@/components/profile/ProfilePageClient'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
  }
})

// Mock child components
jest.mock('@/components/profile/ProfileForm', () => ({
  ProfileForm: ({ user, profile }: any) => (
    <div data-testid="profile-form">
      ProfileForm - User: {user.email}, Profile: {profile.id}
    </div>
  ),
}))

jest.mock('@/components/profile/HouseholdSection', () => ({
  HouseholdSection: ({ profile }: any) => (
    <div data-testid="household-component">
      HouseholdSection - Profile: {profile.id}
    </div>
  ),
}))

jest.mock('@/components/profile/ActivityStats', () => ({
  ActivityStats: ({ summary }: any) => (
    <div data-testid="activity-stats">
      ActivityStats - Likes: {summary.likes}, Views: {summary.views}
    </div>
  ),
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
} as any

const mockProfile = {
  id: 'profile-123',
  user_id: 'user-123',
  household: {
    id: 'household-456',
    name: 'Test Household',
  },
} as any

const mockActivitySummary = {
  likes: 25,
  dislikes: 10,
  views: 50,
  saved_searches: 3,
  total_interactions: 88,
}

describe('ProfilePageClient', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('renders all navigation elements', () => {
    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    // Header elements
    expect(screen.getByText('My Profile')).toBeInTheDocument()
    expect(screen.getByText(/Back to dashboard/i)).toBeInTheDocument()

    // Tab navigation
    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /household/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /activity/i })).toBeInTheDocument()
  })

  it('displays the profile tab by default', () => {
    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute(
      'data-state',
      'active'
    )
    expect(screen.getByTestId('profile-form')).toBeInTheDocument()

    expect(screen.queryByTestId('household-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('activity-stats')).not.toBeInTheDocument()
  })

  it('navigates to household tab when clicked', async () => {
    const user = userEvent.setup()
    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    const householdTab = screen.getByRole('tab', { name: /household/i })
    await user.click(householdTab)

    expect(householdTab).toHaveAttribute('data-state', 'active')

    // The household section should now be visible
    const householdSection = screen.getByTestId('household-section')
    expect(householdSection).toBeInTheDocument()

    // Profile form should be hidden
    expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('activity-stats')).not.toBeInTheDocument()
  })

  it('navigates to activity tab when clicked', async () => {
    const user = userEvent.setup()
    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    const activityTab = screen.getByRole('tab', { name: /activity/i })
    await user.click(activityTab)

    expect(activityTab).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('activity-stats')).toBeInTheDocument()
    expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('household-section')).not.toBeInTheDocument()
  })

  it('passes correct props to child components', async () => {
    const user = userEvent.setup()
    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    // ProfileForm receives user and profile props
    expect(screen.getByText(/User: test@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/Profile: profile-123/)).toBeInTheDocument()

    // Navigate to household tab
    const householdTab = screen.getByRole('tab', { name: /household/i })
    await user.click(householdTab)

    expect(await screen.findByTestId('household-component')).toBeInTheDocument()
    expect(await screen.findByText(/Profile: profile-123/)).toBeInTheDocument()

    // Navigate to activity tab
    const activityTab = screen.getByRole('tab', { name: /activity/i })
    await user.click(activityTab)

    // ActivityStats receives summary prop
    expect(await screen.findByText(/Likes: 25/)).toBeInTheDocument()
    expect(await screen.findByText(/Views: 50/)).toBeInTheDocument()
  })

  it('has correct navigation links', () => {
    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    const dashboardLink = screen.getByRole('link', {
      name: /back to dashboard/i,
    })
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')

    const settingsLink = screen.getByRole('link', { name: /settings/i })
    expect(settingsLink).toHaveAttribute('href', '/settings')
  })

  it('applies correct styling classes', () => {
    const { container } = render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    // Check for main container classes
    expect(container.firstChild).toHaveClass(
      'gradient-grid-bg',
      'min-h-screen',
      'pb-16',
      'text-white'
    )

    const header = screen
      .getByRole('link', { name: /back to dashboard/i })
      .closest('section')
    expect(header).not.toBeNull()
    expect(header as HTMLElement).toHaveClass('border-b', 'border-white/5')

    const tabsList = screen.getByRole('tablist')
    expect(tabsList).toHaveClass(
      'border',
      'border-white/[0.06]',
      'bg-white/[0.02]'
    )
  })

  it('keeps a single tabpanel mounted and avoids AnimatePresence wait warnings', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const user = userEvent.setup()

    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /household/i }))
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /activity/i }))
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    const warnedAboutAnimatePresence = warnSpy.mock.calls.some((call) =>
      call.join(' ').includes('AnimatePresence')
    )
    expect(warnedAboutAnimatePresence).toBe(false)
    warnSpy.mockRestore()
  })

  it('copies the household code and shows transient feedback', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    ;(navigator as any).clipboard = { writeText }
    jest.useFakeTimers()

    render(
      <ProfilePageClient
        user={mockUser}
        profile={mockProfile}
        activitySummary={mockActivitySummary}
      />
    )

    const joinCodeSection = screen
      .getByText(/join code/i)
      .closest('div') as HTMLElement
    const copyButton = within(joinCodeSection).getAllByRole('button')[0]

    await user.click(copyButton)

    expect(writeText).toHaveBeenCalledWith(mockProfile.household.id)
    await waitFor(() =>
      expect(
        copyButton.querySelector('[data-lucide="check"]')
      ).toBeInTheDocument()
    )

    act(() => {
      jest.advanceTimersByTime(2100)
    })

    await waitFor(() =>
      expect(
        copyButton.querySelector('[data-lucide="copy"]')
      ).toBeInTheDocument()
    )

    jest.useRealTimers()
  })

  it('handles profile without household', () => {
    const profileWithoutHousehold = {
      ...mockProfile,
      household: null,
    }

    render(
      <ProfilePageClient
        user={mockUser}
        profile={profileWithoutHousehold}
        activitySummary={mockActivitySummary}
      />
    )

    // Should still render without errors
    expect(screen.getByText('My Profile')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /household/i })).toBeInTheDocument()
  })
})
