/**
 * Integration test for login flow with minimal mocking
 * Tests real component behavior with actual form validation
 * Only mocks external services (Supabase, router) not internal logic
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { LoginForm } from '@/components/features/auth/LoginForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { setupTestIsolation } from '../../utils/test-isolation'

// Mock external dependencies
vi.mock('@/lib/supabase/client')
vi.mock('next/navigation')

describe('Login Flow Integration', () => {
  const mockPush = vi.fn()
  const mockSignInWithPassword = vi.fn()
  const mockSignInWithOAuth = vi.fn()

  const mockUseRouter = vi.mocked(useRouter)
  const mockCreateClient = vi.mocked(createClient)

  // Use test isolation utilities
  setupTestIsolation()

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Reset mock implementations with default behavior
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    })

    // Setup router mock with custom push handler
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    })

    // Setup Supabase client with custom auth handlers
    mockCreateClient.mockReturnValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signInWithOAuth: mockSignInWithOAuth,
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: null })
        ),
        getSession: vi.fn(() =>
          Promise.resolve({ data: { session: null }, error: null })
        ),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((onFulfilled) => onFulfilled({ data: [], error: null })),
      })),
    })
  })

  describe('Successful Authentication Flow', () => {
    it('completes email/password login successfully', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null })

      const user = userEvent.setup()
      render(<LoginForm />)

      // Test actual form interaction without mocking form behavior
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('signin-button')

      // Fill form with valid data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')

      // Verify form accepts input
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('validpassword123')

      // Submit and verify flow
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'validpassword123',
        })
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('completes OAuth login flow', async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null })

      const user = userEvent.setup()
      render(<LoginForm />)

      const googleButton = screen.getByTestId('google-signin-button')
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: expect.stringContaining('/auth/callback'),
          },
        })
      })
    })
  })

  describe('Error Handling Flow', () => {
    it('handles authentication errors appropriately', async () => {
      const errorMessage = 'Invalid login credentials'
      mockSignInWithPassword.mockResolvedValue({
        error: { message: errorMessage },
      })

      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('signin-button')

      // Fill form with credentials that will fail
      await user.type(emailInput, 'invalid@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // Verify error is displayed to user
      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      // Verify user can retry after error
      expect(submitButton).not.toBeDisabled()
      expect(emailInput).not.toBeDisabled()
      expect(passwordInput).not.toBeDisabled()
    })

    it('handles network errors gracefully', async () => {
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'))

      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('signin-button')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should handle rejection gracefully and re-enable form
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Form Validation Flow', () => {
    it('validates email format correctly', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('signin-button')

      // Test invalid email format
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'validpassword')
      await user.click(submitButton)

      // Should not attempt to sign in with invalid email
      expect(mockSignInWithPassword).not.toHaveBeenCalled()

      // Test valid email
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      await user.click(submitButton)

      // Now should attempt sign in
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalled()
      })
    })

    it('requires both email and password', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const submitButton = screen.getByTestId('signin-button')

      // Try to submit empty form
      await user.click(submitButton)

      // Should not call API with empty fields
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })
  })

  describe('Loading State Flow', () => {
    it('handles loading state correctly during authentication', async () => {
      // Mock delayed response
      mockSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ error: null }), 100)
          )
      )

      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('signin-button')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Submit form
      await user.click(submitButton)

      // Should be disabled during loading
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
        expect(emailInput).toBeDisabled()
        expect(passwordInput).toBeDisabled()
      })

      // Should re-enable after completion
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 500 }
      )
    })
  })

  describe('Accessibility Flow', () => {
    it('provides proper accessibility attributes', () => {
      render(<LoginForm />)

      const form = screen.getByTestId('login-form')
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('signin-button')

      // Check form structure
      expect(form).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(submitButton).toHaveAttribute('type', 'submit')

      // Check labels are properly associated
      expect(screen.getByLabelText('Email')).toBe(emailInput)
      expect(screen.getByLabelText('Password')).toBe(passwordInput)
    })
  })
})
