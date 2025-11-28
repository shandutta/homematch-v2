import { render, screen } from '@testing-library/react'
import { ActivityStats } from '@/components/profile/ActivityStats'

describe('ActivityStats', () => {
  const mockSummary = {
    likes: 25,
    dislikes: 10,
    views: 50,
    saved_searches: 3,
    total_interactions: 85,
  }

  const emptySummary = {
    likes: 0,
    dislikes: 0,
    views: 0,
    saved_searches: 0,
    total_interactions: 0,
  }

  it('renders all activity statistics correctly', () => {
    render(<ActivityStats summary={mockSummary} />)

    expect(screen.getByText('Activity Overview')).toBeInTheDocument()

    const stats = [
      { value: '50', words: ['Properties', 'Viewed'] },
      { value: '25', words: ['Properties', 'Liked'] },
      { value: '10', words: ['Properties', 'Passed'] },
      { value: '3', words: ['Saved', 'Searches'] },
    ]

    stats.forEach(({ value, words }) => {
      const valueEl = screen.getByText(value)
      const cardText = valueEl.closest('div')?.textContent || ''
      words.forEach((word) => {
        expect(cardText).toMatch(new RegExp(word, 'i'))
      })
    })
  })

  it('calculates and displays engagement rate correctly', () => {
    render(<ActivityStats summary={mockSummary} />)

    const engagementRate = Math.round(
      (mockSummary.likes / mockSummary.views) * 100
    )
    expect(screen.getByText('Engagement Rate')).toBeInTheDocument()
    expect(screen.getByText(`${engagementRate}%`)).toBeInTheDocument()
  })

  it('displays total interactions', () => {
    render(<ActivityStats summary={mockSummary} />)

    expect(screen.getByText('Total Interactions')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('shows correct insight for more likes than dislikes', () => {
    render(<ActivityStats summary={mockSummary} />)

    expect(screen.getByText(/great taste!/i)).toBeInTheDocument()
    expect(
      screen.getByText(/liked more properties than you've passed on/i)
    ).toBeInTheDocument()
  })

  it('shows correct insight for equal likes and dislikes', () => {
    const balancedSummary = {
      ...mockSummary,
      likes: 10,
      dislikes: 10,
    }
    render(<ActivityStats summary={balancedSummary} />)

    expect(screen.getByText(/balanced approach!/i)).toBeInTheDocument()
    expect(
      screen.getByText(/liked and passed on an equal number/i)
    ).toBeInTheDocument()
  })

  it('shows correct insight for more dislikes than likes', () => {
    const selectiveSummary = {
      ...mockSummary,
      likes: 5,
      dislikes: 20,
    }
    render(<ActivityStats summary={selectiveSummary} />)

    expect(screen.getByText(/selective buyer!/i)).toBeInTheDocument()
    expect(
      screen.getByText(/being careful about which properties you like/i)
    ).toBeInTheDocument()
  })

  it('displays saved searches message when present', () => {
    render(<ActivityStats summary={mockSummary} />)

    expect(screen.getByText(/3 saved searches/i)).toBeInTheDocument()
    expect(
      screen.getByText(/to help you find your perfect home/i)
    ).toBeInTheDocument()
  })

  it('uses singular form for single saved search', () => {
    const singleSearchSummary = {
      ...mockSummary,
      saved_searches: 1,
    }
    render(<ActivityStats summary={singleSearchSummary} />)

    expect(screen.getByText(/1 saved search/i)).toBeInTheDocument()
  })

  it('handles empty summary correctly', () => {
    render(<ActivityStats summary={emptySummary} />)

    expect(screen.getByText('0%')).toBeInTheDocument() // Engagement rate
    expect(screen.getAllByText('0')).toHaveLength(5) // All stats show 0
  })

  it('formats large numbers with locale string', () => {
    const largeSummary = {
      likes: 1500,
      dislikes: 800,
      views: 5000,
      saved_searches: 25,
      total_interactions: 7325,
    }
    render(<ActivityStats summary={largeSummary} />)

    expect(screen.getByText('5,000')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('7,325')).toBeInTheDocument()
  })
})
