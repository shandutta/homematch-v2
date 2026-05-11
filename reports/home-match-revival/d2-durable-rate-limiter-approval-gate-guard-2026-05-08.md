# D2 Durable Rate Limiter Approval-Gate Guard

Generated: 2026-05-08T17:25Z
Scope: repo-local Phase 0/1 evidence only. No durable provider was selected, no external/paid store was provisioned, and no network calls, dashboard changes, secrets, subagents, Docker, live Supabase, or paid APIs were used.

## Guarded invariant

The HomeMatch rate limiter may keep using the existing in-process memory store as the only executable repo-local provider until Shan/ops explicitly approves a durable production provider and adapter implementation.

`RATE_LIMIT_STORAGE_PROVIDER` is intentionally non-secret configuration evidence, not permission to provision a provider. Any non-`memory` value must fail closed with an approval-required adapter error instead of silently enabling Redis, Upstash, Vercel KV, Postgres/Supabase, Cloudflare KV, Edge Config, or another paid/external store.

## Evidence added

- `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts` enumerates common durable provider names (`redis`, `upstash`, `vercel-kv`, `kv`, `postgres`, `supabase`, `edge-config`, `cloudflare-kv`) and asserts each is rejected by `getConfiguredRateLimitStorageProvider()` with the approval-required adapter error.
- The same guard statically checks `src/lib/middleware/rateLimiter.ts` still imports the memory limiter deep path and does not import known durable rate-limiter adapters.
- The guard also checks `package.json` does not declare known durable limiter SDK dependencies such as `@upstash/redis`, `@vercel/kv`, `redis`, or `ioredis`.
- The guard links the executable code seam back to `reports/home-match-revival/phase0-phase1-closure-matrix.md`, so the production gate cannot drift into looking closed without preserving the owner/ops approval language.

## Current decision state

D2 remains blocked for production durability. Repo-local evidence is stronger because the approval gate is now explicit and tested against multiple plausible provider names/packages, but production still needs one of these owner decisions before launch-grade signoff:

1. Accept in-memory-only rate limiting as a documented production risk/exception.
2. Choose and provision an approved durable provider.
3. Implement and test the approved adapter behind the existing seam.

## Non-goals

- This does not choose Redis, Upstash, Vercel KV, Postgres/Supabase, Cloudflare KV, or any other durable store.
- This does not install packages, change provider configuration, mutate env/secrets, or call external services.
- This does not claim multi-instance production enforcement is closed.
