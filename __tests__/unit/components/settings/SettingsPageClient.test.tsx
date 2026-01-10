import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database'

// Mock next/link
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({
      children,
      href,
    }: {
      children?: React.ReactNode
      href: string
    }) => <a href={href}>{children}</a>,
  }
})

// Mock child components
jest.mock('@/components/settings/PreferencesSection', () => ({
  PreferencesSection: ({
    user,
    profile,
  }: {
    user: User
    profile: UserProfile
  }) => (
    <div data-testid="preferences-section">
      PreferencesSection - User: {user.email}, Profile: {profile.id}
    </div>
  ),
}))

jest.mock('@/components/settings/NotificationsSection', () => ({
  NotificationsSection: ({
    user,
    profile,
  }: {
    user: User
    profile: UserProfile
  }) => (
    <div data-testid="notifications-section">
      NotificationsSection - User: {user.email}, Profile: {profile.id}
    </div>
  ),
}))

jest.mock('@/components/settings/SavedSearchesSection', () => ({
  SavedSearchesSection: ({ userId }: { userId: string }) => (
    <div data-testid="saved-searches-section">
      SavedSearchesSection - UserId: {userId}
    </div>
  ),
}))

jest.mock('@/components/settings/AccountSection', () => ({
  AccountSection: ({ user }: { user: User }) => (
    <div data-testid="account-section">AccountSection - User: {user.email}</div>
  ),
}))

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2024-01-01T00:00:00.000Z',
}

const mockProfile: UserProfile = {
  id: 'profile-123',
  display_name: null,
  email: 'test@example.com',
  household_id: null,
  onboarding_completed: true,
  preferences: {},
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: null,
}

describe('SettingsPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all navigation elements', () => {
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    // Header elements
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getAllByText('Back to Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('View Profile')).toBeInTheDocument()

    // Tab navigation
    expect(
      screen.getByRole('tab', { name: /preferences/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /notifications/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /saved searches/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /account/i })).toBeInTheDocument()
  })

  it('displays the preferences tab by default', () => {
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    expect(screen.getByRole('tab', { name: /preferences/i })).toHaveAttribute(
      'data-state',
      'active'
    )
    expect(screen.getByTestId('preferences-section')).toBeInTheDocument()
    expect(
      screen.queryByTestId('notifications-section')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('saved-searches-section')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('account-section')).not.toBeInTheDocument()
  })

  it('honors an initial tab when provided', () => {
    render(
      <SettingsPageClient
        user={mockUser}
        profile={mockProfile}
        initialTab="saved-searches"
      />
    )

    expect(
      screen.getByRole('tab', { name: /saved searches/i })
    ).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('saved-searches-section')).toBeInTheDocument()
  })

  it('navigates to notifications tab when clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    const notificationsTab = screen.getByRole('tab', { name: /notifications/i })
    await user.click(notificationsTab)

    expect(notificationsTab).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('notifications-section')).toBeInTheDocument()
    expect(screen.queryByTestId('preferences-section')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('saved-searches-section')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('account-section')).not.toBeInTheDocument()
  })

  it('navigates to saved searches tab when clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    const savedSearchesTab = screen.getByRole('tab', {
      name: /saved searches/i,
    })
    await user.click(savedSearchesTab)

    expect(savedSearchesTab).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('saved-searches-section')).toBeInTheDocument()
    expect(screen.queryByTestId('preferences-section')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('notifications-section')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('account-section')).not.toBeInTheDocument()
  })

  it('navigates to account tab when clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    const accountTab = screen.getByRole('tab', { name: /account/i })
    await user.click(accountTab)

    expect(accountTab).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('account-section')).toBeInTheDocument()
    expect(screen.queryByTestId('preferences-section')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('notifications-section')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('saved-searches-section')
    ).not.toBeInTheDocument()
  })

  it('passes correct props to child components', async () => {
    const user = userEvent.setup()
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    // PreferencesSection receives user and profile props
    expect(screen.getByText(/User: test@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/Profile: profile-123/)).toBeInTheDocument()

    // Navigate to notifications tab
    await user.click(screen.getByRole('tab', { name: /notifications/i }))
    expect(
      await screen.findByTestId('notifications-section')
    ).toHaveTextContent('User: test@example.com')
    expect(
      await screen.findByTestId('notifications-section')
    ).toHaveTextContent('Profile: profile-123')

    // Navigate to saved searches tab
    await user.click(screen.getByRole('tab', { name: /saved searches/i }))
    expect(
      await screen.findByTestId('saved-searches-section')
    ).toHaveTextContent('UserId: user-123')

    // Navigate to account tab
    await user.click(screen.getByRole('tab', { name: /account/i }))
    expect(await screen.findByTestId('account-section')).toHaveTextContent(
      'User: test@example.com'
    )
  })

  it('has correct navigation links', () => {
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    const dashboardLinks = screen.getAllByRole('link', {
      name: /back to dashboard/i,
    })
    expect(
      dashboardLinks.some((link) => link.getAttribute('href') === '/dashboard')
    ).toBe(true)

    const profileLink = screen.getByRole('link', { name: /view profile/i })
    expect(profileLink).toHaveAttribute('href', '/profile')
  })

  it('opens notifications tab from overview card', async () => {
    const user = userEvent.setup()
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    const alertCard = screen.getByRole('button', {
      name: /open alerts enabled settings/i,
    })
    await user.click(alertCard)

    expect(screen.getByRole('tab', { name: /notifications/i })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('applies correct styling classes', () => {
    const { container } = render(
      <SettingsPageClient user={mockUser} profile={mockProfile} />
    )

    // Check for main container classes
    expect(container.firstChild).toHaveClass(
      'gradient-grid-bg',
      'min-h-screen',
      'pb-6',
      'text-white'
    )

    // Check for header styling using testid
    const header = screen.getByTestId('settings-header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('border-b', 'border-white/5')

    // Check for tab styling - update to match actual rendered classes
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

    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /notifications/i }))
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /saved searches/i }))
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /account/i }))
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    const warnedAboutAnimatePresence = warnSpy.mock.calls.some((call) =>
      call.join(' ').includes('AnimatePresence')
    )
    expect(warnedAboutAnimatePresence).toBe(false)
    warnSpy.mockRestore()
  })

  it('switches between all tabs correctly', async () => {
    const user = userEvent.setup()
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    const tabs = [
      { name: /preferences/i, testId: 'preferences-section' },
      { name: /notifications/i, testId: 'notifications-section' },
      { name: /saved searches/i, testId: 'saved-searches-section' },
      { name: /account/i, testId: 'account-section' },
    ]

    for (const tab of tabs) {
      await user.click(screen.getByRole('tab', { name: tab.name }))
      expect(screen.getByTestId(tab.testId)).toBeInTheDocument()

      // Ensure other sections are not visible
      tabs
        .filter((t) => t.testId !== tab.testId)
        .forEach((otherTab) => {
          expect(screen.queryByTestId(otherTab.testId)).not.toBeInTheDocument()
        })
    }
  })
})
