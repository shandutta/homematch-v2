/**
 * RapidAPI Zillow client used by the I4-rebuilt ingest pipeline.
 *
 * Wraps fetchWithTimeout with: paid-API approval gate, per-second pacing,
 * and a hard request count cap. Every entry point routes through here so
 * cost is observable at one place.
 */
import { fetchWithTimeout } from '@/lib/api/fetch-timeout'
import {
  isPaidRapidApiApproved,
  RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE,
} from '@/lib/api/rapidapi-approval-gate'

export const RAPIDAPI_DEFAULT_HOST = 'us-housing-market-data1.p.rapidapi.com'
export const RAPIDAPI_DEFAULT_DELAY_MS = 350
export const RAPIDAPI_DEFAULT_TIMEOUT_MS = 10_000
export const RAPIDAPI_DEFAULT_MAX_REQUESTS = 1000

export type RapidApiClientOptions = {
  apiKey?: string
  host?: string
  delayMs?: number
  timeoutMs?: number
  maxRequests?: number
}

export type RapidApiCallStats = {
  requestsIssued: number
  maxRequests: number
  totalLatencyMs: number
  errors: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class RapidApiQuotaExceededError extends Error {
  constructor(public readonly limit: number) {
    super(`RapidAPI request cap exceeded (limit ${limit})`)
    this.name = 'RapidApiQuotaExceededError'
  }
}

export class RapidApiZillowClient {
  private readonly apiKey: string
  private readonly host: string
  private readonly delayMs: number
  private readonly timeoutMs: number
  private readonly maxRequests: number
  private requestsIssued = 0
  private totalLatencyMs = 0
  private errors = 0
  private lastRequestAt = 0

  constructor(options: RapidApiClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.RAPIDAPI_KEY
    if (!apiKey) {
      throw new Error(
        'RAPIDAPI_KEY missing — set it in .env.local or pass apiKey explicitly'
      )
    }
    if (!isPaidRapidApiApproved()) {
      throw new Error(RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE)
    }

    this.apiKey = apiKey
    this.host =
      options.host ?? process.env.RAPIDAPI_HOST ?? RAPIDAPI_DEFAULT_HOST
    this.delayMs = options.delayMs ?? RAPIDAPI_DEFAULT_DELAY_MS
    this.timeoutMs = options.timeoutMs ?? RAPIDAPI_DEFAULT_TIMEOUT_MS
    this.maxRequests =
      options.maxRequests ??
      (Number.parseInt(process.env.HOMEMATCH_DISCOVER_MAX_REQUESTS ?? '', 10) ||
        RAPIDAPI_DEFAULT_MAX_REQUESTS)
  }

  get stats(): RapidApiCallStats {
    return {
      requestsIssued: this.requestsIssued,
      maxRequests: this.maxRequests,
      totalLatencyMs: this.totalLatencyMs,
      errors: this.errors,
    }
  }

  private async pace(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt
    const wait = this.delayMs - elapsed
    if (wait > 0) await sleep(wait)
  }

  /**
   * Issue a GET against the configured RapidAPI host with the standard
   * X-RapidAPI-* headers. Throws RapidApiQuotaExceededError if the cap is
   * hit; throws on HTTP non-2xx; returns parsed JSON on success.
   */
  async get<T = unknown>(path: string): Promise<T> {
    if (this.requestsIssued >= this.maxRequests) {
      throw new RapidApiQuotaExceededError(this.maxRequests)
    }

    await this.pace()
    const url = path.startsWith('http')
      ? path
      : `https://${this.host}${path.startsWith('/') ? path : `/${path}`}`

    const startedAt = Date.now()
    this.requestsIssued += 1
    this.lastRequestAt = startedAt

    let response: Response
    try {
      response = await fetchWithTimeout(url, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.host,
        },
        cache: 'no-store',
        timeoutMs: this.timeoutMs,
        timeoutMessage: `RapidAPI fetch timed out after ${this.timeoutMs}ms`,
      })
    } catch (err) {
      this.errors += 1
      this.totalLatencyMs += Date.now() - startedAt
      throw err
    }

    this.totalLatencyMs += Date.now() - startedAt

    if (!response.ok) {
      this.errors += 1
      const bodyPreview = await response
        .text()
        .then((s) => s.slice(0, 200))
        .catch(() => '')
      throw new Error(
        `RapidAPI ${path} failed: ${response.status} ${response.statusText} ${bodyPreview}`
      )
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (await response.json()) as T
  }
}
