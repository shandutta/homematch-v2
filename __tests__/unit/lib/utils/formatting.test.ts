import { describe, it, expect } from '@jest/globals'
import {
  formatNumber,
  formatPrice,
  formatRooms,
  formatSquareFootage,
} from '@/lib/utils/formatting'

describe('formatting utilities', () => {
  it('formats prices as USD currency', () => {
    expect(formatPrice(250000)).toBe('$250,000')
  })

  it('formats numbers with separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('formats square footage with suffix', () => {
    expect(formatSquareFootage(950)).toBe('950 sqft')
  })

  it('formats rooms with pluralization', () => {
    expect(formatRooms(1, 'bed')).toBe('1 bed')
    expect(formatRooms(2, 'bath')).toBe('2 baths')
  })
})
