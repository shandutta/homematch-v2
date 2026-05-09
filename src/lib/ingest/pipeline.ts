/**
 * Coordinated property ingest pipeline.
 *
 * Stages, in order:
 *   1. validate  — Zod-parse every raw record into the canonical
 *                  `IngestRecord` shape; rejected rows are reported, not
 *                  thrown, so a single bad listing doesn't sink the run.
 *   2. dedupe    — collapse in-batch duplicates via `dedupeBatch`, then
 *                  consult the optional idempotency lookup to short-circuit
 *                  no-op writes (same fingerprint as what's already stored).
 *   3. enrich    — apply caller-supplied enrichers (geocoding, neighborhood
 *                  lookup, image refresh, etc.) one record at a time.
 *   4. store     — hand the surviving records to the caller's writer.
 *
 * The pipeline is deliberately framework-free. It accepts a fetcher (for
 * pulling raw rows), an optional idempotency lookup, an optional enricher,
 * and a writer — each can be a Supabase call in production or an in-memory
 * stub in tests. A `MockZillowSource` is exported so the test suite can
 * exercise the full flow without any network access.
 */

import { z } from 'zod'

import {
  type IdempotencyRecord,
  type IngestDecision,
  type IngestRecord,
  computeDedupeKey,
  computeSourceFingerprint,
  decideIngestAction,
  dedupeBatch,
  ingestRecordSchema,
} from './idempotency'

export type RawIngestInput = unknown

export interface ValidationFailure {
  index: number
  errors: string[]
  raw: RawIngestInput
}

export interface PipelineSummary {
  fetched: number
  validated: number
  validationFailures: ValidationFailure[]
  duplicatesInBatch: number
  unchanged: number
  inserted: number
  updated: number
  enrichmentFailures: Array<{ dedupe_key: string; error: string }>
  storeFailures: Array<{ dedupe_key: string; error: string }>
}

export interface IngestSourceFetcher {
  /** Pulls a raw, unvalidated batch from the source. */
  fetch(): Promise<RawIngestInput[]>
}

export interface IdempotencyLookup {
  /**
   * Look up persisted idempotency records by dedupe key. Implementations
   * should return `null` (or omit the key) when the record has never been
   * ingested.
   */
  lookup(
    keys: string[]
  ): Promise<Map<string, IdempotencyRecord | null>> | Map<string, IdempotencyRecord | null>
}

export interface RecordEnricher {
  /**
   * Optionally enrich a record before it's written. Returning `null` drops
   * the record from the run (useful when an enricher decides the record is
   * unworthy — e.g. geocoding failed for a record we require coordinates
   * for). Throwing reports a failure; the record is dropped.
   */
  enrich(record: IngestRecord): Promise<IngestRecord | null> | IngestRecord | null
}

export interface PipelineWriteInput {
  record: IngestRecord
  decision: IngestDecision
  fingerprint: string
  dedupe_key: string
}

export interface RecordWriter {
  write(input: PipelineWriteInput): Promise<void> | void
}

export interface RunIngestPipelineOptions {
  source: IngestSourceFetcher
  writer: RecordWriter
  idempotency?: IdempotencyLookup
  enricher?: RecordEnricher
  /** Hard cap on records to process per run; defaults to no cap. */
  maxRecords?: number
}

export const pipelineSummarySchema = z.object({
  fetched: z.number().int().nonnegative(),
  validated: z.number().int().nonnegative(),
  validationFailures: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      errors: z.array(z.string()),
      raw: z.unknown(),
    })
  ),
  duplicatesInBatch: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  enrichmentFailures: z.array(
    z.object({ dedupe_key: z.string(), error: z.string() })
  ),
  storeFailures: z.array(
    z.object({ dedupe_key: z.string(), error: z.string() })
  ),
})

function emptySummary(): PipelineSummary {
  return {
    fetched: 0,
    validated: 0,
    validationFailures: [],
    duplicatesInBatch: 0,
    unchanged: 0,
    inserted: 0,
    updated: 0,
    enrichmentFailures: [],
    storeFailures: [],
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return JSON.stringify(error)
}

function validateBatch(raw: RawIngestInput[]): {
  validated: IngestRecord[]
  failures: ValidationFailure[]
} {
  const validated: IngestRecord[] = []
  const failures: ValidationFailure[] = []
  raw.forEach((entry, index) => {
    const result = ingestRecordSchema.safeParse(entry)
    if (result.success) {
      validated.push(result.data)
    } else {
      failures.push({
        index,
        raw: entry,
        errors: result.error.errors.map(
          (e) => `${e.path.join('.') || '<root>'}: ${e.message}`
        ),
      })
    }
  })
  return { validated, failures }
}

export async function runIngestPipeline(
  options: RunIngestPipelineOptions
): Promise<PipelineSummary> {
  const summary = emptySummary()
  const raw = await options.source.fetch()
  summary.fetched = raw.length

  const { validated, failures } = validateBatch(raw)
  summary.validationFailures = failures
  summary.validated = validated.length

  const cap = options.maxRecords
  const capped =
    typeof cap === 'number' && cap >= 0 ? validated.slice(0, cap) : validated

  const { unique, duplicates } = dedupeBatch(capped)
  summary.duplicatesInBatch = duplicates.length

  const dedupeKeys = unique.map((record) => computeDedupeKey(record))
  let lookup: Map<string, IdempotencyRecord | null> = new Map()
  if (options.idempotency) {
    const result = await options.idempotency.lookup(dedupeKeys)
    lookup = result instanceof Map ? result : new Map(result)
  }

  for (let i = 0; i < unique.length; i += 1) {
    const record = unique[i]
    const dedupe_key = dedupeKeys[i]
    const existing = lookup.get(dedupe_key) ?? null
    const decision = decideIngestAction(record, existing)

    if (decision.action === 'skip') {
      summary.unchanged += 1
      continue
    }

    let prepared: IngestRecord = record
    if (options.enricher) {
      try {
        const enriched = await options.enricher.enrich(record)
        if (!enriched) {
          // Enricher dropped the record by returning null — count it as
          // unchanged (we won't write) but don't flag a failure.
          summary.unchanged += 1
          continue
        }
        prepared = enriched
      } catch (error) {
        summary.enrichmentFailures.push({
          dedupe_key,
          error: describeError(error),
        })
        continue
      }
    }

    const fingerprint = computeSourceFingerprint(prepared)
    try {
      await options.writer.write({
        record: prepared,
        decision,
        fingerprint,
        dedupe_key,
      })
      if (decision.action === 'insert') {
        summary.inserted += 1
      } else {
        summary.updated += 1
      }
    } catch (error) {
      summary.storeFailures.push({
        dedupe_key,
        error: describeError(error),
      })
    }
  }

  return summary
}

/**
 * In-memory mock source. Used in tests to exercise the pipeline end-to-end
 * without touching the real Zillow API. Returns its seed payload as-is so
 * tests can verify validation, dedupe, and write counts deterministically.
 */
export class MockZillowSource implements IngestSourceFetcher {
  constructor(private readonly seed: RawIngestInput[]) {}

  async fetch(): Promise<RawIngestInput[]> {
    return this.seed
  }
}

/**
 * In-memory writer. Tracks every write the pipeline performs. Useful in
 * tests; production code wires up a Supabase upsert here.
 */
export class InMemoryWriter implements RecordWriter {
  public readonly writes: PipelineWriteInput[] = []

  write(input: PipelineWriteInput): void {
    this.writes.push(input)
  }
}

/**
 * Map-backed idempotency lookup. Pre-populate with the records you want the
 * pipeline to consider already-ingested. Tests use this to assert that
 * unchanged fingerprints are skipped and changed fingerprints update.
 */
export class InMemoryIdempotencyStore implements IdempotencyLookup {
  constructor(private readonly state: Map<string, IdempotencyRecord> = new Map()) {}

  set(record: IdempotencyRecord): void {
    this.state.set(record.dedupe_key, record)
  }

  lookup(keys: string[]): Map<string, IdempotencyRecord | null> {
    const result = new Map<string, IdempotencyRecord | null>()
    for (const key of keys) {
      result.set(key, this.state.get(key) ?? null)
    }
    return result
  }
}
