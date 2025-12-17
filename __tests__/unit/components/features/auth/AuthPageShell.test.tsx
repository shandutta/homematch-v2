import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import {
  AuthLink,
  AuthPageShell,
} from '@/components/features/auth/AuthPageShell'

jest.mock('next/link', () => {
  return function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string
    children?: React.ReactNode
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
})

describe('AuthPageShell', () => {
  it('renders title, subtitle, and children', () => {
    render(
      <AuthPageShell title="HomeMatch" subtitle="Sign in to your account">
        <div data-testid="auth-children">Content</div>
      </AuthPageShell>
    )

    expect(
      screen.getByRole('heading', { name: 'HomeMatch' })
    ).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByTestId('auth-children')).toBeInTheDocument()
  })

  it('does not put the title in the tab order as a link', () => {
    render(
      <AuthPageShell title="HomeMatch" subtitle="Sign in to your account">
        <div />
      </AuthPageShell>
    )

    expect(screen.queryByRole('link', { name: 'HomeMatch' })).toBeNull()
  })
})

describe('AuthLink', () => {
  it('renders a link with the provided href', () => {
    render(<AuthLink href="/signup">Sign up</AuthLink>)

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/signup'
    )
  })
})
