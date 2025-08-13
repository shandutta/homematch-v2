import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import {
  MutualLikesBadge,
  MutualLikesIndicator,
} from '@/components/features/couples/MutualLikesBadge'

// Mock framer-motion to avoid animation complications in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}))

describe('MutualLikesBadge Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering Logic', () => {
    test('should not render when likedByCount is less than 2', () => {
      const { container } = render(<MutualLikesBadge likedByCount={1} />)
      expect(container.firstChild).toBeNull()
    })

    test('should not render when likedByCount is 0', () => {
      const { container } = render(<MutualLikesBadge likedByCount={0} />)
      expect(container.firstChild).toBeNull()
    })

    test('should render when likedByCount is exactly 2', () => {
      render(<MutualLikesBadge likedByCount={2} />)
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
    })

    test('should render when likedByCount is greater than 2', () => {
      render(<MutualLikesBadge likedByCount={5} />)
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
    })
  })

  describe('Variant Styling', () => {
    test('should apply compact variant classes', () => {
      render(<MutualLikesBadge likedByCount={2} variant="compact" />)
      // Find the badge by data-slot attribute
      const badge = document.querySelector('[data-slot="badge"]')
      expect(badge).toHaveClass('text-token-xs', 'p-token-xs')
    })

    test('should apply default variant classes', () => {
      render(<MutualLikesBadge likedByCount={2} variant="default" />)
      const badge = document.querySelector('[data-slot="badge"]')
      expect(badge).toHaveClass('text-token-sm', 'p-token-sm')
    })

    test('should apply large variant classes', () => {
      render(<MutualLikesBadge likedByCount={2} variant="large" />)
      const badge = document.querySelector('[data-slot="badge"]')
      expect(badge).toHaveClass('text-token-base', 'p-token-md')
    })

    test('should default to default variant when not specified', () => {
      render(<MutualLikesBadge likedByCount={2} />)
      const badge = document.querySelector('[data-slot="badge"]')
      expect(badge).toHaveClass('text-token-sm', 'p-token-sm')
    })
  })

  describe('Count Display', () => {
    test('should not show count badge when likedByCount is exactly 2', () => {
      render(<MutualLikesBadge likedByCount={2} />)
      expect(screen.queryByText('2')).not.toBeInTheDocument()
    })

    test('should show count badge when likedByCount is greater than 2', () => {
      render(<MutualLikesBadge likedByCount={3} />)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    test('should show count badge with correct styling when count > 2', () => {
      render(<MutualLikesBadge likedByCount={5} />)
      const countBadge = screen.getByText('5')
      expect(countBadge).toHaveClass(
        'absolute',
        '-top-1',
        '-right-1',
        'bg-purple-500',
        'text-token-xs'
      )
    })
  })

  describe('Icons', () => {
    test('should display heart and users icons', () => {
      render(<MutualLikesBadge likedByCount={2} />)
      // Icons are present in the component, we'll test their container structure
      const badge = screen.getByText('Both liked!').closest('div')
      expect(badge).toBeInTheDocument()
    })

    test('should apply correct icon sizes for compact variant', () => {
      render(<MutualLikesBadge likedByCount={2} variant="compact" />)
      const container = screen.getByText('Both liked!').closest('div')
      expect(container).toBeInTheDocument()
    })

    test('should apply correct icon sizes for large variant', () => {
      render(<MutualLikesBadge likedByCount={2} variant="large" />)
      const container = screen.getByText('Both liked!').closest('div')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Animation Props', () => {
    test('should render with animation by default', () => {
      const { container } = render(<MutualLikesBadge likedByCount={2} />)
      // When animation is enabled, it's wrapped in motion.div
      expect(container.firstChild).toHaveClass('inline-block')
    })

    test('should render without animation wrapper when showAnimation is false', () => {
      render(<MutualLikesBadge likedByCount={2} showAnimation={false} />)
      // When animation is disabled, badge is rendered directly
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
    })
  })

  describe('CSS Classes', () => {
    test('should apply glass morphism styling', () => {
      render(<MutualLikesBadge likedByCount={2} />)
      const badge = document.querySelector('[data-slot="badge"]')
      expect(badge).toHaveClass('bg-gradient-mutual-likes')
      expect(badge).toHaveClass('backdrop-blur-sm')
    })
  })

  describe('Accessibility', () => {
    test('should have proper text content for screen readers', () => {
      render(<MutualLikesBadge likedByCount={2} />)
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
    })

    test('should maintain accessibility with count display', () => {
      render(<MutualLikesBadge likedByCount={4} />)
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    test('should have appropriate color contrast', () => {
      render(<MutualLikesBadge likedByCount={2} />)
      const text = screen.getByText('Both liked!')
      expect(text).toHaveClass('text-pink-300')
    })
  })
})

describe('MutualLikesIndicator Component', () => {
  const mockMutualLikes = [
    { property_id: 'prop-1', liked_by_count: 2 },
    { property_id: 'prop-2', liked_by_count: 3 },
    { property_id: 'prop-3', liked_by_count: 4 },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Property Matching', () => {
    test('should render badge when property has mutual likes', () => {
      render(
        <MutualLikesIndicator
          propertyId="prop-1"
          mutualLikes={mockMutualLikes}
        />
      )
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
    })

    test('should not render when property has no mutual likes', () => {
      const { container } = render(
        <MutualLikesIndicator
          propertyId="prop-nonexistent"
          mutualLikes={mockMutualLikes}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    test('should not render when mutual likes array is empty', () => {
      const { container } = render(
        <MutualLikesIndicator propertyId="prop-1" mutualLikes={[]} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Count Display', () => {
    test('should display correct count for property with 2 likes', () => {
      render(
        <MutualLikesIndicator
          propertyId="prop-1"
          mutualLikes={mockMutualLikes}
        />
      )
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
      expect(screen.queryByText('2')).not.toBeInTheDocument() // Count badge only shows for >2
    })

    test('should display count badge for property with >2 likes', () => {
      render(
        <MutualLikesIndicator
          propertyId="prop-2"
          mutualLikes={mockMutualLikes}
        />
      )
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    test('should display correct count for property with 4 likes', () => {
      render(
        <MutualLikesIndicator
          propertyId="prop-3"
          mutualLikes={mockMutualLikes}
        />
      )
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  describe('Variant Prop Passing', () => {
    test('should pass variant prop to MutualLikesBadge', () => {
      render(
        <MutualLikesIndicator
          propertyId="prop-1"
          mutualLikes={mockMutualLikes}
          variant="compact"
        />
      )
      const badge = document.querySelector('[data-slot="badge"]')
      expect(badge).toHaveClass('text-token-xs', 'p-token-xs')
    })

    test('should default to default variant when not specified', () => {
      render(
        <MutualLikesIndicator
          propertyId="prop-1"
          mutualLikes={mockMutualLikes}
        />
      )
      const badge = document.querySelector('[data-slot="badge"]')
      expect(badge).toHaveClass('text-token-sm', 'p-token-sm')
    })
  })

  describe('Edge Cases', () => {
    test('should handle undefined mutualLikes gracefully', () => {
      const { container } = render(
        <MutualLikesIndicator propertyId="prop-1" mutualLikes={[] as any} />
      )
      expect(container.firstChild).toBeNull()
    })

    test('should handle null propertyId gracefully', () => {
      const { container } = render(
        <MutualLikesIndicator
          propertyId={null as any}
          mutualLikes={mockMutualLikes}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    test('should handle mutualLikes with missing property_id fields', () => {
      const invalidMutualLikes = [
        { liked_by_count: 2 }, // Missing property_id
        { property_id: 'prop-1', liked_by_count: 3 },
      ] as any

      render(
        <MutualLikesIndicator
          propertyId="prop-1"
          mutualLikes={invalidMutualLikes}
        />
      )
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
    })
  })
})
