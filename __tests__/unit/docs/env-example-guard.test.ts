// Phase 0/1 closure: P0-env-prod-guard
// Phase 0/1 closure: D4-env-prod-handling
import { readFileSync } from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

const envExamplePath = path.join(process.cwd(), '.env.example')
const envExampleRaw = readFileSync(envExamplePath, 'utf8')
const envExample = dotenv.parse(envExampleRaw)

const placeholderPrefixes = ['your_', 'base64_encoded_']
const allowedLiterals = new Set([
  'false',
  'true',
  'http://localhost:3000',
  'http://127.0.0.1:54321',
  'us-housing-market-data1.p.rapidapi.com',
  'openai/gpt-4o-mini',
  'San Francisco, CA;Oakland, CA;Berkeley, CA;San Jose, CA',
])

const isPlaceholderValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (allowedLiterals.has(trimmed)) return true
  if (placeholderPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return true
  }
  return false
}

const looksLikeRealSecret = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return false
  // JWT-shaped tokens (e.g. Supabase anon/service keys)
  if (
    /^ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/.test(
      trimmed
    )
  ) {
    return true
  }
  // sb_/sk_/pk_-prefixed tokens (Stripe-like, Supabase publishable, etc.)
  if (/^(sb|sk|pk|rk)_[A-Za-z0-9_-]{16,}$/.test(trimmed)) return true
  // Postgres URLs with embedded credentials
  if (/^postgres(ql)?:\/\/[^@\s]+:[^@\s]+@/.test(trimmed)) return true
  // Long high-entropy hex strings (32+ hex chars)
  if (/^[a-fA-F0-9]{32,}$/.test(trimmed)) return true
  // Long opaque base64-ish strings without underscores or hyphens (40+ chars)
  if (/^[A-Za-z0-9+/=]{40,}$/.test(trimmed) && !trimmed.startsWith('your_')) {
    return true
  }
  return false
}

describe('.env.example local-dev guard', () => {
  it('exposes only placeholder values, not real secrets', () => {
    const offenders: string[] = []
    for (const [key, rawValue] of Object.entries(envExample)) {
      const value = String(rawValue ?? '')
      if (looksLikeRealSecret(value)) {
        offenders.push(`${key} matches a real-secret pattern`)
        continue
      }
      if (!isPlaceholderValue(value)) {
        offenders.push(`${key} is not a recognised placeholder`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps the documented SKIP_SUPABASE_GUARD / SKIP_DOCKER local-dev paths discoverable', () => {
    // .env.example itself is a guidance file: it should not opt agents into
    // auto-skipping guards or Docker. Those flags must be set deliberately by
    // the developer in their own .env.local or shell, per README guidance.
    expect(
      Object.prototype.hasOwnProperty.call(envExample, 'SKIP_SUPABASE_GUARD')
    ).toBe(false)
    expect(
      Object.prototype.hasOwnProperty.call(envExample, 'SKIP_DOCKER')
    ).toBe(false)
  })

  it('does not print or commit a real .env.prod path or production database URL', () => {
    expect(envExampleRaw).not.toMatch(/\.env\.prod\b/)
    expect(envExampleRaw).not.toMatch(
      /postgres(ql)?:\/\/[^@\s]+:[^@\s]+@[^/\s]+/
    )
  })

  it('points Supabase configuration at safe placeholder hosts only', () => {
    const supabaseUrlKeys = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']
    for (const key of supabaseUrlKeys) {
      const value = (envExample[key] ?? '').trim()
      // Either the documented placeholder or the documented local default.
      const ok =
        value === 'your_supabase_url' ||
        value === 'http://127.0.0.1:54321' ||
        value === ''
      expect({ key, value, ok }).toEqual({ key, value, ok: true })
    }
  })
})
