import { render, screen } from '@testing-library/react'
import { FeatureGrid } from '@/components/marketing/FeatureGrid'

// Mock framer-motion (m is the LazyMotion alias used by source components)
jest.mock('framer-motion', () => {
  const motion = {
    div: ({ children, ...props }: JSX.IntrinsicElements['div']) => (
      <div {...props}>{children}</div>
    ),
  }
  return {
    motion,
    m: motion,
    useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
    useReducedMotion: () => false,
    useSpring: <T,>(value: T) => value,
    useTransform: () => ({ get: () => 0 }),
  }
})

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Brain: () => <svg data-testid="brain-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  Heart: () => <svg data-testid="heart-icon" />,
  MessageSquare: () => <svg data-testid="message-square-icon" />,
}))

describe('FeatureGrid', () => {
  test('renders section heading', () => {
    render(<FeatureGrid />)

    expect(
      screen.getByRole('heading', {
        name: /House hunting, but make it\s+Actually Fun/i,
      })
    ).toBeInTheDocument()
  })

  test('renders section description', () => {
    render(<FeatureGrid />)
    expect(
      screen.getByText(
        'Turn scattered listing opinions into a shared shortlist everyone can understand.'
      )
    ).toBeInTheDocument()
  })

  test('renders all feature titles', () => {
    render(<FeatureGrid />)

    expect(
      screen.getByText('One shortlist for the whole household')
    ).toBeInTheDocument()
    expect(
      screen.getByText('See your partner’s likes in real time')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Match on vibe, not just bed and bath')
    ).toBeInTheDocument()
    expect(screen.getByText('Search in plain English')).toBeInTheDocument()
  })

  test('renders all feature descriptions', () => {
    render(<FeatureGrid />)

    expect(
      screen.getByText(/We learn what each person actually likes/)
    ).toBeInTheDocument()
    expect(screen.getByText(/No more screenshot chains/)).toBeInTheDocument()
    expect(
      screen.getByText(/Neighborhood feel, walkability, future-fit/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/"Walk to coffee, big kitchen, room for a dog"/)
    ).toBeInTheDocument()
  })

  test('renders all feature icons', () => {
    render(<FeatureGrid />)

    expect(screen.getByTestId('brain-icon')).toBeInTheDocument()
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument()
    expect(screen.getByTestId('message-square-icon')).toBeInTheDocument()
  })
})
