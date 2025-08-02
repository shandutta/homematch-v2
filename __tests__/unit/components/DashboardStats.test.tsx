import { jest, describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'
import { InteractionSummary } from '@/types/app'

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('DashboardStats Component', () => {
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

    expect(screen.getByText('Viewed')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    expect(screen.getByText('Liked')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('should have correct links for each stat tile', () => {
    const mockSummary: InteractionSummary = { viewed: 10, liked: 5, passed: 3 }
    render(<DashboardStats summary={mockSummary} isLoading={false} />)

    const viewedLink = screen.getByText('Viewed').closest('a')
    expect(viewedLink).toHaveAttribute('href', '/dashboard/viewed')

    const likedLink = screen.getByText('Liked').closest('a')
    expect(likedLink).toHaveAttribute('href', '/dashboard/liked')

    const passedLink = screen.getByText('Passed').closest('a')
    expect(passedLink).toHaveAttribute('href', '/dashboard/passed')
  })
})
