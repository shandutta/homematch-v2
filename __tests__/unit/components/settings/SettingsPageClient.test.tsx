import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'

// Mock next/link
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
  }
})

// Mock child components
jest.mock('@/components/settings/PreferencesSection', () => ({
  PreferencesSection: ({ user, profile }: any) => (
    <div data-testid="preferences-section">
      PreferencesSection - User: {user.email}, Profile: {profile.id}
    </div>
  ),
}))

jest.mock('@/components/settings/NotificationsSection', () => ({
  NotificationsSection: ({ user, profile }: any) => (
    <div data-testid="notifications-section">
      NotificationsSection - User: {user.email}, Profile: {profile.id}
    </div>
  ),
}))

jest.mock('@/components/settings/SavedSearchesSection', () => ({
  SavedSearchesSection: ({ userId }: any) => (
    <div data-testid="saved-searches-section">
      SavedSearchesSection - UserId: {userId}
    </div>
  ),
}))

jest.mock('@/components/settings/AccountSection', () => ({
  AccountSection: ({ user }: any) => (
    <div data-testid="account-section">AccountSection - User: {user.email}</div>
  ),
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
} as any

const mockProfile = {
  id: 'profile-123',
  user_id: 'user-123',
  preferences: {},
} as any

describe('SettingsPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all navigation elements', () => {
    render(<SettingsPageClient user={mockUser} profile={mockProfile} />)

    // Header elements
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
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

    const dashboardLink = screen.getByRole('link', {
      name: /back to dashboard/i,
    })
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')

    const profileLink = screen.getByRole('link', { name: /view profile/i })
    expect(profileLink).toHaveAttribute('href', '/profile')
  })

  it('applies correct styling classes', () => {
    const { container } = render(
      <SettingsPageClient user={mockUser} profile={mockProfile} />
    )

    // Check for main container classes
    expect(container.firstChild).toHaveClass('min-h-screen', 'text-white')

    // Check for header styling
    const header = container.querySelector('.bg-purple-900\\/10')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass(
      'backdrop-blur-md',
      'border-b',
      'border-purple-500/20'
    )

    // Check for tab styling
    const tabsList = screen.getByRole('tablist')
    expect(tabsList).toHaveClass(
      'bg-purple-900/20',
      'border',
      'border-purple-500/20'
    )
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
