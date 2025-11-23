import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerifyEmailForm } from '@/components/features/auth/VerifyEmailForm'

const verifyOtp = jest.fn()
const getSession = jest.fn()

const supabaseMock = {
  auth: {
    verifyOtp,
    getSession,
  },
}

const replace = jest.fn()
const refresh = jest.fn()

let prefillEmail: string | null = 'newuser@example.com'
let nextParam: string | null = null

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => supabaseMock,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'email') return prefillEmail
      if (key === 'next') return nextParam
      return null
    },
  }),
}))

describe('VerifyEmailForm', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_TEST_MODE = 'true'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    prefillEmail = 'newuser@example.com'
    nextParam = null
    verifyOtp.mockResolvedValue({
      data: { session: { access_token: 't1' } },
      error: null,
    })
    getSession.mockResolvedValue({
      data: { session: { access_token: 't2' } },
      error: null,
    })
  })

  test('prefills email from search params and shows fields', () => {
    render(<VerifyEmailForm />)

    expect(screen.getByTestId('verify-email-input')).toHaveValue(
      'newuser@example.com'
    )
    expect(screen.getByTestId('verify-code-input')).toBeInTheDocument()
  })

  test('verifies code and redirects when session is returned', async () => {
    const user = userEvent.setup()
    prefillEmail = null

    render(<VerifyEmailForm />)

    await user.type(
      screen.getByTestId('verify-email-input'),
      'person@example.com'
    )
    await user.type(screen.getByTestId('verify-code-input'), '123456')
    await user.click(screen.getByTestId('verify-submit'))

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith({
        email: 'person@example.com',
        token: '123456',
        type: 'signup',
      })
    })
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/dashboard')
      expect(refresh).toHaveBeenCalled()
    })
  })

  test('falls back to fetching session when verify response has no session', async () => {
    verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })
    const user = userEvent.setup()
    nextParam = 'welcome'

    render(<VerifyEmailForm />)

    await user.type(screen.getByTestId('verify-code-input'), '654321')
    await user.click(screen.getByTestId('verify-submit'))

    await waitFor(() => {
      expect(getSession).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/welcome')
    })
  })

  test('shows error when verification fails', async () => {
    verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid code' },
    })
    const user = userEvent.setup()

    render(<VerifyEmailForm />)

    await user.type(screen.getByTestId('verify-code-input'), '000000')
    await user.click(screen.getByTestId('verify-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('verify-error')).toHaveTextContent(
        'Invalid code'
      )
    })
    expect(replace).not.toHaveBeenCalled()
  })
})
