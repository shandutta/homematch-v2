/**
 * Integration test for clipboard functionality in HouseholdSection component
 * Tests the integration between React component and UI interactions
 * 
 * This test focuses on:
 * - Component rendering with real dependencies
 * - Toast notification system integration
 * - User interaction flow
 * - Component behavior in different states
 * 
 * Note: Actual clipboard API testing is better suited for e2e tests with Playwright
 * since jsdom has limitations with browser APIs that require user interaction
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { HouseholdSection } from '@/components/profile/HouseholdSection'
import { toast } from 'sonner'
import { TEST_USERS, TEST_MESSAGES } from '@/__tests__/fixtures/test-data'

// Mock external services but keep UI interactions real
vi.mock('@/lib/services/users')
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

// Mock toast but track calls
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('HouseholdSection UI Integration', () => {
  const profileWithHousehold = TEST_USERS.withHousehold.profile

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Provide minimal clipboard mock for component functionality
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
      writable: true,
      configurable: true,
    })
  })

  it('integrates toast notifications with copy button interaction', async () => {
    const user = userEvent.setup()
    
    // Render component with real props
    render(<HouseholdSection profile={profileWithHousehold} />)
    
    // Verify household information is displayed
    expect(screen.getByText(TEST_USERS.withHousehold.profile.household.name)).toBeInTheDocument()
    expect(screen.getByText(TEST_USERS.withHousehold.profile.household.id)).toBeInTheDocument()
    
    // Find and click the copy button
    const copyButton = screen.getByTestId('copy-household-code')
    expect(copyButton).toBeInTheDocument()
    
    // Simulate user interaction
    await user.click(copyButton)
    
    // Verify toast notification system integration
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(TEST_MESSAGES.clipboard.success)
    })
    expect(toast.success).toHaveBeenCalledTimes(1)
  })

  it('renders copy button only when household exists', async () => {
    const profileWithoutHousehold = TEST_USERS.withoutHousehold.profile
    
    render(<HouseholdSection profile={profileWithoutHousehold} />)
    
    // Verify no copy button is rendered when no household
    expect(screen.queryByTestId('copy-household-code')).not.toBeInTheDocument()
    
    // Verify create household form is shown instead
    expect(screen.getByText('Create Household')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter household name')).toBeInTheDocument()
  })

  it('integrates household display with copy button UI', async () => {
    render(<HouseholdSection profile={profileWithHousehold} />)
    
    // Verify complete household section renders with all UI elements
    expect(screen.getByText('Current Household')).toBeInTheDocument()
    expect(screen.getByText(TEST_USERS.withHousehold.profile.household.name)).toBeInTheDocument()
    expect(screen.getByText(TEST_USERS.withHousehold.profile.household.id)).toBeInTheDocument()
    expect(screen.getByText(/share this code with family members/i)).toBeInTheDocument()
    
    // Verify copy button is integrated into the UI
    const copyButton = screen.getByTestId('copy-household-code')
    expect(copyButton).toBeInTheDocument()
    expect(copyButton).toBeVisible()
    
    // Verify other household actions are available
    expect(screen.getByRole('button', { name: /leave household/i })).toBeInTheDocument()
  })

  it('integrates copy functionality with toast system', async () => {
    const user = userEvent.setup()
    
    render(<HouseholdSection profile={profileWithHousehold} />)
    
    const copyButton = screen.getByTestId('copy-household-code')
    await user.click(copyButton)
    
    // Focus on toast integration - actual clipboard testing is in e2e
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(TEST_MESSAGES.clipboard.success)
    })
    expect(toast.success).toHaveBeenCalledTimes(1)
  })
})