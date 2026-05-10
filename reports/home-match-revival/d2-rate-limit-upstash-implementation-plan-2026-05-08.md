# D2 Upstash Redis Rate Limiter — Production Implementation Plan

Generated: 2026-05-08T18:10Z
Scope: Post-approval implementation plan. This document is the concrete engineering plan referenced by the D2 approval gate. It does NOT provision Upstash, install SDKs, or mutate production secrets. It is the ready-to-execute blueprint for when Shan/ops approves Option B from the readiness map.

## Provider Decision

**Upstash Redis** via `@upstash/ratelimit` + `@upstash/redis`.

Why Upstash over alternatives:

| Criterion                       | Upstash Redis                               | Vercel KV              | Self-hosted Redis          |
| ------------------------------- | ------------------------------------------- | ---------------------- | -------------------------- |
| Vercel Edge compatibility       | First-class (`@upstash/redis` HTTP client)  | Native                 | Requires TCP proxy         |
| Serverless connection model     | HTTP/REST (no connection pool exhaustion)   | HTTP                   | TCP connection pool        |
| Pricing                         | Pay-per-request, free tier (10k/day)        | Pay-per-read/write     | Infrastructure cost        |
| `rate-limiter-flexible` adapter | Not native; bridge via `@upstash/ratelimit` | Not native             | Native `RateLimiterRedis`  |
| Regional latency                | Global edge (Cloudflare Workers)            | Vercel edge only       | Single region              |
| HomeMatch fit                   | Best for Vercel + Next.js serverless        | Redundant (same infra) | Overkill for current scale |

## Architecture

The existing `getConfiguredRateLimitStorageProvider()` seam in `src/lib/middleware/rateLimiter.ts` is the integration point. The pattern:

```
RATE_LIMIT_STORAGE_PROVIDER=upstash
  → getConfiguredRateLimitStorageProvider()
    → returns { provider: 'upstash', durable: true }
  → createRateLimiter()
    → imports Upstash adapter (lazy, code-split safe)
    → returns Upstash-backed RateLimiterInstance
```

### New type shape

```typescript
type RateLimitStorageProviderConfig = {
  provider: 'memory' | 'upstash'
  durable: boolean
}
```

The `RateLimiterInstance` type (`Pick<RateLimiterMemoryType, 'consume'>`) is already narrow enough — both `RateLimiterMemory.consume()` and the Upstash bridge must satisfy that interface.

## Implementation Steps

### Step 1: Install SDK dependencies

```bash
pnpm add @upstash/redis @upstash/ratelimit
```

Two packages:

- `@upstash/ratelimit` — provides the sliding-window rate limiter
- `@upstash/redis` — HTTP-based Redis client (no connection pool, Edge-safe)

### Step 2: Create Upstash adapter module

New file: `src/lib/middleware/rateLimiterUpstashAdapter.ts`

Responsibilities:

- Accept `RATE_LIMIT_STORAGE_PROVIDER=upstash` and validate required env vars
- Construct `@upstash/redis` client from `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Wrap `@upstash/ratelimit` sliding-window limiter behind `RateLimiterInstance` interface
- Fail fast at construction time if env vars are missing (no silent fallback to memory)

Pseudo:

```typescript
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import type {
  RateLimiterInstance,
  RateLimitTierKey,
  RateLimitTierConfig,
} from './rateLimiter'

export function createUpstashRateLimiter(
  tier: RateLimitTierKey,
  config: RateLimitTierConfig
): RateLimiterInstance {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error(
      'Upstash Redis rate limiter requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables'
    )
  }

  const redis = new Redis({ url, token })
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.points, `${config.duration}s`),
    prefix: `rl_${tier}_`,
    analytics: true,
  })

  return {
    consume: async (key: string) => {
      const result = await ratelimit.limit(key)
      if (!result.success) {
        const msBeforeNext = result.reset - Date.now()
        throw { msBeforeNext, remainingPoints: result.remaining }
      }
    },
  }
}
```

### Step 3: Update provider configuration in rateLimiter.ts

Modify `getConfiguredRateLimitStorageProvider()`:

```typescript
export const getConfiguredRateLimitStorageProvider =
  (): RateLimitStorageProviderConfig => {
    const provider =
      process.env[RATE_LIMIT_STORAGE_PROVIDER_ENV]?.trim().toLowerCase() ||
      'memory'

    if (provider === 'memory') {
      return { provider, durable: false }
    }

    if (provider === 'upstash') {
      return { provider, durable: true }
    }

    throw new Error(
      `Durable rate limiter storage provider "${provider}" requires an approved adapter before production use`
    )
  }
```

Modify `createRateLimiter()`:

```typescript
const createRateLimiter = (
  tier: RateLimitTierKey,
  config: RateLimitTierConfig
): RateLimiterInstance => {
  const storage = getConfiguredRateLimitStorageProvider()

  if (storage.provider === 'memory') {
    return new RateLimiterMemory({
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
      keyPrefix: `rl_${tier}_`,
    })
  }

  if (storage.provider === 'upstash') {
    // Dynamic import to keep Upstash out of the cold-start bundle
    // when the provider is memory (default).
    const { createUpstashRateLimiter } = require('./rateLimiterUpstashAdapter')
    return createUpstashRateLimiter(tier, config)
  }

  throw new Error('Unreachable rate limiter storage provider')
}
```

Note: Dynamic `require()` is intentional — it keeps `@upstash/*` out of the memory-provider bundle. If tree-shaking is preferred, a lazy static import with a module-level flag works too.

### Step 4: Update guard tests

The file `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts` enforces Phase 0/1 invariants. Post-approval, it must be updated:

**Remove from `APPROVAL_GATED_PROVIDER_NAMES`:**

```diff
-  'upstash',
-  'upstash-redis',
-  '@upstash/redis',
```

**Remove from `FORBIDDEN_SDK_IMPORT_PATTERNS`:**

```diff
-  /['"]@upstash\/redis['"]/,
-  /['"]@upstash\/ratelimit['"]/,
```

**Remove from `FORBIDDEN_DEPENDENCY_NAMES`:**

```diff
-  '@upstash/redis',
-  '@upstash/ratelimit',
```

**Add new tests:**

- `it('accepts upstash as an executable provider and returns durable:true')`
- `it('fails fast when UPSTASH_REDIS_REST_URL is missing')`
- `it('fails fast when UPSTASH_REDIS_REST_TOKEN is missing')`
- `it('still rejects other non-approved providers (redis, vercel-kv, etc.)')`

**Update closure-matrix assertion:**
The test at line 202-212 asserts the closure matrix still says D2 is gated. Post-approval, this assertion must flip:

```diff
-  expect(closureMatrix).toContain('durable provider choice/provisioning remains owner/ops approval-gated')
+  expect(closureMatrix).toContain('Upstash Redis provisioned and adapter implemented')
```

### Step 5: Add unit tests for Upstash adapter

New file: `__tests__/unit/lib/middleware/rate-limiter-upstash-adapter.test.ts`

Coverage:

1. `getConfiguredRateLimitStorageProvider()` returns `{ provider: 'upstash', durable: true }` when env is `upstash`
2. Adapter throws with clear message when `UPSTASH_REDIS_REST_URL` is missing
3. Adapter throws with clear message when `UPSTASH_REDIS_REST_TOKEN` is missing
4. Adapter constructs without error when both env vars are present (unit — no network call)
5. `consume()` delegates to `@upstash/ratelimit.limit()` (mocked)
6. Rate-limit-exceeded scenario: `consume()` throws with `{ msBeforeNext, remainingPoints }`
7. Tier configuration (points, duration, prefix) passes through correctly
8. Multiple tier instances are independent (different prefixes)

### Step 6: Add integration test (skippable in CI)

New file: `__tests__/integration/lib/middleware/rate-limiter-upstash.spec.ts`

This test requires a real Upstash Redis instance. It is skipped by default (`test.skip`) unless `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.

Coverage:

1. Real `consume()` against Upstash sandbox/test database
2. Rapid successive calls trigger rate limit
3. Rate limit resets after window expiry
4. Concurrent requests from different keys don't interfere
5. Key prefixes isolate tiers

### Step 7: Update environment configuration

**Production (Vercel):**

```
RATE_LIMIT_STORAGE_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=<from Upstash dashboard>
UPSTASH_REDIS_REST_TOKEN=<from Upstash dashboard>
```

**Local dev (default — no change):**

```
# Unset or RATE_LIMIT_STORAGE_PROVIDER=memory
# No Upstash env vars needed
```

**Preview/staging:**
Same as production but pointing to a separate Upstash database (or sandbox) to avoid polluting production rate-limit counters during QA.

### Step 8: Upstash provisioning (external — ops)

Before deploying Step 7, ops must:

1. Create an Upstash Redis database (Global or regional — Global recommended for Vercel Edge)
2. Note the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Store them as Vercel environment variables (production + preview)
4. Verify network egress from Vercel to Upstash (should work out of the box — HTTP-based)

### Step 9: Update documentation artifacts

Files to update:

1. **`reports/home-match-revival/phase0-phase1-closure-matrix.md`** — Change D2 row from "repo-local adapter seam exists... remains owner/ops approval-gated" to "Upstash Redis provisioned; adapter implemented; integration tests pass"

2. **`reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`** — Update D2 status

3. **`reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`** — Add post-approval addendum noting the gate was lifted

4. **`AGENTS.md`** or project README — Document the new env vars and provider behavior

5. **`.env.example`** — Add commented examples:

```
# Rate limiter storage provider: 'memory' (default) or 'upstash'
RATE_LIMIT_STORAGE_PROVIDER=memory
# Only needed when RATE_LIMIT_STORAGE_PROVIDER=upstash:
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
```

## Rollback Strategy

If Upstash causes issues in production:

1. Set `RATE_LIMIT_STORAGE_PROVIDER=memory` in Vercel env and redeploy
2. The in-memory path is unchanged and always available
3. Remove Upstash env vars (optional — they're ignored when provider is `memory`)
4. The adapter module stays in the repo but is never loaded (dynamic import guard)

No code rollback needed — the env seam is the kill switch.

## Migration Path (Zero-Downtime)

1. Deploy the code changes with `RATE_LIMIT_STORAGE_PROVIDER=memory` (no behavioral change)
2. Verify deployment is healthy
3. Provision Upstash and add env vars to Vercel
4. Flip `RATE_LIMIT_STORAGE_PROVIDER=upstash` and redeploy
5. Monitor 429 rates, latency, and Upstash dashboard for anomalies

## Files Changed Summary

| File                                                                        | Action  | Purpose                                                       |
| --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------- |
| `src/lib/middleware/rateLimiterUpstashAdapter.ts`                           | **NEW** | Upstash adapter behind the seam                               |
| `src/lib/middleware/rateLimiter.ts`                                         | MODIFY  | Add `upstash` to provider config + createRateLimiter          |
| `__tests__/unit/lib/middleware/rate-limiter-upstash-adapter.test.ts`        | **NEW** | Unit tests for the adapter                                    |
| `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts` | MODIFY  | Remove Upstash from gated lists; add post-approval assertions |
| `__tests__/integration/lib/middleware/rate-limiter-upstash.spec.ts`         | **NEW** | Integration test (skippable)                                  |
| `package.json`                                                              | MODIFY  | Add `@upstash/redis` + `@upstash/ratelimit`                   |
| `pnpm-lock.yaml`                                                            | MODIFY  | Lockfile update                                               |
| `reports/home-match-revival/phase0-phase1-closure-matrix.md`                | MODIFY  | Update D2 status                                              |
| `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`      | MODIFY  | Update D2 status                                              |
| `.env.example`                                                              | MODIFY  | Document new env vars                                         |

## Non-Goals

- This plan does NOT provision Upstash or create API keys.
- It does NOT deploy to production or modify Vercel environment variables.
- It does NOT select any provider other than Upstash.
- It does NOT remove the memory provider — memory remains the default and the rollback path.
- It does NOT change the rate-limit tier values (`strict`, `standard`, `relaxed`, `auth`, `testing`).
- It does NOT affect route coverage or caller code — all callers go through `checkRateLimit`/`rateLimit`/`withRateLimit`/`authRateLimit` unchanged.
