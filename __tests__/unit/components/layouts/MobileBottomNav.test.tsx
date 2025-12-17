import { render, screen } from '@testing-library/react'
import { MobileBottomNav } from '@/components/layouts/MobileBottomNav'

const mockUsePathname = jest.fn(() => '/dashboard')

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

jest.mock('next/link', () => {
  return function MockLink(
    props: { href: string; children?: React.ReactNode } & Record<
      string,
      unknown
    >
  ) {
    const { href, children, ...rest } = props
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
})

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  it('renders primary navigation links', () => {
    render(<MobileBottomNav />)

    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'href',
      '/dashboard'
    )
    expect(screen.getByRole('link', { name: 'Viewed' })).toHaveAttribute(
      'href',
      '/dashboard/viewed'
    )
    expect(screen.getByRole('link', { name: 'Liked' })).toHaveAttribute(
      'href',
      '/dashboard/liked'
    )
    expect(screen.getByRole('link', { name: 'Passed' })).toHaveAttribute(
      'href',
      '/dashboard/passed'
    )
    expect(screen.getByRole('link', { name: 'Matches' })).toHaveAttribute(
      'href',
      '/couples'
    )
  })

  it('sets aria-current on the active link', () => {
    mockUsePathname.mockReturnValue('/dashboard/liked')
    render(<MobileBottomNav />)

    expect(screen.getByRole('link', { name: 'Liked' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    expect(screen.getByRole('link', { name: 'Viewed' })).not.toHaveAttribute(
      'aria-current'
    )
    expect(screen.getByRole('link', { name: 'Passed' })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('treats /couples subroutes as active for Matches', () => {
    mockUsePathname.mockReturnValue('/couples/decisions')
    render(<MobileBottomNav />)

    expect(screen.getByRole('link', { name: 'Matches' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})
