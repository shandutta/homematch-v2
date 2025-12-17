import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { Footer } from '@/components/layouts/Footer'

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

describe('Footer', () => {
  it('renders the CTA variant by default', () => {
    render(<Footer />)

    expect(
      screen.getByText('Finish decisions later without losing the vibe.')
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Update profile' })
    ).toHaveAttribute('href', '/profile')

    expect(
      screen.getByRole('link', { name: 'Keep exploring' })
    ).toHaveAttribute('href', '/dashboard')
    expect(
      screen.getByRole('link', { name: 'Review favorites' })
    ).toHaveAttribute('href', '/dashboard/liked')
    expect(
      screen.getByRole('link', { name: 'Couples journey' })
    ).toHaveAttribute('href', '/couples')

    expect(
      screen.getByRole('link', { name: 'Terms of Service' })
    ).toHaveAttribute('href', '/terms')
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' })
    ).toHaveAttribute('href', '/privacy')
  })

  it('renders the minimal variant without CTA content', () => {
    render(<Footer variant="minimal" />)

    expect(
      screen.queryByText('Finish decisions later without losing the vibe.')
    ).toBeNull()
    expect(screen.queryByRole('link', { name: 'Update profile' })).toBeNull()

    expect(
      screen.getByRole('link', { name: 'Terms of Service' })
    ).toHaveAttribute('href', '/terms')
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' })
    ).toHaveAttribute('href', '/privacy')
  })
})
