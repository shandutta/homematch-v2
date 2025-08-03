import { jest, describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'
import { Property } from '@/types/database'

// Mock the TinderCard component as it's a third-party library with its own tests
jest.mock('react-tinder-card', () => ({
  __esModule: true,
  default: ({ children, onSwipe }: { children: React.ReactNode; onSwipe: (dir: string) => void }) => (
    <div data-testid="tinder-card" data-swipe={(dir: string) => onSwipe(dir)}>
      {children}
    </div>
  ),
}))

const mockProperties: Property[] = [
  { id: 'prop-1', address: '1 Cool St' } as Property,
  { id: 'prop-2', address: '2 Neat Ave' } as Property,
]

describe('PropertySwiper Component', () => {
  test('should render a card for each property', () => {
    const onDecision = jest.fn()
    render(<PropertySwiper properties={mockProperties} onDecision={onDecision} />)
    const cards = screen.getAllByTestId('tinder-card')
    expect(cards).toHaveLength(2)
    expect(screen.getByText('1 Cool St')).toBeDefined()
    expect(screen.getByText('2 Neat Ave')).toBeDefined()
  })

  test('should render empty state when no properties are provided', () => {
    const onDecision = jest.fn()
    render(<PropertySwiper properties={[]} onDecision={onDecision} />)
    expect(screen.getByText('All out of properties!')).toBeDefined()
  })

  // Note: Testing the actual swipe gesture is an E2E concern.
  // Here, we can unit test the `onSwipe` callback logic if needed,
  // but the current implementation is simple enough that it's covered
  // by testing the onDecision prop on the child card.
})
