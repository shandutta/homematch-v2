/** @jest-environment node */

import { describe, test, expect } from '@jest/globals'
import { buildNeighborhoodVibePrompt } from '@/lib/services/neighborhood-vibes/prompts'

describe('buildNeighborhoodVibePrompt', () => {
  test('handles NaN string listing stats without throwing', () => {
    const { userPrompt } = buildNeighborhoodVibePrompt({
      neighborhoodId: 'n1',
      name: 'Test Neighborhood',
      city: 'Test City',
      state: 'TS',
      listingStats: {
        total_properties: 'NaN',
        avg_price: 'NaN',
        median_price: 'NaN',
        price_range_min: 'NaN',
        price_range_max: 'NaN',
        avg_bedrooms: 'NaN',
        avg_bathrooms: 'NaN',
        avg_square_feet: 'NaN',
      } as any,
      sampleProperties: [],
    })

    expect(userPrompt).toContain('Listings snapshot: total n/a')
    expect(userPrompt).toContain('avg n/a')
  })

  test('formats numeric strings in listing stats', () => {
    const { userPrompt } = buildNeighborhoodVibePrompt({
      neighborhoodId: 'n1',
      name: 'Test Neighborhood',
      city: 'Test City',
      state: 'TS',
      listingStats: {
        total_properties: '12',
        avg_price: '750000',
        median_price: '720000',
        price_range_min: '550000',
        price_range_max: '1100000',
        avg_bedrooms: '3.25',
        avg_bathrooms: '2',
        avg_square_feet: '1550.8',
      } as any,
      sampleProperties: [],
    })

    expect(userPrompt).toContain('Listings snapshot: total 12')
    expect(userPrompt).toContain('median $720,000')
    expect(userPrompt).toContain('range $550,000-$1,100,000')
    expect(userPrompt).toContain('avg 3.3bd 2.0ba')
    expect(userPrompt).toContain('avg 1,551 sqft')
  })
})
