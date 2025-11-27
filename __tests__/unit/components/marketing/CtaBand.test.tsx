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
  test('renders headline text', () => {
    render(<CtaBand />)

    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toContain('House')
    expect(heading.textContent).toContain('Hunting')
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
  })

  test('renders secondary CTA linking to login', () => {
    render(<CtaBand />)

    const secondaryCTA = screen.getByText('Already a Member?').closest('a')
    expect(secondaryCTA).toHaveAttribute('href', '/login')
  })

  test('primary CTA has tracking data attribute', () => {
    render(<CtaBand />)

    const primaryCTA = screen.getByText('Start Swiping').closest('a')
    expect(primaryCTA).toHaveAttribute('data-cta', 'dopamine-cta-band')
  })

  test('renders GradientMeshBackground with darker variant', () => {
    render(<CtaBand />)

    const gradient = screen.getByTestId('gradient-mesh-bg')
    expect(gradient).toHaveAttribute('data-variant', 'darker')
  })
})
