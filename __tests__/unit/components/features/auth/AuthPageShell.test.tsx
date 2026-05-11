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

  // A3: the decorative blur layer below uses w-[680px] centered with
  // -translate-x-1/2, which overflows a 375px mobile viewport by ~150px on
  // each side. Without overflow-hidden on the outer container, the page
  // scrolls horizontally on mobile. Asserting the class here keeps the
  // safeguard from regressing.
  it('clips decorative overflow on the outer container', () => {
    const { container } = render(
      <AuthPageShell title="HomeMatch" subtitle="Sign in to your account">
        <div />
      </AuthPageShell>
    )

    const shell = container.firstElementChild
    expect(shell).not.toBeNull()
    expect(shell?.className).toContain('overflow-hidden')
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
