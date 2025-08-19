import { render, screen } from '@testing-library/react'
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
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()

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

    // The household section should be in the DOM but hidden (inactive tab)
    const householdSection = screen.getByTestId('household-section')
    expect(householdSection).toBeInTheDocument()
    expect(householdSection).toHaveAttribute('hidden')

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
    expect(householdSection).not.toHaveAttribute('hidden')

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
    expect(screen.getByTestId('household-section')).toHaveAttribute('hidden')
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

    // HouseholdSection receives profile prop
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
      'min-h-screen',
      'text-primary-foreground'
    )

    // Check for header styling - use attribute selector for classes with special characters
    const header = container.querySelector('[class*="bg-primary"]')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('backdrop-blur-md', 'border-b')

    // Check for tab styling - update to match actual rendered classes
    const tabsList = screen.getByRole('tablist')
    expect(tabsList).toHaveClass('border', 'bg-primary/20')
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
