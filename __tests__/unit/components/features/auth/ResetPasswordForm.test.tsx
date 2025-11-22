import {
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'

const resetPasswordForEmail = jest.fn()
const exchangeCodeForSession = jest.fn()
const verifyOtp = jest.fn()
const updateUser = jest.fn()
const getSession = jest.fn()
const setSession = jest.fn()

const supabaseMock = {
  auth: {
    resetPasswordForEmail,
    exchangeCodeForSession,
    verifyOtp,
    updateUser,
    getSession,
    setSession,
  },
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => supabaseMock,
}))

const push = jest.fn()
const searchParamsGet = jest.fn().mockReturnValue(null)

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({
    get: searchParamsGet,
  }),
}))

describe('ResetPasswordForm', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_TEST_MODE = 'true'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    resetPasswordForEmail.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue({ error: null })
    updateUser.mockResolvedValue({ error: null })
    getSession.mockResolvedValue({
      data: { session: { id: 's1' } },
      error: null,
    })
    setSession.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    push.mockClear()
  })

  test('sends reset link and shows success message', async () => {
    render(<ResetPasswordForm />)

    await userEvent.type(
      screen.getByTestId('reset-email-input'),
      'user@example.com'
    )
    await userEvent.click(screen.getByTestId('reset-submit'))

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
        redirectTo: expect.stringContaining('/reset-password'),
      })
      expect(screen.getByTestId('reset-success')).toHaveTextContent(
        'Check your email for a reset link.'
      )
    })
  })

  test('shows error when reset link fails', async () => {
    resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'Network issue' },
    })

    render(<ResetPasswordForm />)

    await userEvent.type(
      screen.getByTestId('reset-email-input'),
      'user@example.com'
    )
    await userEvent.click(screen.getByTestId('reset-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('reset-error')).toHaveTextContent(
        'Network issue'
      )
    })
  })

  test('manual code entry verifies and updates password', async () => {
    render(<ResetPasswordForm />)

    // Switch to manual code entry
    await userEvent.click(screen.getByTestId('reset-enter-code'))
    expect(screen.getByTestId('reset-verify-email')).toBeInTheDocument()

    await userEvent.type(
      screen.getByTestId('reset-verify-email'),
      'user@example.com'
    )
    await userEvent.type(screen.getByTestId('reset-verify-code'), '123456')
    await userEvent.click(screen.getByTestId('reset-verify-submit'))

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        token: '123456',
        type: 'recovery',
      })
      expect(screen.getByTestId('reset-password-input')).toBeInTheDocument()
    })

    await userEvent.type(
      screen.getByTestId('reset-password-input'),
      'new-strong-password'
    )
    await userEvent.click(screen.getByTestId('reset-password-submit'))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({
        password: 'new-strong-password',
      })
      expect(push).toHaveBeenCalledWith('/login')
    })
  })
})
