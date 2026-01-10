/**
 * SignupForm Unit Tests
 *
 * These tests verify the Supabase auth integration flow including:
 * - Email/password signup
 * - OAuth (Google) signup
 * - Error handling and display
 * - Verification email resend functionality
 * - Loading states and button disabling
 *
 * NOTE: Form inputs and Zod validation are mocked. The tests bypass actual
 * user input and form validation to focus on the auth API interaction layer.
 * For end-to-end form validation testing, see the E2E test suite.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupForm } from '@/components/features/auth/SignupForm'
import { createClient } from '@/lib/supabase/client'
import { SignupSchema, type SignupData } from '@/lib/schemas/auth'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import type { ReactNode } from 'react'

type MockField = {
  name: string
  value: string
  onChange: () => void
  onBlur: () => void
  ref: () => void
}

type FormFieldProps = {
  render: (props: { field: MockField }) => ReactNode
  name: string
}

// Mock data factory using Zod validation
const createMockSignupData = (overrides?: Partial<SignupData>): SignupData => {
  const baseData = {
    email: 'newuser@example.com',
    displayName: 'New User',
    password: 'Password123',
    confirmPassword: 'Password123',
    ...overrides,
  }

  // Validate against Zod schema to ensure type safety
  return SignupSchema.parse(baseData)
}

// Test fixtures for different scenarios
const validSignupData = createMockSignupData()
// const invalidSignupData = createMockSignupData({
//   email: 'invalid@example.com',
//   password: 'WrongPassword123',
//   confirmPassword: 'WrongPassword123'
// })

type SubmitHandler = (values: SignupData) => void | Promise<void>
type SubmitEvent = { preventDefault?: () => void }

const createMockForm = (defaultValues?: Partial<SignupData>) => ({
  control: {
    register: jest.fn(),
    unregister: jest.fn(),
    getFieldState: jest.fn(),
    _names: {
      array: new Set(),
      mount: new Set(),
      unMount: new Set(),
      watch: new Set(),
      focus: '',
      watchAll: false,
    },
    _subjects: {
      watch: { next: jest.fn(), subscribe: jest.fn() },
      array: { next: jest.fn(), subscribe: jest.fn() },
      state: { next: jest.fn(), subscribe: jest.fn() },
    },
    _getWatch: jest.fn(),
    _formValues: defaultValues || {},
    _defaultValues: defaultValues || {},
  },
  handleSubmit: (fn: SubmitHandler) => (event?: SubmitEvent) => {
    event?.preventDefault?.()
    return fn(validSignupData)
  },
  formState: {
    isValid: true,
    errors: {},
    isDirty: false,
    isSubmitted: false,
    isSubmitting: false,
    isValidating: false,
    isLoading: false,
    submitCount: 0,
    dirtyFields: {},
    touchedFields: {},
    validatingFields: {},
    defaultValues: defaultValues || {},
  },
  setValue: jest.fn(),
  watch: jest.fn(),
  reset: jest.fn(),
  getValues: jest.fn(() => defaultValues || {}),
  getFieldState: jest.fn(() => ({
    invalid: false,
    isDirty: false,
    isTouched: false,
  })),
  trigger: jest.fn(),
  setError: jest.fn(),
  clearErrors: jest.fn(),
  setFocus: jest.fn(),
})

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock process.env for the component
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock location for the component (if it's not already set)
if (!globalThis.location) {
  Object.defineProperty(globalThis, 'location', {
    value: { origin: 'http://localhost:3000' },
    writable: true,
  })
}

// Mock UI components to avoid complex rendering issues
jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children?: ReactNode }) => (
    <div data-testid="form">{children}</div>
  ),
  FormControl: ({ children }: { children?: ReactNode }) => (
    <div data-testid="form-control">{children}</div>
  ),
  FormField: ({ render, name }: FormFieldProps) => {
    const field: MockField = {
      name,
      value:
        name === 'email'
          ? validSignupData.email
          : name === 'displayName'
            ? validSignupData.displayName
            : name === 'password'
              ? validSignupData.password
              : name === 'confirmPassword'
                ? validSignupData.confirmPassword
                : '',
      onChange: jest.fn(),
      onBlur: jest.fn(),
      ref: jest.fn(),
    }
    return render({ field })
  },
  FormItem: ({ children }: { children?: ReactNode }) => (
    <div data-testid="form-item">{children}</div>
  ),
  FormLabel: ({ children }: { children?: ReactNode }) => {
    const labelText = children?.toString() || ''
    let htmlFor = 'input'
    if (labelText === 'Email') htmlFor = 'email'
    else if (labelText === 'Password') htmlFor = 'password'
    else if (labelText === 'Confirm Password') htmlFor = 'confirmPassword'
    return <label htmlFor={htmlFor}>{children}</label>
  },
  FormMessage: () => <div data-testid="form-message" />,
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children?: ReactNode
    className?: string
  }) => <div className={className}>{children}</div>,
  CardContent: ({
    children,
    className,
  }: {
    children?: ReactNode
    className?: string
  }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({
    children,
    className,
  }: {
    children?: ReactNode
    className?: string
  }) => <h1 className={className}>{children}</h1>,
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({
    children,
    variant,
  }: {
    children?: ReactNode
    variant?: string
  }) => <div data-variant={variant}>{children}</div>,
  AlertDescription: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: JSX.IntrinsicElements['input']) => {
    const id = props.name || props.type || 'input'
    return <input {...props} id={id} />
  },
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant,
    className,
  }: JSX.IntrinsicElements['button'] & { variant?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}))

jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div className={className} data-testid="loader" />
  ),
}))

// Mock the form hook with proper react-hook-form structure
jest.mock('@/hooks/useValidatedForm', () => ({
  useValidatedForm: jest.fn(
    (schema: typeof SignupSchema, defaultValues?: Partial<SignupData>) =>
      createMockForm(defaultValues)
  ),
}))

describe('SignupForm', () => {
  const mockSignUp = jest.fn()
  const mockSignInWithOAuth = jest.fn()
  const mockResend = jest.fn()
  const mockSupabaseClient = {
    auth: {
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      resend: mockResend,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(createClient).mockReturnValue(mockSupabaseClient)

    // Re-create the useValidatedForm mock after clearAllMocks
    jest
      .mocked(useValidatedForm)
      .mockImplementation(
        (schema: typeof SignupSchema, defaultValues?: Partial<SignupData>) =>
          createMockForm(defaultValues)
      )
  })

  test('renders signup form with all elements', () => {
    render(<SignupForm />)

    // Check for title (more specific)
    expect(
      screen.getByRole('heading', { name: /create account/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByText('Or continue with')).toBeInTheDocument()
  })

  test('handles successful signup', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null })
    mockResend.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<SignupForm />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: validSignupData.email,
        password: validSignupData.password,
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/callback'),
          data: { display_name: validSignupData.displayName },
        }),
      })
    })

    // Check success message is displayed
    expect(
      screen.getByText(
        (content) =>
          content.includes(validSignupData.email) &&
          /verification link/i.test(content)
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /resend verification email/i })
    ).toBeInTheDocument()
  })

  test('displays error message on signup failure', async () => {
    const errorMessage = 'User already exists'
    mockSignUp.mockResolvedValueOnce({
      error: { message: errorMessage },
    })

    const user = userEvent.setup()
    render(<SignupForm />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Verify the auth call was made with validated data
      expect(mockSignUp).toHaveBeenCalledWith({
        email: validSignupData.email,
        password: validSignupData.password,
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/callback'),
          data: { display_name: validSignupData.displayName },
        }),
      })
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  test('handles Google OAuth signup', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null })
    mockResend.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<SignupForm />)

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
    const errorMessage = 'OAuth configuration error'
    mockSignInWithOAuth.mockResolvedValueOnce({
      error: { message: errorMessage },
    })
    mockResend.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<SignupForm />)

    const googleButton = screen.getByRole('button', { name: /google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  test('disables form elements while loading', async () => {
    mockSignUp.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    )
    mockResend.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<SignupForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    const googleButton = screen.getByRole('button', { name: /google/i })

    await user.click(submitButton)

    // Check elements are disabled during loading
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(confirmPasswordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
    expect(googleButton).toBeDisabled()

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes(validSignupData.email))
      ).toBeInTheDocument()
    })
  })

  test('shows loading spinner during submission', async () => {
    mockSignUp.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    )
    mockResend.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<SignupForm />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    // Check for spinner
    await waitFor(() => {
      const spinner = submitButton.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  test('success state hides the form', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null })
    mockResend.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<SignupForm />)

    // Initially form elements should be visible
    expect(screen.getByDisplayValue(validSignupData.email)).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Form elements should be gone
      expect(
        screen.queryByDisplayValue(validSignupData.email)
      ).not.toBeInTheDocument()
      expect(
        screen.queryByDisplayValue(validSignupData.password)
      ).not.toBeInTheDocument()
      // Success message should be shown
      expect(
        screen.getByText((content) => content.includes(validSignupData.email))
      ).toBeInTheDocument()
    })
  })

  test('error state keeps form visible', async () => {
    const errorMessage = 'Signup failed'
    mockSignUp.mockResolvedValueOnce({
      error: { message: errorMessage },
    })
    mockResend.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<SignupForm />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Verify the auth call was made with validated data
      expect(mockSignUp).toHaveBeenCalledWith({
        email: validSignupData.email,
        password: validSignupData.password,
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/callback'),
          data: { display_name: validSignupData.displayName },
        }),
      })
      // Form should still be visible
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      // Error message should be shown
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  test('allows resending verification email after signup', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null })
    mockResend.mockResolvedValueOnce({ error: null })
    const user = userEvent.setup()

    render(<SignupForm />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    const resendButton = await screen.findByRole('button', {
      name: /resend verification email/i,
    })
    await user.click(resendButton)

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: validSignupData.email,
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      })
      expect(screen.getByText(/verification email resent/i)).toBeInTheDocument()
    })
  })
})
