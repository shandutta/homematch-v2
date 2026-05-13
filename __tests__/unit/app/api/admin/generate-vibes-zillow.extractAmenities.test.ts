/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Cast on the heterogeneous-array fixture; we intentionally pass a mixed
// array of strings/non-strings to verify the filter behavior.
/**
 * INGEST-001 unit test for extractAmenities.
 * The function pulls a deduped, trimmed string[] of amenity-like signals out
 * of a Zillow property payload. It is the input that closes the LLM
 * hallucination loop (Section 1 of the audit) by giving the vibe generator
 * real content data to ground its claims in.
 */
import { extractAmenities } from '@/app/api/admin/generate-vibes-zillow/route'

describe('extractAmenities', () => {
  it('returns null when nothing extractable is present', () => {
    expect(extractAmenities({})).toBeNull()
  })

  it('pulls from each known structured array field', () => {
    const out = extractAmenities({
      appliances: ['Dishwasher', 'Microwave'],
      interiorFeatures: ['Vaulted Ceilings'],
      exteriorFeatures: ['Deck'],
      parkingFeatures: ['Attached Garage'],
      coolingFeatures: ['Central Air'],
      heatingFeatures: ['Forced Air'],
      flooring: ['Hardwood', 'Tile'],
      view: ['Mountain'],
    })
    expect(out).toEqual([
      'Dishwasher',
      'Microwave',
      'Vaulted Ceilings',
      'Deck',
      'Attached Garage',
      'Central Air',
      'Forced Air',
      'Hardwood',
      'Tile',
      'Mountain',
    ])
  })

  it('accepts scalar string for flooring / view', () => {
    const out = extractAmenities({
      flooring: 'Hardwood Throughout',
      view: 'City Skyline',
    })
    expect(out).toEqual(['Hardwood Throughout', 'City Skyline'])
  })

  it('emits boolean-flag tokens when present', () => {
    const out = extractAmenities({
      hasGarage: true,
      hasPool: true,
      hasFireplace: true,
    })
    expect(out).toEqual(['Garage', 'Pool', 'Fireplace'])
  })

  it('reads homeFacts label/value pairs', () => {
    const out = extractAmenities({
      homeFacts: [
        { factLabel: 'Lot size', factValue: '5,200 sqft' },
        { factLabel: 'Parking', factValue: '2-car garage' },
      ],
    })
    expect(out).toEqual(['Lot size: 5,200 sqft', 'Parking: 2-car garage'])
  })

  it('falls back to atAGlanceFacts when homeFacts is missing', () => {
    const out = extractAmenities({
      atAGlanceFacts: [{ factLabel: 'Year Built', factValue: '1956' }],
    })
    expect(out).toEqual(['Year Built: 1956'])
  })

  it('deduplicates case-insensitively, keeping first-encountered casing', () => {
    const out = extractAmenities({
      appliances: ['Dishwasher', 'DISHWASHER'],
      interiorFeatures: ['dishwasher'],
    })
    expect(out).toEqual(['Dishwasher'])
  })

  it('trims and drops empty / whitespace-only entries', () => {
    const out = extractAmenities({
      appliances: ['  Dishwasher  ', '', '   '],
      view: '',
    })
    expect(out).toEqual(['Dishwasher'])
  })

  it('drops non-string entries from arrays', () => {
    const out = extractAmenities({
      interiorFeatures: [
        'Hardwood',
        42,
        null,
        undefined,
        'Vaulted',
      ] as unknown as string[],
    })
    expect(out).toEqual(['Hardwood', 'Vaulted'])
  })
})
