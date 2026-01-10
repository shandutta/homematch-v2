import { render, screen } from '@testing-library/react'
import { FeatureGrid } from '@/components/marketing/FeatureGrid'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: JSX.IntrinsicElements['div']) => (
      <div {...props}>{children}</div>
    ),
  },
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
  useSpring: <T,>(value: T) => value,
  useTransform: () => ({ get: () => 0 }),
}))

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

    expect(screen.getByText('House Hunting, But Make It')).toBeInTheDocument()
    expect(screen.getByText('Actually Fun')).toBeInTheDocument()
  })

  test('renders section description', () => {
    render(<FeatureGrid />)
    expect(
      screen.getByText(
        'We turned the most stressful part of adulting into a shared game'
      )
    ).toBeInTheDocument()
  })

  test('renders all feature titles', () => {
    render(<FeatureGrid />)

    expect(screen.getByText('AI That Gets Everyone')).toBeInTheDocument()
    expect(
      screen.getByText('Swipe Together, Decide Together')
    ).toBeInTheDocument()
    expect(screen.getByText('Match on What Matters')).toBeInTheDocument()
    expect(
      screen.getByText('Talk Like Humans, Search Like Pros')
    ).toBeInTheDocument()
  })

  test('renders all feature descriptions', () => {
    render(<FeatureGrid />)

    expect(
      screen.getByText(/Our ML learns what matters to your household/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Real-time collaboration means no more screenshot chains/
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Beyond bedrooms and bathrooms—we match on vibe/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /"Walking distance to coffee, big kitchen, room for a dog"/
      )
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
