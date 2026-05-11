# Phase 0/1 Test Guard Index

Generated: 2026-05-08
Scope: read-only inventory of the **static / hermetic Jest guards** added under
`__tests__/unit/**` during the Phase 0/1 hardening stream, grouped by surface
and mapped to the integration/live lane each one still needs in order to be
fully closed. This index does not run anything, does not start a dev server,
does not touch Supabase/Docker/secrets/paid APIs/dashboards, and does not
authorize Phase 2+. It only collects the per-surface guard set in one place
so a reviewer can see what is repo-side closed today and what is still
deferred to Lane B/C/D in `test-suite-taxonomy-2026-05-08.md`.

This index is **not** a re-statement of:

- `phase0-phase1-strict-closure-gate.md` (the gate itself).
- `phase0-phase1-closure-matrix.md` (the canonical matrix).
- `p0-p1-blocker-evidence-index-2026-05-08.md` (master blocker → proof index).
- `test-suite-taxonomy-2026-05-08.md` (per-lane runner taxonomy).
- `security-evidence-index-2026-05-08.md` (security-themed report subset).

It complements those by listing every Lane A guard the recent Phase 0/1
closure stream added, so a reviewer can answer "what is statically locked in
the repo today?" without grepping commit history.

## Lane reference

All guards listed here are Lane A (hermetic Jest, no Docker, no dev server,
no real Supabase, no network) per `test-suite-taxonomy-2026-05-08.md`. Each
"integration gap" column points to the lane(s) that still need an approved
environment to be exercised — Lane B (Vitest integration + local app +
seeded Supabase), Lane C (Playwright E2E), or Lane D (live probes /
performance / remote / RLS validators).

## Index by surface

### API handler invariants (`__tests__/unit/api/`)

| Guard file                                                                                                                          | What it locks                                                                   | Integration gap                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `auth-boundary-consolidation.test.ts`                                                                                               | Couples API auth boundary uses the consolidated helper, not ad-hoc cookie reads | Lane B/D for live 401/403 matrix per `p0-p1-api-auth-smoke-matrix-2026-05-08.md` |
| `cache-control.test.ts`                                                                                                             | Couples APIs emit `no-store` cache policy                                       | Lane B for response-header capture under real Next runtime                       |
| `error-standardization.test.ts`                                                                                                     | Shared API error helpers are used and envelopes are consistent                  | Lane B for full route-family runtime envelope check                              |
| `external-timeouts.test.ts`                                                                                                         | Maps/external fetch paths register an outbound timeout                          | Lane D paid/external probe (gated by row 10 of master blocker index)             |
| `rate-limit-coverage.test.ts`                                                                                                       | Mutation API routes call the rate limiter helper                                | Lane B/D for true throughput proof (D2 provider gate)                            |
| `route-rate-limit-adoption-scan.test.ts`                                                                                            | Repo-wide scan over mutation API routes for limiter adoption                    | Same as above                                                                    |
| `generate-vibes-route.test.ts` / `ingest-zillow-route.test.ts` / `status-refresh-route.test.ts` / `maps-proxy-script.route.test.ts` | Per-route handler invariants with mocked Supabase/Next                          | Lane B/D once paid/external surface is approved                                  |
| `maps/geocode.route.test.ts` / `maps/places-autocomplete.route.test.ts`                                                             | Maps proxy route input validation + auth boundary                               | Lane D paid Maps probe (per-provider approval)                                   |

### App route policy (`__tests__/unit/app/`)

| Guard file                                                                                                                  | What it locks                                                           | Integration gap                     |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| `seo-route-policy.test.ts`                                                                                                  | SEO route metadata matches the public/no-credential policy              | Lane C1 no-auth Playwright          |
| `metadata-routes.test.ts`                                                                                                   | `robots.txt` / `sitemap.xml` / per-page metadata stay aligned           | Lane C1                             |
| `protected-page-auth-redirects.test.tsx`                                                                                    | Protected dashboard pages preserve `redirectTo` round-trip              | Lane C2 authenticated traversal     |
| `demo-surface-production-gate.test.ts`                                                                                      | Internal demo surfaces are 404 in production unless preview flag is set | Lane C1 against deployed gate       |
| `service-role-route-capability-guard.test.ts`                                                                               | Whitelist of routes allowed to use the service-role client              | Lane B for the live capability call |
| `storage-upload-policy-guard.test.ts`                                                                                       | Storage upload policy boundaries (size/type/path)                       | Lane B avatar upload spec           |
| `public-demo-listing-fixture-boundary.test.ts`                                                                              | Public/demo listing fixture field + source boundary                     | Lane B/C live render                |
| `supabase-proxy-route.test.ts`                                                                                              | Local Supabase proxy disabled by default + loopback-only when on        | Lane D local dev probe              |
| `error.test.tsx` / `global-error.test.tsx` / `not-found.test.tsx` / `login-loading.test.tsx`                                | Error/not-found/loading boundaries render the expected shape            | Lane C visual regression            |
| `api/maps/metro-boundaries/route.test.ts` / `api/maps/places-autocomplete/route.test.ts` / `api/users/avatar/route.test.ts` | Anon-client and auth gating per route                                   | Lane B with seeded Supabase         |

### Auth + RBAC (`__tests__/unit/auth/`)

| Guard file                                      | What it locks                                                                   | Integration gap                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `d1-rbac-authority-packet.test.ts`              | Service-role authority reads `admin_role_assignments`, not `user_profiles.role` | Lane B/D under approved local DB (D6-gated)           |
| `password-config-alignment.test.ts`             | App + Supabase password policy stay aligned                                     | Lane D Supabase config check                          |
| `signup-verification-policy-invariants.test.ts` | Production cannot launch with email confirmation off or CAPTCHA absent          | Lane D production config (D3 external-approval-gated) |

### Database migration shape (`__tests__/unit/database/`)

| Guard file                                       | What it locks                                                                   | Integration gap                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `admin-role-assignments-migration.test.ts`       | New authority table + RLS + DOWN companion shape                                | Lane D `db reset` against approved local Supabase (D6) |
| `migration-reset-readiness.test.ts`              | Every Phase 1 migration carries `-- DOWN:` notes + reset-replay-safe statements | Same as above                                          |
| `rollback-coverage.test.ts`                      | Each forward migration has a rollback path                                      | Same                                                   |
| `rls-policy-closure.test.ts`                     | RLS policy closure over user-scoped tables                                      | Lane D `ci:validate:rls`                               |
| `property-rls-policy-migration.test.ts`          | Properties public read policy hardening                                         | Same                                                   |
| `property-stats-rpc-migration.test.ts`           | Stats RPC migration shape                                                       | Lane D RPC integration test                            |
| `interaction-uniqueness-migration.test.ts`       | Interaction uniqueness constraint                                               | Lane B integration test under seeded data              |
| `jsonb-gin-indexes-migration.test.ts`            | JSONB GIN index migration                                                       | Lane D explain-plan check                              |
| `schema-safety-migration.test.ts`                | Schema safety constraints (NOT NULL/CHECK/etc.)                                 | Lane D `ci:validate:schema`                            |
| `security-definer-search-path-migration.test.ts` | All `SECURITY DEFINER` functions pin `search_path`                              | Same                                                   |

### Lib helpers (`__tests__/unit/lib/`)

| Guard file                                                               | What it locks                                                  | Integration gap                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `api/auth.test.ts` / `api/errors.test.ts` / `api/route-deadline.test.ts` | Shared API auth + error + deadline helpers                     | Lane B route-runtime check                                 |
| `cookies/consent.test.ts`                                                | Cookie consent helper invariants                               | Lane C visual + persistence                                |
| `middleware/rate-limiter-check.test.ts`                                  | In-memory limiter behavior + approval gate                     | Lane B/D for durable provider (D2 external-approval-gated) |
| `middleware/rate-limiter-durable-provider-guard.test.ts`                 | Non-memory provider names + SDKs remain blocked until approval | Same                                                       |
| `middleware/rate-limiter-speed.test.ts`                                  | Speed/burst handling shape                                     | Lane B integration                                         |
| `routing/protected-routes.test.ts`                                       | Protected-route registry stays canonical                       | Lane C2 authenticated traversal                            |
| `supabase/cookie-options.test.ts` / `server-cookie-options.test.ts`      | Cookie hardening (Secure/HttpOnly/SameSite) on both clients    | Lane B response-header capture                             |
| `supabase/no-duplicate-factory.test.ts`                                  | Single Supabase factory pattern, no duplicate client modules   | n/a (purely repo-static)                                   |
| `supabase/optional-user.test.ts`                                         | Optional-user helper handles unauthenticated path              | Lane B with anonymous session                              |
| `supabase/server-service-role-authorization.test.ts`                     | `checkServiceRoleAuthorization()` reads new authority table    | Lane D under approved local DB (D6)                        |
| `supabase/service-role-capability-boundary.test.ts`                      | Service-role capability boundary — call sites stay whitelisted | Same                                                       |
| `supabase/service-role-client.test.ts`                                   | Service-role client helper is gated by env + capability        | Same                                                       |

### Docs / scripts (`__tests__/unit/docs/`, `__tests__/unit/scripts/`)

| Guard file                                       | What it locks                                                                                  | Integration gap            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------- |
| `docs/env-example-guard.test.ts`                 | Local env example never embeds real secrets                                                    | n/a (repo-static)          |
| `docs/readme-local-dev.test.ts`                  | README local-dev guidance stays aligned with scripts                                           | n/a                        |
| `docs/security-evidence-index-freshness.test.ts` | Security evidence index points to real tracked files + is referenced from master blocker index | n/a                        |
| `scripts/guard-supabase-env.test.ts`             | Supabase env guard refuses misconfig + classifies categories only                              | Lane D startup wrapper run |

### Routing, realtime, security (`__tests__/unit/routing/`, `realtime/`, `security/`, root)

| Guard file                                      | What it locks                                                               | Integration gap                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `routing/no-auth-traversal-smoke-guard.test.ts` | Public no-credential route inventory + 307 expectations on protected routes | Lane C1 no-auth Playwright (row 8 of master blocker index — repo-side actionable today) |
| `realtime/couples-realtime-db-closure.test.ts`  | Couples realtime DB closure invariants                                      | Lane B realtime integration                                                             |
| `security/search-injection.test.ts`             | Search input is sanitized against injection vectors                         | Lane B with live query                                                                  |
| `middleware.test.ts`                            | Next 15 middleware proxy + matcher coverage                                 | Lane C2 authenticated traversal                                                         |

### Data + services (`__tests__/unit/data/`, `__tests__/unit/services/`)

| Guard file                                         | What it locks                                                                       | Integration gap              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| `data/dashboard-query-dedupe.test.ts`              | Dashboard query key dedupe contract — no parameter conflation, no post-success leak | Lane B real TanStack runtime |
| `data/dashboard-select-typing.test.ts`             | Dashboard `select` typing stays aligned with schema                                 | n/a                          |
| `services/properties-neighborhood-cleanup.test.ts` | Stale neighborhood cleanup logic                                                    | Lane B integration           |
| `services/property-stats-rpc.test.ts`              | Stats RPC client wrapper                                                            | Lane B with real RPC         |
| `services/supabase-rpc-types-cleanup.test.ts`      | No duplicate RPC wrapper exports                                                    | n/a                          |

### Accessibility (`__tests__/unit/accessibility/`)

| Guard file                               | What it locks                                               | Integration gap                                                      |
| ---------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `accessibility/core-flow-matrix.test.ts` | Core-flow accessibility matrix metadata for protected pages | Lane C2 authenticated traversal — see row 12 of master blocker index |

## Cross-references

- Per-lane runner rules: `reports/home-match-revival/test-suite-taxonomy-2026-05-08.md`.
- Master blocker → proof: `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`.
- Security-themed report subset: `reports/home-match-revival/security-evidence-index-2026-05-08.md`.
- Cookie/session helpers index: `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md`.
- Closure matrix + gate: `reports/home-match-revival/phase0-phase1-closure-matrix.md`,
  `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`.

## What this index does NOT do

- Does not run any test (`pnpm test`, Vitest, Playwright, perf, remote — all
  out of scope). No paid APIs invoked, no secrets read, no production data
  inspected, no live dashboards touched.
- Does not advance Phase 0/1 closure. Each "integration gap" stays gated
  exactly where the canonical artifacts above say it is gated.
- Does not replace the canonical matrix, gate, blocker reconciliation, or
  decision register.
