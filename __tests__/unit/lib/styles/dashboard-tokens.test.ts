import { describe, it, expect } from '@jest/globals'
import {
  dashboardTokens,
  getColor,
  getElevation,
  getSpacing,
} from '@/lib/styles/dashboard-tokens'

describe('dashboard tokens utilities', () => {
  it('returns elevation values by key', () => {
    expect(getElevation('md')).toBe(dashboardTokens.shadows.md)
  })

  it('returns spacing values by key', () => {
    expect(getSpacing('lg')).toBe('1.5rem')
  })

  it('returns colors by name and shade', () => {
    expect(getColor('primary', '500')).toBe('#0ea5e9')
    expect(getColor('text', 'primary')).toBe('#0f172a')
  })

  it('returns base color objects when shade is omitted', () => {
    expect(getColor('background')).toEqual(dashboardTokens.colors.background)
  })

  it('returns undefined for missing shades', () => {
    expect(getColor('primary', '999')).toBeUndefined()
  })
})
