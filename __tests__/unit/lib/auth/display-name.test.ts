import { deriveDisplayNameFromEmail } from '@/lib/auth/display-name'

describe('deriveDisplayNameFromEmail (USERNAME-DROP fallback)', () => {
  test('titlecases a single-word local-part', () => {
    expect(deriveDisplayNameFromEmail('alex@example.com')).toBe('Alex')
  })

  test('splits dot-separated local-parts and titlecases each', () => {
    expect(deriveDisplayNameFromEmail('alex.morgan@example.com')).toBe(
      'Alex Morgan'
    )
  })

  test('splits underscores and hyphens', () => {
    expect(deriveDisplayNameFromEmail('alex_morgan@example.com')).toBe(
      'Alex Morgan'
    )
    expect(deriveDisplayNameFromEmail('alex-morgan@example.com')).toBe(
      'Alex Morgan'
    )
  })

  test('drops gmail-style + suffix', () => {
    expect(deriveDisplayNameFromEmail('alex+test@example.com')).toBe('Alex')
    expect(
      deriveDisplayNameFromEmail('alex.morgan+newsletter@example.com')
    ).toBe('Alex Morgan')
  })

  test('returns null for null / empty input', () => {
    expect(deriveDisplayNameFromEmail(null)).toBeNull()
    expect(deriveDisplayNameFromEmail(undefined)).toBeNull()
    expect(deriveDisplayNameFromEmail('')).toBeNull()
    expect(deriveDisplayNameFromEmail('   ')).toBeNull()
  })

  test('returns null when local-part is only separators', () => {
    expect(deriveDisplayNameFromEmail('+@example.com')).toBeNull()
    expect(deriveDisplayNameFromEmail('._-@example.com')).toBeNull()
  })

  test('handles all-caps and mixed-case input', () => {
    expect(deriveDisplayNameFromEmail('ALEX.MORGAN@example.com')).toBe(
      'Alex Morgan'
    )
    expect(deriveDisplayNameFromEmail('Alex.Morgan@example.com')).toBe(
      'Alex Morgan'
    )
  })
})
