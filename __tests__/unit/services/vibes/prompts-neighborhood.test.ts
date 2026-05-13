/**
 * NEIGHBORHOOD-VIBES-WIRE — confirms the property-vibes user prompt
 * renders the neighborhood context section when provided, and omits it
 * cleanly when not.
 */
import {
  buildUserPrompt,
  type PropertyContext,
} from '@/lib/services/vibes/prompts'

const baseContext: PropertyContext = {
  address: '100 Main St',
  city: 'Portland',
  state: 'OR',
  price: 750_000,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1800,
  propertyType: 'single_family',
  yearBuilt: 1985,
  lotSizeSqft: 6000,
  amenities: null,
  description: null,
  neighborhoodVibes: null,
}

describe('buildUserPrompt — neighborhood context section', () => {
  it('omits the section when no neighborhood vibes are provided', () => {
    const prompt = buildUserPrompt(baseContext, 5)
    expect(prompt).not.toContain('NEIGHBORHOOD CONTEXT')
  })

  it('renders themes, highlights, and scores when provided', () => {
    const prompt = buildUserPrompt(
      {
        ...baseContext,
        neighborhoodVibes: {
          neighborhoodName: 'Cascade Heights',
          tagline: 'Leafy streets with corner cafes',
          themes: [
            {
              name: 'Walkable',
              whyItMatters: 'flat sidewalks and short blocks',
            },
            {
              name: 'Quiet',
              whyItMatters: 'low traffic side streets',
            },
          ],
          localHighlights: [
            {
              name: 'Roast House',
              category: 'cafe',
              whyItMatters: 'best espresso in the metro',
            },
          ],
          residentFits: [
            { profile: 'remote worker', reason: 'plenty of WFH cafes' },
          ],
          walkScore: 85,
          transitScore: 60,
        },
      },
      5
    )
    expect(prompt).toContain('NEIGHBORHOOD CONTEXT (Cascade Heights)')
    expect(prompt).toContain('Leafy streets with corner cafes')
    expect(prompt).toContain('Walk Score 85/100')
    expect(prompt).toContain('Transit Score 60/100')
    expect(prompt).toContain('Walkable: flat sidewalks and short blocks')
    expect(prompt).toContain('Roast House (cafe): best espresso in the metro')
    expect(prompt).toContain('remote worker: plenty of WFH cafes')
    expect(prompt).toContain('Do NOT invent walkability')
  })

  it('omits score line when both scores are null', () => {
    const prompt = buildUserPrompt(
      {
        ...baseContext,
        neighborhoodVibes: {
          neighborhoodName: 'Bar',
          tagline: 'placeholder',
          themes: [{ name: 't', whyItMatters: 'why' }],
          localHighlights: [
            { name: 'h', category: 'c', whyItMatters: 'why' },
          ],
          residentFits: [{ profile: 'p', reason: 'r' }],
          walkScore: null,
          transitScore: null,
        },
      },
      5
    )
    expect(prompt).not.toContain('Walk Score')
    expect(prompt).not.toContain('Transit Score')
  })
})
