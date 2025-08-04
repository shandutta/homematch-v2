import { jest, describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'
import { InteractionSummary } from '@/types/app'

// Mock Next.js Link component
jest.mock('next/link', () => {
  const Link = ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => {
    return <a href={href}>{children}</a>
  }
  Link.displayName = 'NextLinkMock'
  return Link
})

describe('DashboardStats Component', () => {
  // Provide a simple wrapper with an explicit displayName to satisfy react/display-name in test renders if needed
  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => <>{children}</>
  TestWrapper.displayName = 'DashboardStatsTestWrapper'
  test('should render skeletons when loading and no data is present', () => {
    const { container } = render(
      <DashboardStats summary={undefined} isLoading={true} />
    )
    // Skeletons don't have a role, so we query by class or structure
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  test('should render stats when data is provided', () => {
    const mockSummary: InteractionSummary = { viewed: 10, liked: 5, passed: 3 }
    render(<DashboardStats summary={mockSummary} isLoading={false} />)

    expect(screen.getByText('Viewed')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()

    expect(screen.getByText('Liked')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()

    expect(screen.getByText('Passed')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  test('should have correct links for each stat tile', () => {
    const mockSummary: InteractionSummary = { viewed: 10, liked: 5, passed: 3 }
    render(<DashboardStats summary={mockSummary} isLoading={false} />)

    const viewedLink = screen.getByText('Viewed').closest('a')
    expect(viewedLink).toBeTruthy()
    expect(viewedLink?.getAttribute('href')).toBe('/dashboard/viewed')

    const likedLink = screen.getByText('Liked').closest('a')
    expect(likedLink).toBeTruthy()
    expect(likedLink?.getAttribute('href')).toBe('/dashboard/liked')

    const passedLink = screen.getByText('Passed').closest('a')
    expect(passedLink).toBeTruthy()
    expect(passedLink?.getAttribute('href')).toBe('/dashboard/passed')
  })
})
