import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/features/auth/LoginForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LoginSchema, type LoginData } from '@/lib/schemas/auth'
// import { z } from 'zod'
// Type-safe expectation helper  
// const expectToBeCalledWithValidData = (
//   mockFn: jest.Mock,
//   schema: any,
//   expectedData?: any
// ) => {
//   expect(mockFn).toHaveBeenCalled()
//   const callArgs = mockFn.mock.calls[0][0]
//   
//   // Validate the call arguments against the schema
//   const result = schema.safeParse(callArgs)
//   if (!result.success) {
//     throw new Error(`Mock called with invalid data: ${result.error.message}`)
//   }
//   
//   if (expectedData) {
//     expect(callArgs).toMatchObject(expectedData)
//   }
//   
//   return callArgs
// }

// Mock data factory using Zod validation
const createMockLoginData = (overrides?: Partial<LoginData>): LoginData => {
  const baseData = {
    email: 'test@example.com',
    password: 'password123',
    ...overrides
  }
  
  // Validate against Zod schema to ensure type safety
  return LoginSchema.parse(baseData)
}

// Test fixtures for different scenarios
const validCredentials = createMockLoginData()
const invalidCredentials = createMockLoginData({
  email: 'invalid@example.com',
  password: 'wrongpassword'
})

// Since we have global mocks in setupSupabaseMock.ts, we don't need to re-mock them here

describe('LoginForm', () => {
  const mockPush = jest.fn()
  const mockSignInWithPassword = jest.fn()
  const mockSignInWithOAuth = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the router
    const mockRouter = {
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Mock the Supabase client
    const mockSupabaseClient = {
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signInWithOAuth: mockSignInWithOAuth,
        getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
        getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn(async (onFulfilled: any) => onFulfilled({ data: [], error: null })),
      }))
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  test('renders login form with all elements', () => {
    render(<LoginForm />)

    // Check for form elements
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByText('Or continue with')).toBeInTheDocument()
  })

  test('handles successful email/password login', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })
    const user = userEvent.setup()
    
    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Fill in form with validated fixture data
    await user.type(emailInput, validCredentials.email)
    await user.type(passwordInput, validCredentials.password)
    
    // Submit form
    await user.click(submitButton)

    await waitFor(() => {
      // Verify the auth call was made with the correct data
      expect(mockSignInWithPassword).toHaveBeenCalledWith(validCredentials)
      expect(mockPush).toHaveBeenCalledWith('/validation')
    })
  })

  test('displays error message on login failure', async () => {
    const errorMessage = 'Invalid credentials'
    
    mockSignInWithPassword.mockResolvedValueOnce({ 
      error: { message: errorMessage } 
    })
    
    const user = userEvent.setup()
    render(<LoginForm />)

    // Fill in form with validated but failing credentials
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    
    await user.type(emailInput, invalidCredentials.email)
    await user.type(passwordInput, invalidCredentials.password)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Verify the auth call was made with the correct data
      expect(mockSignInWithPassword).toHaveBeenCalledWith(invalidCredentials)
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  test('handles Google OAuth login', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null })
    const user = userEvent.setup()
    
    render(<LoginForm />)

    const googleButton = screen.getByRole('button', { name: /google/i })
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

  test('displays error on Google OAuth failure', async () => {
    const errorMessage = 'OAuth error'
    mockSignInWithOAuth.mockResolvedValueOnce({ 
      error: { message: errorMessage } 
    })
    
    const user = userEvent.setup()
    render(<LoginForm />)

    const googleButton = screen.getByRole('button', { name: /google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  test('disables form elements while loading', async () => {
    // Mock a delayed response
    mockSignInWithPassword.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 200))
    )
    
    const user = userEvent.setup()
    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    
    // Fill in valid data first
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    const googleButton = screen.getByRole('button', { name: /google/i })

    // Trigger login
    await user.click(submitButton)

    // Check elements are disabled during loading (with small delay for state update)
    await waitFor(() => {
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(googleButton).toBeDisabled()
    })

    // Wait for loading to complete
    await waitFor(() => {
      expect(emailInput).not.toBeDisabled()
    }, { timeout: 3000 })
  })

  test('shows loading spinner during submission', async () => {
    mockSignInWithPassword.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 200))
    )
    
    const user = userEvent.setup()
    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    
    // Fill in valid data first
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Initially no spinner
    expect(submitButton.querySelector('.animate-spin')).not.toBeInTheDocument()

    // Trigger login
    await user.click(submitButton)

    // Check for spinner (Loader2 component)
    await waitFor(() => {
      const spinner = submitButton.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
    
    // Wait for completion
    await waitFor(() => {
      expect(submitButton.querySelector('.animate-spin')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('form submission is prevented when empty', async () => {
    // const user = userEvent.setup()
    render(<LoginForm />)

    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')
    
    // Try to submit empty form
    fireEvent.submit(form!)

    // Should not call sign in with empty values
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })
})