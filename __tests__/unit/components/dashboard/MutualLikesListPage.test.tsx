import { describe, expect, test, jest } from '@jest/globals'
import type { ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { renderWithQuery } from '../../../utils/TestQueryProvider'
import { MutualLikesListPage } from '@/components/dashboard/MutualLikesListPage'

jest.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('MutualLikesListPage', () => {
  test('renders empty state with high-contrast text', () => {
    renderWithQuery(<MutualLikesListPage />)

    const heading = screen.getByRole('heading', {
      name: 'No mutual likes yet',
    })
    expect(heading).toHaveClass('text-hm-stone-100')

    const description = screen.getByText(
      /Keep swiping — when you both like the same home/i
    )
    expect(description).toHaveClass('text-hm-stone-300')
  })
})
