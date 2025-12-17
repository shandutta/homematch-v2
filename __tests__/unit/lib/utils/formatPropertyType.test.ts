import { describe, expect, it } from '@jest/globals'

import { formatPropertyType } from '@/lib/utils/formatPropertyType'

describe('formatPropertyType', () => {
  it('formats snake_case into title case', () => {
    expect(formatPropertyType('single_family')).toBe('Single Family')
    expect(formatPropertyType('multi_family')).toBe('Multi Family')
    expect(formatPropertyType('townhouse')).toBe('Townhouse')
  })

  it('handles already formatted input gracefully', () => {
    expect(formatPropertyType('Condo')).toBe('Condo')
    expect(formatPropertyType('SINGLE FAMILY')).toBe('Single Family')
  })
})
