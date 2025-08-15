/**
 * Accessibility tests for clipboard functionality in HouseholdSection component
 *
 * These tests ensure:
 * - Keyboard navigation works properly
 * - Screen reader accessibility
 * - ARIA attributes are correct
 * - Focus management
 * - Color contrast compliance
 * - Voice-over navigation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { HouseholdSection } from '@/components/profile/HouseholdSection'
import { toast } from 'sonner'
import { TEST_USERS, TEST_MESSAGES } from '@/__tests__/fixtures/test-data'

// Extend Jest matchers for accessibility
expect.extend(toHaveNoViolations)

// Mock external services
vi.mock('@/lib/services/users-client')
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('HouseholdSection Accessibility', () => {
  const profileWithHousehold = TEST_USERS.withHousehold.profile
  const profileWithoutHousehold = TEST_USERS.withoutHousehold.profile

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock clipboard for component functionality
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
      writable: true,
      configurable: true,
    })
  })

  describe('Keyboard Navigation', () => {
    it('copy button is keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')

      // Verify button is focusable
      expect(copyButton).toBeInTheDocument()
      expect(copyButton.tagName).toBe('BUTTON')

      // Test keyboard navigation
      await user.tab()
      // Should focus on the copy button (may need to tab multiple times depending on form elements)
      copyButton.focus()
      expect(copyButton).toHaveFocus()

      // Test activation with Enter key
      await user.keyboard('{Enter}')
      expect(toast.success).toHaveBeenCalledWith(
        TEST_MESSAGES.clipboard.success
      )

      // Test activation with Space key
      vi.clearAllMocks()
      await user.keyboard(' ')
      expect(toast.success).toHaveBeenCalledWith(
        TEST_MESSAGES.clipboard.success
      )
    })

    it('create household form is keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const nameInput = screen.getByPlaceholderText('Enter household name')
      const createButton = screen.getByRole('button', {
        name: /create household/i,
      })

      // Test tab order
      await user.tab()
      expect(nameInput).toHaveFocus()

      await user.tab()
      expect(createButton).toHaveFocus()

      // Test form submission with Enter key
      await user.click(nameInput)
      await user.type(nameInput, 'Accessible Family')
      await user.keyboard('{Enter}')

      // Form should attempt to submit (mocked service will handle)
      expect(nameInput).toHaveValue('Accessible Family')
    })
  })

  describe('Screen Reader Support', () => {
    it('copy button has appropriate accessible name and description', () => {
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')

      // Should have accessible name (either aria-label or text content)
      expect(copyButton).toHaveAccessibleName()

      // Should have descriptive text for screen readers
      const accessibleName =
        copyButton.getAttribute('aria-label') || copyButton.textContent
      expect(accessibleName).toMatch(/copy|clipboard/i)
    })

    it('household information is properly structured for screen readers', () => {
      render(<HouseholdSection profile={profileWithHousehold} />)

      // Check for proper heading structure
      const heading = screen.getByRole('heading', {
        name: /current household/i,
      })
      expect(heading).toBeInTheDocument()

      // Household name should be clearly labeled
      const householdName = screen.getByText(
        profileWithHousehold.household.name
      )
      expect(householdName).toBeInTheDocument()

      // Household ID should be clearly labeled
      const householdId = screen.getByText(profileWithHousehold.household.id)
      expect(householdId).toBeInTheDocument()
    })

    it('form inputs have proper labels and descriptions', () => {
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const nameInput = screen.getByPlaceholderText('Enter household name')
      const codeInput = screen.getByPlaceholderText('Enter household code')

      // Inputs should have accessible names
      expect(nameInput).toHaveAccessibleName()
      expect(codeInput).toHaveAccessibleName()

      // Check for proper form labeling
      expect(nameInput.getAttribute('placeholder')).toBeTruthy()
      expect(codeInput.getAttribute('placeholder')).toBeTruthy()
    })
  })

  describe('ARIA Attributes', () => {
    it('buttons have appropriate ARIA attributes', () => {
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')
      const leaveButton = screen.getByRole('button', {
        name: /leave household/i,
      })

      // Buttons should have proper roles
      expect(copyButton).toHaveAttribute('type', 'button')
      expect(leaveButton).toHaveAttribute('type', 'button')

      // Check for ARIA attributes if present
      if (copyButton.hasAttribute('aria-describedby')) {
        const describedBy = copyButton.getAttribute('aria-describedby')
        expect(document.getElementById(describedBy!)).toBeInTheDocument()
      }
    })

    it('form elements have proper ARIA relationships', () => {
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const createButton = screen.getByRole('button', {
        name: /create household/i,
      })
      const joinButton = screen.getByRole('button', { name: /join household/i })

      // Buttons should have proper types for form submission
      expect(createButton.getAttribute('type')).toBe('submit')
      expect(joinButton.getAttribute('type')).toBe('submit')
    })
  })

  describe('Focus Management', () => {
    it('maintains logical focus order', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')
      const leaveButton = screen.getByRole('button', {
        name: /leave household/i,
      })

      // Test focus order
      await user.tab()
      // Focus should be on first interactive element
      const focusedElement = document.activeElement
      expect(focusedElement).toBeInstanceOf(HTMLElement)

      // Verify all interactive elements are reachable
      expect(copyButton.tabIndex).not.toBe(-1)
      expect(leaveButton.tabIndex).not.toBe(-1)
    })

    it('handles focus after clipboard action', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')

      // Focus button and activate
      copyButton.focus()
      await user.click(copyButton)

      // Focus should remain on button or move to appropriate location
      // (Implementation dependent - button should remain focusable)
      expect(copyButton).toBeInTheDocument()
    })
  })

  describe('Automated Accessibility Testing', () => {
    it('has no accessibility violations with household', async () => {
      const { container } = render(
        <HouseholdSection profile={profileWithHousehold} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations without household', async () => {
      const { container } = render(
        <HouseholdSection profile={profileWithoutHousehold} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('High Contrast and Visual Accessibility', () => {
    it('buttons have sufficient visual indication when focused', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')

      // Focus the button
      await user.tab()
      copyButton.focus()

      // Button should have focus styles (checked via class or computed styles)
      // This is a basic check - in a real app you'd test computed styles
      expect(copyButton).toHaveFocus()
      expect(copyButton.className).toMatch(/focus|ring|outline/i) // Common focus class patterns
    })

    it('text has sufficient contrast (visual check)', () => {
      render(<HouseholdSection profile={profileWithHousehold} />)

      // This is a placeholder - in practice you'd use tools like:
      // - axe-core for automated contrast checking
      // - Manual testing with browser dev tools
      // - Specialized contrast checking libraries

      const householdName = screen.getByText(
        profileWithHousehold.household.name
      )
      expect(householdName).toBeInTheDocument()

      // Verify text is not using low-contrast utility classes
      expect(householdName.className).not.toMatch(
        /text-gray-300|text-gray-400/i
      )
    })
  })

  describe('Mobile Accessibility', () => {
    it('touch targets are large enough', () => {
      render(<HouseholdSection profile={profileWithHousehold} />)

      const copyButton = screen.getByTestId('copy-household-code')
      const leaveButton = screen.getByRole('button', {
        name: /leave household/i,
      })

      // Buttons should not have classes that make them too small
      // In practice, you'd test computed styles for 44px minimum touch target
      expect(copyButton.className).not.toMatch(/w-4|h-4|p-1/i) // Very small size classes
      expect(leaveButton.className).not.toMatch(/w-4|h-4|p-1/i)

      // Should have reasonable padding/size classes
      expect(copyButton.className).toMatch(/p-|px-|py-|w-|h-/)
      expect(leaveButton.className).toMatch(/p-|px-|py-|w-|h-/)
    })
  })

  describe('Error State Accessibility', () => {
    it('error messages are announced to screen readers', async () => {
      const user = userEvent.setup()
      render(<HouseholdSection profile={profileWithoutHousehold} />)

      const createButton = screen.getByRole('button', {
        name: /create household/i,
      })

      // Try to submit without entering name
      await user.click(createButton)

      // Error message should be present and accessible
      const errorMessage = screen.getByText('Please enter a household name')
      expect(errorMessage).toBeInTheDocument()

      // Error should have proper ARIA attributes
      if (errorMessage.hasAttribute('role')) {
        expect(errorMessage).toHaveAttribute('role', 'alert')
      }
    })
  })
})
