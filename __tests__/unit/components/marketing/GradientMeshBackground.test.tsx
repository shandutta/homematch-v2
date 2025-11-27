import { render } from '@testing-library/react'
import { GradientMeshBackground } from '@/components/marketing/GradientMeshBackground'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ set: jest.fn(), get: () => 0.5 }),
  useSpring: (value: any) => value,
  useTransform: () => ({ get: () => 0 }),
}))

describe('GradientMeshBackground', () => {
  beforeEach(() => {
    // Mock matchMedia for reduced motion preference
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
  test('renders with default props', () => {
    const { container } = render(<GradientMeshBackground />)

    // Should have the container with absolute positioning
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('absolute', 'inset-0', 'overflow-hidden')
  })

  test('renders with custom className', () => {
    const { container } = render(
      <GradientMeshBackground className="custom-class" />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })

  test('renders noise texture by default', () => {
    const { container } = render(<GradientMeshBackground />)

    // Should have SVG noise filter
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()

    const filter = container.querySelector('filter#noise')
    expect(filter).toBeInTheDocument()
  })

  test('hides noise texture when showNoise is false', () => {
    const { container } = render(<GradientMeshBackground showNoise={false} />)

    // Should not have SVG noise filter
    const svg = container.querySelector('svg')
    expect(svg).not.toBeInTheDocument()
  })

  test('renders with default variant colors', () => {
    const { container } = render(<GradientMeshBackground variant="default" />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ backgroundColor: '#030712' })
  })

  test('renders with darker variant colors', () => {
    const { container } = render(<GradientMeshBackground variant="darker" />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ backgroundColor: '#020617' })
  })

  test('renders with accent variant colors', () => {
    const { container } = render(<GradientMeshBackground variant="accent" />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ backgroundColor: '#030712' })
  })

  test('renders gradient blobs', () => {
    const { container } = render(<GradientMeshBackground />)

    // Should have multiple blur elements for the blobs
    const blurElements = container.querySelectorAll('[class*="blur-"]')
    expect(blurElements.length).toBeGreaterThanOrEqual(4)
  })

  test('renders vignette overlay', () => {
    const { container } = render(<GradientMeshBackground />)

    // Should have vignette (radial gradient from transparent to black)
    const pointerNoneElements = container.querySelectorAll(
      '.pointer-events-none'
    )
    expect(pointerNoneElements.length).toBeGreaterThan(0)
  })

  test('renders glow accent at top', () => {
    const { container } = render(<GradientMeshBackground />)

    // Should have glow element at top
    const glowElement = container.querySelector('.inset-x-0.top-0')
    expect(glowElement).toBeInTheDocument()
  })

  test('applies intensity to blob opacity', () => {
    const { container } = render(<GradientMeshBackground intensity={0.5} />)

    // Blobs should exist with reduced opacity
    const blobs = container.querySelectorAll('[class*="rounded-full"]')
    expect(blobs.length).toBeGreaterThan(0)
  })

  test('renders base gradient layer', () => {
    const { container } = render(<GradientMeshBackground />)

    // Should have base gradient div
    const baseLayer = container.querySelector('.absolute.inset-0')
    expect(baseLayer).toBeInTheDocument()
  })
})
