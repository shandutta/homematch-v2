# D2 Rate-Limit Provider Readiness Map

Generated: 2026-05-08T18:05Z
Scope: Phase 0/1 documentation slice. Single read-only consolidation of D2 (durable production rate limiter) evidence onto one page so the remaining external ask is unambiguous. No durable provider was selected, no external/paid store was provisioned, no network calls, dashboards, secrets, subagents, Docker, live Supabase, or paid APIs were used. This report does not close Phase 0/1.

## Why this exists

D2 evidence is currently spread across the closure matrix entry, the gap scout, the approval-gate guard report, and the freshness snapshot. This map collapses those into one place that answers three questions in order:

1. What does the in-repo (local) rate limiter actually do today?
2. What invariants guard the durable provider seam against silent promotion?
3. What is the exact production approval still required, and from whom?

## 1. Local provider evidence (what is executable today)

| Concern | Source of truth | Behavior |
| --- | --- | --- |
| Implementation | `src/lib/middleware/rateLimiter.ts` | Single in-process limiter built on `rate-limiter-flexible/lib/RateLimiterMemory` (deep import, no optional adapters loaded). |
| Tier table | `src/lib/middleware/rateLimiter.ts` `RATE_LIMIT_TIERS` | `strict` (10/min, 5m block), `standard` (30/min, 2m block), `relaxed` (100/min, 1m block), `auth` (5 / 15min, 30m block), `testing` (1000/min, 5s block). |
| Public surface | `checkRateLimit(identifier, tier?)`, `rateLimit(request, tier?)`, `withRateLimit(request, handler, tier?)`, `authRateLimit(request, identifier?)`, `rateLimitKey(scope, identifier)`, `resetRateLimiters()` | All callers in `src/app/api/**` go through this surface; no parallel limiter implementation exists post-M10 consolidation. |
| Identity resolution | `getClientIdentifier()` in `rateLimiter.ts` | `ip_<x-forwarded-for[0]\|x-real-ip\|unknown>`; no Supabase auth call. Authenticated routes pass `user.id` or `route:scope:user.id` keys explicitly via `checkRateLimit` / `rateLimitKey`. |
| Route coverage | `reports/home-match-revival/rate-limit-gap-scout.md` | Admin cron, couples mutations, interactions reset/delete, performance metrics ingest, paid Maps routes, and user-avatar mutations all wired through the single limiter (M5 closed repo-side, M10 closed repo-side). |
| 429 response shape | `rateLimitExceededResponse()` in `rateLimiter.ts` | `ApiErrorHandler.tooManyRequests(...)` with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. |

## 2. Current default behavior (what runs without configuration)

- `RATE_LIMIT_STORAGE_PROVIDER` is **non-secret** configuration evidence; absence or value `memory` (case-insensitive, trimmed) is the only executable path.
- `getConfiguredRateLimitStorageProvider()` returns `{ provider: 'memory', durable: false }` for the unset / `memory` cases.
- Any other provider name throws: `Durable rate limiter storage provider "<name>" requires an approved adapter before production use`. There is no silent fall-through.
- Test/CI bypass: `shouldBypassRateLimit()` returns true under `NEXT_PUBLIC_TEST_MODE=true` or `NODE_ENV=test`, **unless** `RATE_LIMIT_ENFORCE_IN_TESTS=true` or `RATE_LIMIT_ENFORCE=true` is set. This is the seam targeted tests use to exercise real 429 behavior.
- No paid/external limiter SDK is installed: the durable-provider guard test statically asserts `package.json` does not declare `@upstash/redis`, `@upstash/ratelimit`, `@vercel/kv`, `redis`, `node-redis`, `ioredis`, `memcached`, or `memjs`, and that the limiter source does not import any of those modules.

## 3. Static invariants protecting the seam

| Invariant | Location | What it forbids |
| --- | --- | --- |
| Only `memory` is executable | `__tests__/unit/lib/middleware/rate-limiter-check.test.ts` "defaults to the in-memory provider and requires approval for durable storage" case | Silent promotion when `RATE_LIMIT_STORAGE_PROVIDER=redis`. |
| Approval-gate enumeration | `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts` `APPROVAL_GATED_PROVIDER_NAMES` | Each of `upstash`, `upstash-redis`, `@upstash/redis`, `vercel-kv`, `@vercel/kv`, `redis`, `ioredis`, `redis-cluster`, `memcached`, `dragonfly`, `cloudflare-kv`, `cloudflare-durable-objects`, `fly-redis`, `postgres`, `supabase`, `edge-config`, `durable`, `kv`, `external`, `production`, `unknown-provider` must throw the approval-required adapter error. Blank/whitespace values explicitly route back to `memory` so unset env stays harmless. |
| No durable SDK import | same guard, `FORBIDDEN_SDK_IMPORT_PATTERNS` regex set | Limiter source must not import `@upstash/redis`, `@upstash/ratelimit`, `@vercel/kv`, `ioredis`, `redis`, `node-redis`, `memcached`, `memjs`, `dragonfly`, or `cloudflare:*kv`. |
| No durable SDK dependency | same guard, `FORBIDDEN_DEPENDENCY_NAMES` package.json scan | None of the above package names may appear in `dependencies`, `devDependencies`, or `optionalDependencies`. |
| Closure-matrix language is preserved | same guard, "keeps D2 recorded as owner/ops approval-gated in the closure matrix" assertion | The phrases `durable provider choice/provisioning remains owner/ops approval-gated`, `only \`memory\` executable`, and the link to `d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md` cannot drift out of `reports/home-match-revival/phase0-phase1-closure-matrix.md` without test failure. |

These invariants mean a future config change (env value, dependency add, helper rewrite) cannot silently flip the limiter into "durable" mode by picking a name that happens not to be exercised by the consolidated check tests.

## 4. Exact production approval still needed

D2 stays "repo-local closed, production-decision blocked" until **one** of the following is approved by Shan/ops and recorded outside the repo with the corresponding repo-side adapter work:

- **Option A — Accept in-memory limiter as dev/best-effort only.** Document the production risk explicitly (single-instance enforcement, no cross-pod/edge protection, restart drops counters) and ship with that exception. Repo-side action: a written launch exception artifact referencing this map; no provider/adapter work needed.
- **Option B — Approve and provision Upstash Redis.** Repo-side action after approval: add an Upstash adapter behind the existing `getConfiguredRateLimitStorageProvider()` seam, register `upstash` / `@upstash/redis` as the executable provider, add the SDK dependency, remove those names from `APPROVAL_GATED_PROVIDER_NAMES`, and add adapter unit/integration tests. External action: provision Upstash project, store URL/token in production secrets, network egress allowlist if applicable.
- **Option C — Approve and provision Vercel KV (or another Redis-compatible store).** Repo-side action symmetric to B with a `vercel-kv` adapter; external action: provision the KV instance and bind it to the production Vercel project.

In all three options, the change to the executable provider list and the approval-gated list is a **post-approval** repo edit, not a pre-approval one. This document does not pre-stage any of those changes.

## 5. What this report does not do

- It does not select Redis, Upstash, Vercel KV, Postgres/Supabase, Cloudflare KV, Edge Config, Memcached, Dragonfly, Fly Redis, or any other store.
- It does not install, import, or call any external/paid rate-limit SDK.
- It does not mutate env, secrets, dashboards, or live Supabase.
- It does not advance the Phase 0/1 closure matrix; it consolidates D2 evidence so the remaining external ask is single-page legible.
- It does not claim multi-instance production enforcement is closed; that claim is reserved for Option B/C after their adapter+provisioning work lands.

## 6. Source artifacts

- `src/lib/middleware/rateLimiter.ts`
- `__tests__/unit/lib/middleware/rate-limiter-check.test.ts`
- `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts`
- `__tests__/unit/api/rate-limit-coverage.test.ts`
- `reports/home-match-revival/rate-limit-gap-scout.md`
- `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md` (D2 row)
- `reports/home-match-revival/p1-decision-needed-register-freshness-2026-05-08.md` (D2 entry)
- `reports/home-match-revival/phase0-phase1-closure-matrix.md` (D2 row + Phase 2 hold)
