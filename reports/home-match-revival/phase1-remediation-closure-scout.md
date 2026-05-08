# Phase 1 Remediation Closure Scout

Generated: 2026-05-08T01:16:05Z  
Lane: `/home/shan/projects/homematch-v2.worktrees/p3-backend`  
Scope: strict OG Phase 1 closure only; no P2/P3/P4/P5 dispatch; no application-code changes in this scout.

## Verdict

**Phase 1 cannot be called 100% complete.**

Reason: Phase 1 audit artifacts exist and several P0/P1 repairs are evidenced by commits/tests, but the remediation backlog is still materially open. In particular: service-role RBAC remains placeholder-grade, interaction uniqueness is not fixed, several DB P1/P2 items are untouched, and most middleware/API/dead-code recommendations remain open.

Status key: **closed** = implemented/tested or explicitly no-op; **open** = not implemented yet; **block** = needs product/security/ops decision, integration environment, or scoped child task before safe closure.

## Evidence baseline reviewed

- OG plan: `/home/shan/.hermes/plans/home-match-kanban-goal-template.md`
- Phase gate correction: `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`
- Reconciliation: `reports/home-match-revival/phase0-phase1-reconciliation.json` states Phase 1 = `audit_complete_repair_gates_complete_remediation_incomplete`.
- Repair gates: `reports/home-match-revival/p1-repair-gates.json`
- Audits: `auth-audit.md`, `db-architecture-recommendation.md`, `p1-middleware-api-audit.json`, `vercel-localdev-docker-decision.md`, plus DB sub-audits.
- Git evidence: recent commits include `cad54c9`, `55fa13d`, `41ca064`, `be976ae`, `2d9672b`, `9ab76bf`, `b67826c`.
- Test evidence recorded in `p1-repair-gates.json`: guard, maps route tests, type-check, lint, build, and `pnpm test:unit -- --runInBand` 1547/1547 passed.

## Auth audit closure matrix

| Item | Evidence present | Status | Exact next action |
| --- | --- | --- | --- |
| A1 P0: Supabase auth cookies must be `httpOnly: true` | Commit/test evidence: `2d9672b test: extend Supabase cookie hardening coverage`; `src/lib/supabase/cookie-options.ts` forces `httpOnly: true`; tests `__tests__/unit/lib/supabase/cookie-options.test.ts`, `server-cookie-options.test.ts`, `middleware.test.ts`. | closed | None; keep cookie tests in required gate. |
| A2 P0: Maps autocomplete paid API must require auth | `p1-repair-gates.json` lists Maps paid API auth hardening; files `src/app/api/maps/geocode/route.ts`, `src/app/api/maps/places/autocomplete/route.ts`; route tests passed 33/33. | closed | None for Phase 1; keep no paid live API probing without approval. |
| A3 P0: Service role authorization placeholder must become real RBAC | `auth-audit.md`; code still checks `user_profiles.role === 'admin'` in `server.ts`; commit `cad54c9` gates `service-role-client.ts` through `createServiceClient()`, but does not replace RBAC model. | block | Define admin authority source (custom claims vs dedicated admin table), migrate/check it, then update `checkServiceRoleAuthorization()` and tests. |
| A4 P1: Consolidate dual Supabase client creation paths | `auth-audit.md`; `factory.ts`, `server.ts`, and `client.ts` all remain present; package/code spot-check shows factory path still exists. | open | Choose canonical path and delete/deprecate the other with migration tests. |
| A5 P1: Remove factory `createServerClientAsync()` stub | `auth-audit.md`; no closure commit found. | open | Delete the dead stub and run Supabase factory tests/type-check. |
| A6 P1: Replace/accept in-memory rate limiter | `auth-audit.md`; `src/lib/utils/rate-limit.ts` still in use; no durable limiter evidence. | block | Decide dev-only acceptance vs Upstash/Vercel KV; if production-grade is required, implement durable store and tests. |
| A7 P1: Remove interactions API service-role fallback | `auth-audit.md`; no closure evidence found. | open | Fix RLS/JWT household lookup and remove service-role fallback; add interaction route regression test. |
| A8 P1: Flatten duplicate `getUser` monkey-patching in auth server client | `auth-audit.md`; no closure evidence found. | open | Refactor patching order in `src/lib/supabase/server.ts`; rerun auth helper and middleware tests. |
| A9 P1: Clean unused/noisy `AuthApiError` import | Search shows `AuthApiError` is used in `server.ts` and `client.ts`; no unused import remains for this item. | closed | None. |
| A10 P2: Add E2E auth lifecycle test | `auth-audit.md`; no Playwright auth lifecycle closure evidence. | open | Add login/signup/protected-route/logout E2E using approved test-user pattern. |
| A11 P2: Align password requirements | `supabase/config.toml` still has `minimum_password_length = 6`, `password_requirements = ""`; app schema requires stricter password. | open | Change Supabase config to match app schema, then run auth/config tests. |
| A12 P2: Enable email confirmations for production | `supabase/config.toml` still has `enable_confirmations = false`. | block | Decide launch auth policy; enable confirmations for production config or document dev-only override. |
| A13 P2: Configure CAPTCHA for signup | `supabase/config.toml` CAPTCHA section still commented. | block | Choose Turnstile/hCaptcha provider and configure secrets through approved channel. |
| A14 P2: Avoid cached service clients after key rotation | `auth-audit.md`; `factory.ts` still caches service clients. | open | Exclude service-role clients from factory cache or delete factory service path during consolidation. |

## DB architecture/remediation matrix

| Item | Evidence present | Status | Exact next action |
| --- | --- | --- | --- |
| DB P0.1: Fix properties RLS policy overlap leak | Commit `41ca064`; migration `20260508003500_fix_properties_public_select_policy.sql`; test `property-rls-policy-migration.test.ts`. | closed | Run DB reset/lint in integration environment before production deploy. |
| DB P0.2: Harden 13 SECURITY DEFINER search paths | Commit `be976ae`; migration `20260508001000_harden_security_definer_search_paths.sql`; test `security-definer-search-path-migration.test.ts`. | closed | Run `supabase db reset`/lint when local Supabase is available. |
| DB P0.3: Add `listing_status` CHECK | Commit `b67826c`; migration `20260507225000_add_schema_safety_constraints.sql`; test `schema-safety-migration.test.ts`. | closed | Validate constraints against real/current rows before `VALIDATE CONSTRAINT`. |
| DB P0.4: Fix interaction UNIQUE to `(user_id, property_id)` | Commit pending in this closure wave; migration `20260508015000_fix_interaction_uniqueness.sql` deduplicates existing rows, drops `user_property_interactions_user_id_property_id_interaction_type_key`, and adds `user_property_interactions_user_id_property_id_key`; test `interaction-uniqueness-migration.test.ts`. | closed | Run DB reset/lint in integration environment before production deploy. |
| DB P0.5: Numeric sanity checks on price/bed/bath/sqft | Commit `b67826c`; migration adds price/square-feet checks, but bedrooms/bathrooms are `>= 0`, while audit target said `1-50`. | block | Decide allowed zero-bed/zero-bath semantics; tighten to audit target or document accepted relaxation and test it. |
| DB P0.6: Household FK orphan risk | Commit `b67826c`; migration sets `user_profiles.household_id` FK `ON DELETE SET NULL`; test `schema-safety-migration.test.ts`. | closed | Validate FK after data cleanup. |
| DB P1.1: Replace `getPropertyStats()` full-table app aggregation | Commit `55fa13d`; migration `20260508000000_add_property_stats_rpc.sql`; tests `property-stats-rpc.test.ts`, `property-stats-rpc-migration.test.ts`. | closed | DB reset/lint before deploy. |
| DB P1.2: Add query deduplication for duplicate searches | `db-architecture-recommendation.md`; no closure evidence found. | open | Add service-boundary request dedupe and tests around dashboard duplicate calls. |
| DB P1.3: Fix CouplesRealtime N+1 via server-side RPC | `db-architecture-recommendation.md`; `couples-realtime.ts` still performs per-event profile/property lookups. | open | Create RPC/payload shape to send enriched mutual-like data; update realtime tests. |
| DB P1.4: Add DOWN scripts/rollback coverage | Audit says 0/40 have rollback; new migrations do not include complete DOWN blocks. | open | Add/squash migration rollback blocks and verify reset/rollback plan. |
| DB P1.5: Add DELETE policy on `user_profiles` | Migration search found no `FOR DELETE` policy on `user_profiles`. | open | Add self-delete RLS policy and test with `auth.uid()`. |
| DB P1.6: Restrict `/api/couples/disputed` service-role profile fields | Code spot-check still selects `id, display_name, email` and returns `user_email`. | block | Decide whether email is truly required in disputed UX; otherwise restrict to id/display name or RPC-filtered output. |
| DB P1.7: Add INSERT policy on `households` | Migration search found no direct households INSERT policy closure. | open | Add `households` INSERT policy fallback and test. |
| DB P1.8: Gate or remove standalone `service-role-client.ts` bypass | Commit `cad54c9`; file now delegates to `createServiceClient()`; test `service-role-client.test.ts`. | closed | Still complete RBAC hardening under A3. |
| DB P2.1: Migration squash/consolidation | Audit checklist remains unchecked; no squash commit. | block | Defer until P0/P1 DB fixes are fully landed and DB reset is green. |
| DB P2.2: Add JSONB GIN indexes | Generated recommendation exists; no applied migration found for `20260507220300...`. | open | Add GIN indexes on `preferences`, `score_data`, and `filters`; run migration test. |
| DB P2.3: Replace inline CouplesRealtime types | `couples-realtime.ts` still defines inline payload shape. | open | Replace with generated DB row/select types and run type-check. |
| DB P2.4: Type `DASHBOARD_PROPERTY_SELECT` | Audit item; no closure evidence found. | open | Replace raw select string with typed/select helper or generated-field coverage. |
| DB P2.5: Consolidate duplicate Supabase factories | Same as auth A4; no closure evidence. | open | Canonicalize clients and delete stale factory path. |
| DB P2.6: Add pg_trgm text-search index | No closure evidence found. | open | Add extension/index migration and test query plan if text search remains needed. |

## Middleware/API/dead-code matrix

| Item | Evidence present | Status | Exact next action |
| --- | --- | --- | --- |
| M1: Fix middleware matcher exclusions (`_next/data`, static extensions) | Commit pending in this closure wave; `middleware.ts` matcher now excludes `_next/data` and common static/metadata extensions including JS, CSS, JSON, XML, TXT, maps, and fonts; `middleware.test.ts` asserts the exclusions. | closed | None. |
| M2: Remove unused production dependencies | `package.json` still lists audited unused deps including `@ai-sdk/openai`, `ai`, `posthog-*`, `@sentry/nextjs`, `inngest`, `express-rate-limit`, `zustand`, devtools. | block | Confirm no near-term P5 analytics/LLM use should retain them; then remove and run install/build. |
| M3: Add Cache-Control headers to GET API endpoints | Closed for successful GET route classification: static coverage now verifies dynamic JSON routes use `noStoreJson`, health has explicit no-store, and public map assets have explicit `public, max-age=3600`. Covered admin generate-vibes GET, maps script, performance metrics, random image, authenticated/user-specific routes, health, metro-boundaries, and proxy-script. | closed | Error-response cache policy can be handled under API error standardization (M6), not as an M3 successful GET blocker. |
| M4: Add CORP/COOP headers | Commit `9ab76bf`; `middleware.ts` has `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`; middleware tests. | closed | None. |
| M5: Add rate limiting to unprotected POST/admin routes | Closed repo-only coverage: route-scoped limiter checks now cover authenticated couples notify, couples disputed PATCH, interactions DELETE, performance metrics POST by IP, and admin cron-secret endpoints via `rateLimitAdminRoute`. Static Jest coverage verifies all identified M5 routes. | closed | Durable production limiter storage is a separate M10/ops decision; no Phase 1 repo-code blocker remains for M5 coverage. |
| M6: Standardize API error handling | Search shows many `NextResponse.json` paths remain; only some use `ApiErrorHandler`. | open | Either migrate routes to `ApiErrorHandler` or document intentional error schemas per route. |
| M7: Add AbortController to middleware `withTimeout()` | `middleware.ts` still uses `Promise.race` without aborting Supabase fetch. | open | Refactor with AbortController or Supabase fetch override; test timeout cleanup behavior. |
| M8: Add timeouts to external-call routes | Audit identified admin/maps/neighborhood/property vibe routes; no broad closure evidence. | open | Wrap all Zillow/OpenAI/Google calls with timeout helper and tests. |
| M9: Remove dead server actions | `src/lib/supabase/actions.ts` still exists with login/signup exports. | open | Remove or wire into forms; run auth tests. |
| M10: Consolidate duplicate rate-limit systems | Both `withRateLimit` and `apiRateLimiter` are still imported by production routes. | open | Pick one limiter abstraction and migrate all routes/tests. |
| M11: Move/guard test-only exports in production code | Audit item; no closure evidence found. | open | Move `__*` and reset helpers to test utilities or guard by NODE_ENV. |
| M12: Remove dead RPC wrapper `callRPC` | Audit item; no closure evidence found. | open | Delete duplicate wrapper or prove usage; run type-check. |
| M13: Remove/wire dead `createZillowClient` factory | Audit item; no closure evidence found. | open | Delete factory or switch routes to it; run Zillow unit tests. |
| M14: Remove/wire `CouplesMiddleware` unused class | Audit item; no closure evidence found. | open | Delete or wire into couples routes with tests. |
| M15: Resolve test-only geo utilities / unused coordinate utilities / stale TODOs | Audit item; no closure evidence found. | open | Move test-only utilities or delete stale exports/TODOs in scoped cleanup. |

## Vercel / local-dev / Docker matrix

| Item | Evidence present | Status | Exact next action |
| --- | --- | --- | --- |
| V1: Vercel config requires no change | `vercel-localdev-docker-decision.md` says ZERO changes; no conflicting evidence. | closed | None. |
| V2: Add `SKIP_SUPABASE_GUARD=true` bypass | `p1-repair-gates.json`; `AGENTS.md` documents commands; guard verification passed. | closed | None. |
| V3: Create sanitized `.env.prod` | Recommended in audit; no tracked evidence expected/found. | block | Create sanitized local/secret-handled `.env.prod` through approved secrets process; do not commit secrets. |
| V4: README documents Docker optional / default fast dev | Audit recommended README; `AGENTS.md` updated, README closure not evidenced. | open | Update README in docs phase/closure lane and verify no secret leakage. |
| V5: Verify `ALLOW_REMOTE_SUPABASE` integration-runner path | Audit marked future/P2/P3; no Phase 1 closure evidence. | block | Keep held until Phase 1 blockers are resolved; if needed for Phase 0/1 test closure, create a scoped test-infra task. |
| V6: Docker optional, no Dockerfile/docker-compose needed | Audit says optional; no Docker app deployment files needed. | closed | None. |

## Closure rollup

- Closed: Auth cookie hardening, Maps auth hardening, Vercel no-op, local dev guard bypass, Docker optional decision, CORP/COOP headers, DB RLS policy overlap migration, SECURITY DEFINER search-path migration, property stats RPC, service-role-client bypass gate, part/all of schema safety constraints.
- Open: Most middleware/API hardening and dead-code cleanup; auth client consolidation; auth config hardening; DB interaction unique constraint; DB P1/P2 performance/RLS/migration cleanup; README closure.
- Blocked: True service-role RBAC model, production auth policy choices (email/CAPTCHA), durable rate-limiter decision, `.env.prod` secret handling, DB numeric-constraint semantics, and integration DB reset/lint environment.

## Final Phase 1 gate answer

**No — Phase 1 is not 100% complete.** It is audit-complete with multiple evidenced repairs, but remediation closure is incomplete. Phase 2/3/4/5 must remain held under the corrected strict OG gate until the open/block items above are resolved or explicitly re-scoped by Shan.
