// Phase 0/1 closure: P1-security-definer-paths
import {
  // Phase 0/1 closure: P1-security-definer-paths

  buildCityStateKey,
  buildCityStateKeys,
  buildCityStateOrClause,
  sanitizePostgrestFilterValue,
} from '@/lib/utils/postgrest'

describe('postgrest utilities', () => {
  describe('sanitizePostgrestFilterValue', () => {
    it('replaces parens and commas with spaces', () => {
      expect(sanitizePostgrestFilterValue('San (Diego),CA')).toBe(
        'San  Diego  CA'
      )
    })

    it('strips quotes, backticks, semicolons, slashes, and backslashes', () => {
      expect(sanitizePostgrestFilterValue(`O"r;a/n\\g\`e`)).toBe('Orange')
    })

    it('trims whitespace', () => {
      expect(sanitizePostgrestFilterValue('   plain text   ')).toBe(
        'plain text'
      )
    })

    it('returns empty string for whitespace-only input', () => {
      expect(sanitizePostgrestFilterValue('   ')).toBe('')
    })

    it('preserves benign characters', () => {
      expect(sanitizePostgrestFilterValue('San Francisco-East')).toBe(
        'San Francisco-East'
      )
    })
  })

  describe('buildCityStateKey', () => {
    it('returns null when city is empty', () => {
      expect(buildCityStateKey('', 'CA')).toBeNull()
      expect(buildCityStateKey('   ', 'CA')).toBeNull()
    })

    it('returns null when state is empty', () => {
      expect(buildCityStateKey('Oakland', '')).toBeNull()
      expect(buildCityStateKey('Oakland', '   ')).toBeNull()
    })

    it('lowercases city and state', () => {
      expect(buildCityStateKey('Oakland', 'CA')).toBe('oakland|ca')
    })

    it('trims whitespace before lowercasing', () => {
      expect(buildCityStateKey('  Oakland  ', '  CA  ')).toBe('oakland|ca')
    })
  })

  describe('buildCityStateKeys', () => {
    it('returns empty array for null/undefined/empty input', () => {
      expect(buildCityStateKeys(null)).toEqual([])
      expect(buildCityStateKeys(undefined)).toEqual([])
      expect(buildCityStateKeys([])).toEqual([])
    })

    it('builds unique keys for multiple pairs', () => {
      const keys = buildCityStateKeys([
        { city: 'Oakland', state: 'CA' },
        { city: 'San Francisco', state: 'CA' },
      ])
      expect(keys).toEqual(['oakland|ca', 'san francisco|ca'])
    })

    it('deduplicates keys (case-insensitive)', () => {
      const keys = buildCityStateKeys([
        { city: 'Oakland', state: 'CA' },
        { city: 'OAKLAND', state: 'ca' },
        { city: 'oakland', state: 'CA' },
      ])
      expect(keys).toEqual(['oakland|ca'])
    })

    it('skips invalid pairs (empty city/state)', () => {
      const keys = buildCityStateKeys([
        { city: 'Oakland', state: 'CA' },
        { city: '', state: 'NY' },
        { city: 'Boston', state: '' },
      ])
      expect(keys).toEqual(['oakland|ca'])
    })
  })

  describe('buildCityStateOrClause', () => {
    it('returns null for empty/null/undefined input', () => {
      expect(buildCityStateOrClause(null)).toBeNull()
      expect(buildCityStateOrClause(undefined)).toBeNull()
      expect(buildCityStateOrClause([])).toBeNull()
    })

    it('builds an or clause from a single pair', () => {
      const clause = buildCityStateOrClause([{ city: 'Oakland', state: 'CA' }])
      expect(clause).toBe('and(city.eq.Oakland,state.eq.CA)')
    })

    it('joins multiple clauses with commas', () => {
      const clause = buildCityStateOrClause([
        { city: 'Oakland', state: 'CA' },
        { city: 'Boston', state: 'MA' },
      ])
      expect(clause).toBe(
        'and(city.eq.Oakland,state.eq.CA),and(city.eq.Boston,state.eq.MA)'
      )
    })

    it('deduplicates pairs (case-insensitive)', () => {
      const clause = buildCityStateOrClause([
        { city: 'Oakland', state: 'CA' },
        { city: 'OAKLAND', state: 'CA' },
      ])
      expect(clause).toBe('and(city.eq.Oakland,state.eq.CA)')
    })

    it('skips pairs with empty values after sanitization', () => {
      const clause = buildCityStateOrClause([
        { city: ',(),', state: 'CA' },
        { city: 'Oakland', state: 'CA' },
      ])
      expect(clause).toBe('and(city.eq.Oakland,state.eq.CA)')
    })

    it('returns null when all pairs become empty', () => {
      const clause = buildCityStateOrClause([
        { city: '   ', state: 'CA' },
        { city: '', state: '' },
      ])
      expect(clause).toBeNull()
    })

    it('sanitizes injection-style values', () => {
      const clause = buildCityStateOrClause([
        { city: `San(Francisco)";--`, state: 'CA' },
      ])
      // parens/commas → spaces; quotes/semicolons removed
      expect(clause).toBe('and(city.eq.San Francisco --,state.eq.CA)')
    })
  })
})
