import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { UserServiceClient } from '@/lib/services/users-client'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database'

// Mock dependencies
jest.mock('@/lib/services/users-client')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('NotificationsSection', () => {
  const mockUpdateUserProfile = jest.fn()
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01',
  } as User

  const mockProfile: UserProfile = {
    id: 'user-123',
    household_id: 'household-123',
    onboarding_completed: true,
    preferences: {
      notifications: {
        email: {
          newMatches: true,
          priceDrops: true,
          savedSearches: true,
          weeklyDigest: false,
        },
        push: {
          newMatches: false,
          priceDrops: false,
          messages: true,
        },
        sms: {
          urgentAlerts: false,
          viewingReminders: false,
        },
      },
    },
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(UserServiceClient.updateUserProfile as jest.Mock) = mockUpdateUserProfile
  })

  test('renders all notification sections', () => {
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    expect(screen.getByText('Push Notifications')).toBeInTheDocument()
    expect(screen.getByText('SMS Notifications')).toBeInTheDocument()
  })

  test('displays user email', () => {
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    expect(screen.getByText(/Sent to test@example.com/i)).toBeInTheDocument()
  })

  test('renders all email notification options', () => {
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    // Get the email section card to avoid conflicts with push notifications
    const emailSection = screen
      .getByText('Email Notifications')
      .closest('.card-glassmorphism-style')

    expect(emailSection).toHaveTextContent('New property matches')
    expect(emailSection).toHaveTextContent('Price drops')
    expect(emailSection).toHaveTextContent('Saved search updates')
    expect(emailSection).toHaveTextContent('Weekly digest')
  })

  test('renders all push notification options', () => {
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    const pushSection = screen
      .getByText('Push Notifications')
      .closest('.card-glassmorphism-style')
    expect(pushSection).toHaveTextContent('New matches')
    expect(pushSection).toHaveTextContent('Price drops')
    expect(pushSection).toHaveTextContent('Household messages')
  })

  test('renders all SMS notification options', () => {
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    expect(screen.getByLabelText('Urgent alerts')).toBeInTheDocument()
    expect(screen.getByLabelText('Viewing reminders')).toBeInTheDocument()
  })

  test('toggles email notifications', async () => {
    const user = userEvent.setup()
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    const weeklyDigestSwitch = screen.getByLabelText('Weekly digest')
    expect(weeklyDigestSwitch).not.toBeChecked()

    await user.click(weeklyDigestSwitch)
    expect(weeklyDigestSwitch).toBeChecked()
  })

  test('toggles push notifications', async () => {
    const user = userEvent.setup()
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    const newMatchesSwitch = screen.getByLabelText('New matches')
    expect(newMatchesSwitch).not.toBeChecked()

    await user.click(newMatchesSwitch)
    expect(newMatchesSwitch).toBeChecked()
  })

  test('toggles SMS notifications', async () => {
    const user = userEvent.setup()
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    const urgentAlertsSwitch = screen.getByLabelText('Urgent alerts')
    expect(urgentAlertsSwitch).not.toBeChecked()

    await user.click(urgentAlertsSwitch)
    expect(urgentAlertsSwitch).toBeChecked()
  })

  test('shows SMS note when SMS notifications are enabled', async () => {
    const user = userEvent.setup()
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    // Initially no note
    expect(
      screen.queryByText(/Add a phone number in your profile/i)
    ).not.toBeInTheDocument()

    // Enable SMS notification
    const urgentAlertsSwitch = screen.getByLabelText('Urgent alerts')
    await user.click(urgentAlertsSwitch)

    // Note should appear
    expect(
      screen.getByText(
        /Add a phone number in your profile to receive SMS alerts/i
      )
    ).toBeInTheDocument()
  })

  test('saves preferences successfully', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce({ success: true })
    const user = userEvent.setup()

    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    // Toggle a switch
    const weeklyDigestSwitch = screen.getByLabelText('Weekly digest')
    await user.click(weeklyDigestSwitch)

    // Click save
    const saveButton = screen.getByRole('button', {
      name: /Save Notification Preferences/i,
    })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-123', {
        preferences: expect.objectContaining({
          notifications: expect.objectContaining({
            email: expect.objectContaining({
              weeklyDigest: true,
            }),
          }),
        }),
      })
      expect(toast.success).toHaveBeenCalledWith(
        'Notification preferences saved'
      )
    })
  })

  test('handles save error', async () => {
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('Update failed'))
    const user = userEvent.setup()

    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    const saveButton = screen.getByRole('button', {
      name: /Save Notification Preferences/i,
    })
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to save notification preferences'
      )
    })
  })

  test('shows loading state during save', async () => {
    mockUpdateUserProfile.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )
    const user = userEvent.setup()

    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    const saveButton = screen.getByRole('button', {
      name: /Save Notification Preferences/i,
    })
    await user.click(saveButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()

    await waitFor(() => {
      expect(
        screen.getByText(/Save Notification Preferences/i)
      ).toBeInTheDocument()
    })
  })

  test('renders with empty preferences', () => {
    const profileWithoutPrefs: UserProfile = {
      ...mockProfile,
      preferences: null,
    }

    render(
      <NotificationsSection user={mockUser} profile={profileWithoutPrefs} />
    )

    // Should render with default values
    // Check that email section exists and has the expected options
    const emailSection = screen
      .getByText('Email Notifications')
      .closest('.card-glassmorphism-style')
    expect(emailSection).toHaveTextContent('New property matches')
    expect(emailSection).toHaveTextContent('Weekly digest')

    // Check that all sections are rendered
    expect(screen.getByText('Push Notifications')).toBeInTheDocument()
    expect(screen.getByText('SMS Notifications')).toBeInTheDocument()
  })

  test('renders icons for each section', () => {
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    // Check for section icons
    const emailSection = screen.getByText('Email Notifications').parentElement
    const pushSection = screen.getByText('Push Notifications').parentElement
    const smsSection = screen.getByText('SMS Notifications').parentElement

    expect(emailSection?.querySelector('svg')).toBeInTheDocument()
    expect(pushSection?.querySelector('svg')).toBeInTheDocument()
    expect(smsSection?.querySelector('svg')).toBeInTheDocument()
  })

  test('maintains notification state across all categories', async () => {
    const user = userEvent.setup()
    render(<NotificationsSection user={mockUser} profile={mockProfile} />)

    // Toggle switches in different categories
    const emailSwitch = screen.getByLabelText('Weekly digest')
    const pushSwitch = screen.getByLabelText('New matches')
    const smsSwitch = screen.getByLabelText('Urgent alerts')

    await user.click(emailSwitch)
    await user.click(pushSwitch)
    await user.click(smsSwitch)

    // All should remain toggled
    expect(emailSwitch).toBeChecked()
    expect(pushSwitch).toBeChecked()
    expect(smsSwitch).toBeChecked()
  })
})
