import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { AvatarData } from '@/lib/constants/avatars'

describe('UserAvatar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders initials when no avatar provided', () => {
      render(<UserAvatar displayName="John Doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    test('renders preset avatar image when type=preset', () => {
      const avatar: AvatarData = { type: 'preset', value: 'fox' }
      render(<UserAvatar displayName="John" avatar={avatar} />)
      const img = document.querySelector('img')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', '/avatars/fox.svg')
    })

    test('renders custom image when type=custom', () => {
      const customUrl = 'https://example.com/avatar.png'
      const avatar: AvatarData = { type: 'custom', value: customUrl }
      render(<UserAvatar displayName="John" avatar={avatar} />)
      const img = document.querySelector('img')
      expect(img).toBeInTheDocument()
      // Next.js Image component transforms the src, so we check it contains the URL
      expect(img?.getAttribute('src')).toContain(encodeURIComponent(customUrl))
    })

    test('renders fallback "?" when no name or email', () => {
      render(<UserAvatar />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    test('renders fallback "?" when displayName is null', () => {
      render(<UserAvatar displayName={null} email={null} />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    test('renders fallback "?" when displayName is empty string', () => {
      render(<UserAvatar displayName="" email="" />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    test('applies xs size classes', () => {
      const { container } = render(<UserAvatar displayName="Test" size="xs" />)
      const avatar = container.querySelector('[data-slot="avatar"]')
      expect(avatar).toHaveClass('h-6', 'w-6')
    })

    test('applies sm size classes', () => {
      const { container } = render(<UserAvatar displayName="Test" size="sm" />)
      const avatar = container.querySelector('[data-slot="avatar"]')
      expect(avatar).toHaveClass('h-8', 'w-8')
    })

    test('applies md size classes (default)', () => {
      const { container } = render(<UserAvatar displayName="Test" />)
      const avatar = container.querySelector('[data-slot="avatar"]')
      expect(avatar).toHaveClass('h-10', 'w-10')
    })

    test('applies lg size classes', () => {
      const { container } = render(<UserAvatar displayName="Test" size="lg" />)
      const avatar = container.querySelector('[data-slot="avatar"]')
      expect(avatar).toHaveClass('h-14', 'w-14')
    })

    test('applies xl size classes with rounded-2xl', () => {
      const { container } = render(<UserAvatar displayName="Test" size="xl" />)
      const avatar = container.querySelector('[data-slot="avatar"]')
      expect(avatar).toHaveClass('h-20', 'w-20', 'rounded-2xl')
    })
  })

  describe('Initials Generation', () => {
    test('generates two initials from "John Doe"', () => {
      render(<UserAvatar displayName="John Doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    test('generates single initial from "John"', () => {
      render(<UserAvatar displayName="John" />)
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    test('generates two initials from three-word name', () => {
      render(<UserAvatar displayName="John William Doe" />)
      expect(screen.getByText('JW')).toBeInTheDocument()
    })

    test('falls back to email prefix when no displayName', () => {
      render(<UserAvatar email="johndoe@example.com" />)
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    test('uppercases initials', () => {
      render(<UserAvatar displayName="john doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    test('handles names with extra spaces', () => {
      render(<UserAvatar displayName="  John   Doe  " />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    test('prefers displayName over email', () => {
      render(<UserAvatar displayName="John Doe" email="jane@example.com" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  describe('Badge', () => {
    test('renders badge when provided', () => {
      render(
        <UserAvatar
          displayName="John"
          badge={<span data-testid="badge-content">!</span>}
        />
      )
      expect(screen.getByTestId('badge-content')).toBeInTheDocument()
    })

    test('does not render badge container when not provided', () => {
      const { container } = render(<UserAvatar displayName="John" />)
      // Badge container should not exist
      const badgeContainers = container.querySelectorAll('.absolute')
      expect(badgeContainers.length).toBe(0)
    })

    test('badge is positioned correctly for different sizes', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

      sizes.forEach((size) => {
        const { container, unmount } = render(
          <UserAvatar
            displayName="John"
            size={size}
            badge={<span>!</span>}
          />
        )
        const badge = container.querySelector('.absolute')
        expect(badge).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Custom className', () => {
    test('applies custom className to avatar', () => {
      const { container } = render(
        <UserAvatar displayName="John" className="custom-class" />
      )
      const avatar = container.querySelector('[data-slot="avatar"]')
      expect(avatar).toHaveClass('custom-class')
    })
  })

  describe('Avatar Source Handling', () => {
    test('shows initials fallback for invalid preset ID', () => {
      const avatar: AvatarData = { type: 'preset', value: 'invalid-animal' }
      render(<UserAvatar displayName="John Doe" avatar={avatar} />)
      // Should show initials since the preset is invalid
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    test('shows initials fallback when avatar is null', () => {
      render(<UserAvatar displayName="John Doe" avatar={null} />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })
})
