# P1 duplicate Supabase factory consolidation closure — 2026-05-08

Scope: strict Phase 0/1 closure slice for the open `duplicate Supabase factory consolidation` item.

## Classification

- Canonical runtime clients remain:
  - `src/lib/supabase/client.ts` for browser clients.
  - `src/lib/supabase/server.ts` for server/API/service-role gated clients.
  - `src/lib/supabase/standalone.ts` for script/integration standalone service clients.
  - `src/lib/supabase/service-role-client.ts` as the shared gated service-role entrypoint.
- Removed duplicate/deprecated factory:
  - `src/lib/supabase/factory.ts` was not imported by production code and duplicated browser/server/API/service-role creation paths already covered by the canonical modules above.
  - `__tests__/unit/lib/supabase/factory.test.ts` only tested the deleted duplicate module and was removed with it.
- Retained DI/test factories are not duplicate runtime Supabase factories:
  - `DefaultSupabaseClientFactory` in `src/lib/services/base.ts` is a service-layer dependency-injection adapter around the canonical client modules.
  - `StaticSupabaseClientFactory` in `src/lib/data/loader.ts` wraps an already-created client for data loader reuse.
  - Test factories under `__tests__` are test-only fixtures.

## Guard added

Added `__tests__/unit/lib/supabase/no-duplicate-factory.test.ts` to assert:

1. `src/lib/supabase/factory.ts` remains absent.
2. Production source files do not import `@/lib/supabase/factory`.

## Verification

- `pnpm exec jest __tests__/unit/lib/supabase/no-duplicate-factory.test.ts __tests__/unit/lib/supabase/service-role-client.test.ts --runInBand` — PASS, 2 suites / 4 tests.
- `systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check` — PASS.

## Closure status

Closed for Phase 1 repo scope: duplicate runtime Supabase factory removed and static regression guard added. No deploys, paid APIs, browser swarms, broad installs, or real user data used.
