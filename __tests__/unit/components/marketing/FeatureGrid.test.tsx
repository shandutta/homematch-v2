import { render, screen } from '@testing-library/react'
import { FeatureGrid } from '@/components/marketing/FeatureGrid'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Brain: ({ className }: any) => <svg data-testid="brain-icon" className={className} />,
  Users: ({ className }: any) => <svg data-testid="users-icon" className={className} />,
  Heart: ({ className }: any) => <svg data-testid="heart-icon" className={className} />,
  MessageSquare: ({ className }: any) => <svg data-testid="message-square-icon" className={className} />,
}))

describe('FeatureGrid', () => {
  test('renders all feature cards', () => {
    render(<FeatureGrid />)

    // Check all feature titles
    expect(screen.getByText('AI That Gets You Both')).toBeInTheDocument()
    expect(screen.getByText('Swipe Together, Decide Together')).toBeInTheDocument()
    expect(screen.getByText('Match on What Matters')).toBeInTheDocument()
    expect(screen.getByText('Talk Like Humans, Search Like Pros')).toBeInTheDocument()
  })

  test('renders all feature descriptions', () => {
    render(<FeatureGrid />)

    expect(screen.getByText(/Our ML learns what makes you and your partner tick/)).toBeInTheDocument()
    expect(screen.getByText(/Real-time collaboration means no more screenshot chains/)).toBeInTheDocument()
    expect(screen.getByText(/Beyond bedrooms and bathrooms—we match on vibe/)).toBeInTheDocument()
    expect(screen.getByText(/"Walking distance to coffee, big kitchen, room for a dog"/)).toBeInTheDocument()
  })

  test('renders section heading with gradient text', () => {
    render(<FeatureGrid />)

    expect(screen.getByText('House Hunting, But Make It')).toBeInTheDocument()
    expect(screen.getByText('Actually Fun')).toBeInTheDocument()
    
    // Check gradient classes are applied
    const gradientText = screen.getByText('Actually Fun')
    expect(gradientText).toHaveClass('bg-clip-text', 'text-transparent')
    
    // Check that the element has inline styles (background gradient is applied via style prop)
    expect(gradientText).toHaveAttribute('style')
    expect(gradientText.getAttribute('style')).toContain('linear-gradient')
  })

  test('renders section description', () => {
    render(<FeatureGrid />)
    expect(screen.getByText('We turned the most stressful part of adulting into date night')).toBeInTheDocument()
  })

  test('renders all feature icons', () => {
    render(<FeatureGrid />)

    expect(screen.getByTestId('brain-icon')).toBeInTheDocument()
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument()
    expect(screen.getByTestId('message-square-icon')).toBeInTheDocument()
  })

  test('applies correct grid layout classes', () => {
    render(<FeatureGrid />)

    const grid = screen.getByText('AI That Gets You Both').closest('.grid')
    expect(grid).toHaveClass('grid', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  test('feature cards have correct styling classes', () => {
    render(<FeatureGrid />)

    const firstCard = screen.getByText('AI That Gets You Both').closest('.group')
    expect(firstCard).toHaveClass(
      'group',
      'relative',
      'h-full',
      'overflow-hidden',
      'border-gray-200',
      'bg-white',
      'transition-all',
      'hover:shadow-xl'
    )
  })

  test('section has background gradient elements', () => {
    render(<FeatureGrid />)

    const section = screen.getByText('House Hunting, But Make It').closest('section')
    const backgroundElements = section?.querySelectorAll('[aria-hidden="true"]')
    
    // Should have 3 background elements (gradient, grid pattern, and accent gradients)
    expect(backgroundElements).toHaveLength(3)
  })

  test('icons have gradient background styling', () => {
    render(<FeatureGrid />)

    const iconContainers = screen.getAllByTestId(/.*-icon/).map(icon => icon.parentElement)
    iconContainers.forEach(container => {
      expect(container).toHaveClass('inline-flex', 'rounded-lg', 'p-3', 'text-white')
      // Check that gradient background is applied via inline styles
      expect(container).toHaveAttribute('style')
      expect(container?.getAttribute('style')).toContain('linear-gradient')
    })
  })

  test('applies responsive text sizing', () => {
    render(<FeatureGrid />)

    const heading = screen.getByText('House Hunting, But Make It')
    expect(heading).toHaveClass(
      'text-3xl',
      'sm:text-4xl',
      'md:text-5xl',
      'lg:text-6xl'
    )

    const description = screen.getByText('We turned the most stressful part of adulting into date night')
    expect(description).toHaveClass('text-lg', 'sm:text-xl', 'md:text-2xl')
  })

  test('feature titles have correct typography', () => {
    render(<FeatureGrid />)

    const titles = [
      'AI That Gets You Both',
      'Swipe Together, Decide Together',
      'Match on What Matters',
      'Talk Like Humans, Search Like Pros'
    ]

    titles.forEach(title => {
      const element = screen.getByText(title)
      expect(element).toHaveClass('text-lg', 'sm:text-xl', 'font-semibold', 'text-gray-900')
    })
  })

  test('feature descriptions have correct typography', () => {
    render(<FeatureGrid />)

    const descriptions = [
      /Our ML learns what makes you and your partner tick/,
      /Real-time collaboration means no more screenshot chains/,
      /Beyond bedrooms and bathrooms/,
      /"Walking distance to coffee/
    ]

    descriptions.forEach(desc => {
      const element = screen.getByText(desc)
      expect(element).toHaveClass('text-sm', 'sm:text-base', 'text-gray-600')
    })
  })

  test('section has correct container and spacing', () => {
    render(<FeatureGrid />)

    const section = screen.getByText('House Hunting, But Make It').closest('section')
    expect(section).toHaveClass('relative', 'py-14', 'sm:py-16')

    const container = screen.getByText('House Hunting, But Make It').closest('.container')
    expect(container).toHaveClass('container', 'mx-auto', 'px-4')
  })
})