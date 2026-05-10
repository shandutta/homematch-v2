/**
 * @jest-environment node
 */
// Phase 0/1 closure: P1-interaction-uniqueness

// Phase 0/1 closure: P1-interaction-uniqueness
import { describe, it, expect } from '@jest/globals'

import {
  computeDedupeKey,
  computeSourceFingerprint,
  decideIngestAction,
  dedupeBatch,
  ingestRecordSchema,
  type IngestRecord,
} from '@/lib/ingest/idempotency'

const baseRecord: IngestRecord = {
  source: 'zillow',
  zpid: '1001',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94105',
  price: 1500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1800,
  property_type: 'single_family',
  listing_status: 'active',
  images: ['https://example.com/a.jpg'],
  latitude: 37.7749,
  longitude: -122.4194,
}

describe('ingestRecordSchema', () => {
  it('parses a minimal valid Zillow record', () => {
    const result = ingestRecordSchema.parse({
      source: 'zillow',
      address: '  500 Market St  ',
      city: 'oakland',
      state: 'ca',
      zip_code: '94612',
      price: 850000,
      bedrooms: 2,
      bathrooms: 1,
    })
    expect(result.address).toBe('500 Market St')
    expect(result.state).toBe('CA')
    expect(result.zip_code).toBe('94612')
  })

  it('rejects an invalid zip code', () => {
    const parsed = ingestRecordSchema.safeParse({
      ...baseRecord,
      zip_code: 'ABCDE',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects a non-2-letter state', () => {
    const parsed = ingestRecordSchema.safeParse({
      ...baseRecord,
      state: 'California',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts mock and manual sources', () => {
    expect(
      ingestRecordSchema.safeParse({ ...baseRecord, source: 'mock' }).success
    ).toBe(true)
    expect(
      ingestRecordSchema.safeParse({ ...baseRecord, source: 'manual' }).success
    ).toBe(true)
  })

  it('rejects an unknown source', () => {
    expect(
      ingestRecordSchema.safeParse({ ...baseRecord, source: 'redfin' }).success
    ).toBe(false)
  })
})

describe('computeDedupeKey', () => {
  it('prefers zpid when available', () => {
    expect(computeDedupeKey(baseRecord)).toBe('zillow:zpid:1001')
  })

  it('uses normalized address composite when zpid missing', () => {
    const noZpid: IngestRecord = { ...baseRecord, zpid: undefined }
    const key = computeDedupeKey(noZpid)
    expect(key.startsWith('zillow:addr:')).toBe(true)
  })

  it('treats address whitespace and case as identical', () => {
    const a = computeDedupeKey({ ...baseRecord, zpid: undefined })
    const b = computeDedupeKey({
      ...baseRecord,
      zpid: undefined,
      address: '  123   main st  ',
      city: 'SAN FRANCISCO',
      state: 'ca',
    })
    expect(a).toBe(b)
  })

  it('namespaces keys by source', () => {
    const zillowKey = computeDedupeKey({ ...baseRecord, zpid: undefined })
    const mockKey = computeDedupeKey({
      ...baseRecord,
      source: 'mock',
      zpid: undefined,
    })
    expect(zillowKey).not.toBe(mockKey)
  })

  it('strips zip+4 suffix from address-based keys', () => {
    const a = computeDedupeKey({
      ...baseRecord,
      zpid: undefined,
      zip_code: '94105',
    })
    const b = computeDedupeKey({
      ...baseRecord,
      zpid: undefined,
      zip_code: '94105-1234',
    })
    expect(a).toBe(b)
  })
})

describe('computeSourceFingerprint', () => {
  it('returns a stable 64-char sha256', () => {
    const fp = computeSourceFingerprint(baseRecord)
    expect(fp).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic across calls', () => {
    expect(computeSourceFingerprint(baseRecord)).toBe(
      computeSourceFingerprint(baseRecord)
    )
  })

  it('ignores image URL changes', () => {
    const next = {
      ...baseRecord,
      images: ['https://example.com/b.jpg', 'https://cdn.example.com/c.jpg'],
    }
    expect(computeSourceFingerprint(next)).toBe(
      computeSourceFingerprint(baseRecord)
    )
  })

  it('changes when price changes', () => {
    const next = { ...baseRecord, price: 1450000 }
    expect(computeSourceFingerprint(next)).not.toBe(
      computeSourceFingerprint(baseRecord)
    )
  })

  it('changes when listing_status changes', () => {
    const next = { ...baseRecord, listing_status: 'pending' }
    expect(computeSourceFingerprint(next)).not.toBe(
      computeSourceFingerprint(baseRecord)
    )
  })

  it('treats numeric noise (1500 vs 1500.0) as identical', () => {
    const next = { ...baseRecord, square_feet: 1800.0 }
    expect(computeSourceFingerprint(next)).toBe(
      computeSourceFingerprint(baseRecord)
    )
  })
})

describe('dedupeBatch', () => {
  it('returns input unchanged when no duplicates', () => {
    const records: IngestRecord[] = [
      baseRecord,
      { ...baseRecord, zpid: '1002', address: '456 Oak St' },
    ]
    const result = dedupeBatch(records)
    expect(result.unique).toHaveLength(2)
    expect(result.duplicates).toHaveLength(0)
  })

  it('collapses duplicates, keeping the more populated record', () => {
    const sparse: IngestRecord = {
      source: 'zillow',
      zpid: '1001',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94105',
      price: 1500000,
      bedrooms: 3,
      bathrooms: 2,
    }
    const rich = baseRecord
    const result = dedupeBatch([sparse, rich])
    expect(result.unique).toHaveLength(1)
    expect(result.unique[0]).toBe(rich)
    expect(result.duplicates).toHaveLength(1)
    expect(result.duplicates[0].record).toBe(sparse)
    expect(result.duplicates[0].reason).toBe('in_batch_duplicate')
  })

  it('keeps the first when populated counts tie', () => {
    const a = { ...baseRecord, listing_status: 'active' as const }
    const b = { ...baseRecord, listing_status: 'pending' as const }
    const result = dedupeBatch([a, b])
    expect(result.unique).toHaveLength(1)
    expect(result.unique[0]).toBe(a)
  })

  it('treats records without zpid but identical address as duplicates', () => {
    const a: IngestRecord = { ...baseRecord, zpid: undefined }
    const b: IngestRecord = {
      ...baseRecord,
      zpid: undefined,
      address: '  123   MAIN st ',
    }
    const result = dedupeBatch([a, b])
    expect(result.unique).toHaveLength(1)
  })
})

describe('decideIngestAction', () => {
  it('inserts when no record exists', () => {
    expect(decideIngestAction(baseRecord, null)).toEqual({
      action: 'insert',
      reason: 'new_record',
    })
  })

  it('skips when fingerprint matches existing', () => {
    const fingerprint = computeSourceFingerprint(baseRecord)
    expect(
      decideIngestAction(baseRecord, {
        dedupe_key: 'zillow:zpid:1001',
        fingerprint,
        last_seen_at: '2026-01-01T00:00:00.000Z',
      })
    ).toEqual({ action: 'skip', reason: 'unchanged' })
  })

  it('updates when fingerprint differs', () => {
    expect(
      decideIngestAction(baseRecord, {
        dedupe_key: 'zillow:zpid:1001',
        fingerprint: 'a'.repeat(64),
        last_seen_at: '2026-01-01T00:00:00.000Z',
      })
    ).toEqual({ action: 'update', reason: 'fingerprint_changed' })
  })

  it('updates when only the listing_status changes (price edge case)', () => {
    const previous = computeSourceFingerprint({
      ...baseRecord,
      listing_status: 'active',
    })
    const next: IngestRecord = { ...baseRecord, listing_status: 'sold' }
    expect(
      decideIngestAction(next, {
        dedupe_key: 'zillow:zpid:1001',
        fingerprint: previous,
        last_seen_at: '2026-01-01T00:00:00.000Z',
      })
    ).toEqual({ action: 'update', reason: 'fingerprint_changed' })
  })
})
