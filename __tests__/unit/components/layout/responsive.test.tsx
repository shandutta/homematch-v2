/**
 * Mobile responsive contract tests.
 *
 * Guards three things that have regressed in the past:
 *  1. Touch targets meet the 44px iOS HIG / 48px Material minimum.
 *  2. Mobile-only chrome (bottom nav) is hidden on md+, and desktop-only
 *     nav is hidden on small viewports.
 *  3. Form inputs and buttons stay full-width and touch-sized on mobile.
 */

/* eslint-disable jest/expect-expect */

import { render, screen, within } from '@testing-library/react'
import { Header } from '@/components/layouts/Header'
import { MobileBottomNav } from '@/components/layouts/MobileBottomNav'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const mockUsePathname = jest.fn(() => '/dashboard')

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => mockUsePathname(),
}))

jest.mock('@/hooks/useCurrentUserAvatar', () => ({
  useCurrentUserAvatar: () => ({
    displayName: null,
    email: null,
    avatar: null,
    isLoading: false,
  }),
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
        {children ?? 'link'}
      </a>
    )
  }
})

jest.mock('framer-motion')

const TOUCH_TARGET_MIN_PX = 44

function parsePixelClass(
  className: string,
  prefix: 'min-h' | 'min-w' | 'h' | 'w'
): number | null {
  // Tailwind arbitrary value e.g. min-h-[44px]
  const arbitrary = new RegExp(`${prefix}-\\[(\\d+)px\\]`).exec(className)
  if (arbitrary) return Number(arbitrary[1])

  // Tailwind spacing scale (h-11 => 2.75rem => 44px). 0.25rem = 4px per step.
  const scale = new RegExp(
    `(?:^|\\s)${prefix}-(\\d+(?:\\.\\d+)?)(?:\\s|$)`
  ).exec(className)
  if (scale) return Math.round(Number(scale[1]) * 4)

  return null
}

function expectTouchSized(element: HTMLElement, label: string) {
  const className = element.className
  const minH =
    parsePixelClass(className, 'min-h') ?? parsePixelClass(className, 'h')
  const minW =
    parsePixelClass(className, 'min-w') ?? parsePixelClass(className, 'w')

  expect({
    label,
    minH,
    minW,
    className,
  }).toMatchObject({
    minH: expect.any(Number),
    minW: expect.any(Number),
  })

  expect(minH! >= TOUCH_TARGET_MIN_PX).toBe(true)
  expect(minW! >= TOUCH_TARGET_MIN_PX).toBe(true)
}

describe('responsive layout — touch targets', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  test('Header mobile menu button meets 44px touch target', () => {
    render(<Header />)
    const menuBtn = screen.getByLabelText(/open navigation menu/i)
    expectTouchSized(menuBtn, 'Header mobile menu button')
  })

  test('Header brand link meets 44px touch target', () => {
    render(<Header />)
    const brand = screen.getByRole('link', {
      name: /HomeMatch - Go to dashboard/i,
    })
    expectTouchSized(brand, 'Header brand link')
  })

  test('Header desktop nav links meet 44px touch target', () => {
    render(<Header />)
    for (const label of ['Viewed', 'Liked', 'Passed', 'Shared Likes']) {
      const link = screen.getByRole('link', { name: new RegExp(label, 'i') })
      expectTouchSized(link, `Header desktop nav: ${label}`)
    }
  })

  test('MobileBottomNav links meet 44px touch target', () => {
    render(<MobileBottomNav />)
    const nav = screen.getByTestId('bottom-nav')
    const links = within(nav).getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expectTouchSized(link, `BottomNav link: ${link.getAttribute('href')}`)
    }
  })

  test('Input component meets 44px touch height', () => {
    render(<Input data-testid="responsive-input" placeholder="email" />)
    const input = screen.getByTestId('responsive-input')
    const minH =
      parsePixelClass(input.className, 'min-h') ??
      parsePixelClass(input.className, 'h')
    expect(minH).not.toBeNull()
    expect(minH! >= TOUCH_TARGET_MIN_PX).toBe(true)
  })

  test('Default Button size meets 44px touch height', () => {
    render(<Button data-testid="responsive-button">Submit</Button>)
    const btn = screen.getByTestId('responsive-button')
    const minH =
      parsePixelClass(btn.className, 'min-h') ??
      parsePixelClass(btn.className, 'h')
    expect(minH).not.toBeNull()
    expect(minH! >= TOUCH_TARGET_MIN_PX).toBe(true)
  })
})

describe('responsive layout — viewport visibility classes', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  test('MobileBottomNav is hidden on desktop (md+)', () => {
    render(<MobileBottomNav />)
    const nav = screen.getByTestId('bottom-nav')
    // Tailwind hides on md and above with `md:hidden`
    expect(nav.className).toMatch(/\bmd:hidden\b/)
  })

  test('Header mobile menu button is hidden on md+', () => {
    render(<Header />)
    const menuBtn = screen.getByLabelText(/open navigation menu/i)
    expect(menuBtn.className).toMatch(/\bmd:hidden\b/)
  })

  test('Header desktop nav container is hidden on small screens and shown on md+', () => {
    render(<Header />)
    // Walk up from a desktop link to find its visibility wrapper.
    const viewedLink = screen.getByRole('link', { name: /Viewed/i })
    let el: HTMLElement | null = viewedLink.parentElement
    let foundHiddenContainer = false
    while (el) {
      if (/\bhidden\b/.test(el.className) && /\bmd:flex\b/.test(el.className)) {
        foundHiddenContainer = true
        break
      }
      el = el.parentElement
    }
    expect(foundHiddenContainer).toBe(true)
  })
})

describe('responsive layout — bottom nav structure', () => {
  test('all bottom nav items have an aria-label and href', () => {
    render(<MobileBottomNav />)
    const nav = screen.getByTestId('bottom-nav')
    const links = within(nav).getAllByRole('link')
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^\/(dashboard|couples)/)
      expect(link.getAttribute('aria-label')).toBeTruthy()
    }
  })

  test('bottom nav reserves safe-area on iOS notch devices', () => {
    render(<MobileBottomNav />)
    const nav = screen.getByTestId('bottom-nav')
    expect(nav.className).toMatch(/safe-area-bottom/)
  })
})
