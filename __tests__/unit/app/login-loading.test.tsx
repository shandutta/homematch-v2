import { render } from '@testing-library/react'
import LoginLoading from '@/app/login/loading'

describe('login loading', () => {
  test('renders loading skeleton', () => {
    render(<LoginLoading />)
    // Should have at least some skeleton elements
    const container = document.querySelector('.animate-pulse')
    expect(container).toBeInTheDocument()
  })

  test('renders with auth page layout', () => {
    render(<LoginLoading />)
    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
    // Should have a card-like structure — look for max-w-md
    const formArea = document.querySelector('.max-w-md')
    expect(formArea).toBeInTheDocument()
  })

  test('title area has placeholder', () => {
    render(<LoginLoading />)
    const text = document.body.textContent || ''
    // Should be minimal text, mostly skeleton placeholders
    expect(text.length).toBeLessThan(100)
  })
})
