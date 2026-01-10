import { render } from '@testing-library/react'
import { GradientMeshBackground } from '@/components/marketing/GradientMeshBackground'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: JSX.IntrinsicElements['div']) => (
      <div {...props}>{children}</div>
    ),
  },
  useMotionValue: () => ({ set: jest.fn(), get: () => 0.5 }),
  useSpring: <T,>(value: T) => value,
  useTransform: () => ({ get: () => 0 }),
}))

describe('GradientMeshBackground', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  test('renders without crashing', () => {
    const { container } = render(<GradientMeshBackground />)
    expect(container.firstChild).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <GradientMeshBackground className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  test('renders noise texture by default', () => {
    const { container } = render(<GradientMeshBackground />)
    const filter = container.querySelector('filter#noise')
    expect(filter).toBeInTheDocument()
  })

  test('hides noise texture when showNoise is false', () => {
    const { container } = render(<GradientMeshBackground showNoise={false} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeInTheDocument()
  })

  test('renders with default variant', () => {
    const { container } = render(<GradientMeshBackground variant="default" />)
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#030712' })
  })

  test('renders with darker variant', () => {
    const { container } = render(<GradientMeshBackground variant="darker" />)
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#020617' })
  })

  test('renders with accent variant', () => {
    const { container } = render(<GradientMeshBackground variant="accent" />)
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#030712' })
  })
})
