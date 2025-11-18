import {
  getDbFiltersForInteractionType,
  mapInteractionTypeToDb,
  normalizeInteractionType,
} from '@/lib/utils/interaction-type'

describe('interaction-type helpers', () => {
  it('normalizes db + ui values into the ui InteractionType union', () => {
    expect(normalizeInteractionType('like')).toBe('liked')
    expect(normalizeInteractionType('view')).toBe('viewed')
    expect(normalizeInteractionType('dislike')).toBe('skip')
    expect(normalizeInteractionType('passed')).toBe('skip')
  })

  it('returns null for unsupported values', () => {
    expect(normalizeInteractionType('unknown')).toBeNull()
    expect(normalizeInteractionType(null)).toBeNull()
  })

  it('maps ui types to db interaction values', () => {
    expect(mapInteractionTypeToDb('liked')).toBe('like')
    expect(mapInteractionTypeToDb('viewed')).toBe('view')
    expect(mapInteractionTypeToDb('skip')).toBe('skip')
  })

  it('groups legacy db values when querying by type', () => {
    expect(getDbFiltersForInteractionType('liked')).toEqual(['like'])
    expect(getDbFiltersForInteractionType('viewed')).toEqual(['view'])
    expect(getDbFiltersForInteractionType('skip')).toEqual(['skip', 'dislike'])
  })
})
