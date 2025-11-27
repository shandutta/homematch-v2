import { render, screen } from '@testing-library/react'
import { CtaBand } from '@/components/marketing/CtaBand'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock GradientMeshBackground
jest.mock('@/components/marketing/GradientMeshBackground', () => ({
  GradientMeshBackground: ({ variant, intensity }: any) => (
    <div
      data-testid="gradient-mesh-bg"
      data-variant={variant}
      data-intensity={intensity}
    />
  ),
}))

describe('CtaBand', () => {
  test('renders section with correct structure', () => {
    render(<CtaBand />)

    const section = document.querySelector('section')
    expect(section).toBeInTheDocument()
    expect(section).toHaveClass('relative', 'overflow-hidden')
  })

  test('renders GradientMeshBackground with darker variant', () => {
    render(<CtaBand />)

    const gradient = screen.getByTestId('gradient-mesh-bg')
    expect(gradient).toHaveAttribute('data-variant', 'darker')
    expect(gradient).toHaveAttribute('data-intensity', '0.8')
  })

  test('renders headline text', () => {
    render(<CtaBand />)

    // The headline is split into word spans by WordReveal component
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toContain('Make')
    expect(heading.textContent).toContain('House')
    expect(heading.textContent).toContain('Hunting')
    expect(heading.textContent).toContain('Couples')
    expect(heading.textContent).toContain('Game')
  })

  test('renders description text', () => {
    render(<CtaBand />)

    expect(
      screen.getByText(/Tasteful swiping\. Smart matches\. Real progress\./i)
    ).toBeInTheDocument()
  })

  test('renders primary CTA linking to signup', () => {
    render(<CtaBand />)

    const primaryCTA = screen.getByText('Start Swiping').closest('a')
    expect(primaryCTA).toHaveAttribute('href', '/signup')
    expect(primaryCTA).toHaveAttribute('aria-label', 'Start Swiping')
  })

  test('renders secondary CTA linking to login', () => {
    render(<CtaBand />)

    const secondaryCTA = screen.getByText('Already a Member?').closest('a')
    expect(secondaryCTA).toHaveAttribute('href', '/login')
  })

  test('primary CTA has correct data attribute', () => {
    render(<CtaBand />)

    const primaryCTA = screen.getByText('Start Swiping').closest('a')
    expect(primaryCTA).toHaveAttribute('data-cta', 'dopamine-cta-band')
  })

  test('secondary CTA has correct styling classes', () => {
    render(<CtaBand />)

    const secondaryCTA = screen.getByText('Already a Member?').closest('a')
    expect(secondaryCTA).toHaveClass(
      'border-2',
      'border-white/20',
      'bg-white/5',
      'text-white'
    )
  })

  test('renders top gradient fade for smooth transition', () => {
    const { container } = render(<CtaBand />)

    const fadeDiv = container.querySelector(
      '.bg-gradient-to-b.from-gray-50.to-transparent'
    )
    expect(fadeDiv).toBeInTheDocument()
    expect(fadeDiv).toHaveClass('h-24')
  })

  test('container has correct max width and centering', () => {
    const { container } = render(<CtaBand />)

    const contentContainer = container.querySelector('.container')
    expect(contentContainer).toHaveClass('mx-auto', 'px-4')
  })

  test('CTA container is responsive', () => {
    const { container } = render(<CtaBand />)

    // Check that there's a flex container with responsive classes somewhere in the DOM
    const flexContainers = container.querySelectorAll('.flex.flex-col')
    expect(flexContainers.length).toBeGreaterThan(0)
  })

  test('description has correct typography styling', () => {
    render(<CtaBand />)

    const description = screen.getByText(/Tasteful swiping/i)
    expect(description).toHaveClass('text-white/80')
    expect(description).toHaveStyle({ fontFamily: 'var(--font-body)' })
  })
})
