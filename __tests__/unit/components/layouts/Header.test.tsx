import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/layouts/Header'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

// The Header uses next/link only. For testing, next/link can be rendered as a regular anchor.
jest.mock('next/link', () => {
  // Provide a typed mock and include children to satisfy a11y rule
  return function MockLink(
    props: { href: string; children?: React.ReactNode } & Record<
      string,
      unknown
    >
  ) {
    const { href, children, ...rest } = props
    return (
      <a href={href} {...rest}>
        {children ?? 'link'}
      </a>
    )
  }
})

describe('Header', () => {
  test('renders brand and primary navigation links', () => {
    render(<Header />)

    // Brand
    expect(screen.getByRole('link', { name: /HomeMatch/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )

    // Primary nav
    expect(screen.getByRole('link', { name: /Liked/i })).toHaveAttribute(
      'href',
      '/dashboard/liked'
    )
    expect(screen.getByRole('link', { name: /Viewed/i })).toHaveAttribute(
      'href',
      '/dashboard/viewed'
    )
    expect(screen.getByRole('link', { name: /Passed/i })).toHaveAttribute(
      'href',
      '/dashboard/passed'
    )

    // User dropdown button
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  test('navigation links are accessible and clickable', async () => {
    const user = userEvent.setup()
    render(<Header />)

    const liked = screen.getByRole('link', { name: /Liked/i })
    const viewed = screen.getByRole('link', { name: /Viewed/i })
    const passed = screen.getByRole('link', { name: /Passed/i })

    // We can verify that clicking doesn't throw and elements are interactable.
    await user.click(liked)
    await user.click(viewed)
    await user.click(passed)

    // Since we mocked next/link to a simple anchor, there is no router push to assert.
    // The presence of correct hrefs ensures correct navigation targets.
    expect(liked).toHaveAttribute('href', '/dashboard/liked')
    expect(viewed).toHaveAttribute('href', '/dashboard/viewed')
    expect(passed).toHaveAttribute('href', '/dashboard/passed')
  })

  test('user dropdown menu works correctly', async () => {
    const user = userEvent.setup()
    render(<Header />)

    const userBtn = screen.getByRole('button')
    expect(userBtn).toBeInTheDocument()

    // Click to open dropdown
    await user.click(userBtn)

    // Check dropdown items are visible as menu items
    expect(screen.getByRole('menuitem', { name: /Profile/i })).toHaveAttribute(
      'href',
      '/profile'
    )
    expect(screen.getByRole('menuitem', { name: /Settings/i })).toHaveAttribute(
      'href',
      '/settings'
    )
    expect(
      screen.getByRole('menuitem', { name: /Sign Out/i })
    ).toBeInTheDocument()
  })
})
