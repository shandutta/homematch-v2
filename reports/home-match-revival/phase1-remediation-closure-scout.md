# Phase 1 Remediation Closure Scout

Generated: 2026-05-08T01:45:30Z
Lane: `/home/shan/projects/homematch-v2.worktrees/p3-backend`  
Scope: strict OG Phase 1 closure only; no P2/P3/P4/P5 dispatch; no application-code changes in this scout.

## Verdict

**Phase 1 cannot be called 100% complete.**

Reason: Phase 1 audit artifacts exist and several P0/P1 repairs are evidenced by commits/tests, but the remediation backlog is still materially open. In particular: service-role RBAC remains placeholder-grade, interaction uniqueness is not fixed, several DB P1/P2 items are untouched, and remaining middleware/API decisions and dependency cleanup remain open.

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
| A5 P1: Remove factory `createServerClientAsync()` stub | Commit pending in this closure wave; `src/lib/supabase/factory.ts` no longer contains the dead throwing stub; RED `hm-a5-a14-factory-red-1778210643.service`; GREEN `hm-a5-a14-factory-green-1778210686.service`; type-check `hm-a5-a14-factory-typecheck-1778210691.service`. | closed | Keep static regression in `__tests__/unit/lib/supabase/factory.test.ts`. |
| A6 P1: Replace/accept in-memory rate limiter | `auth-audit.md`; `src/lib/utils/rate-limit.ts` still in use; no durable limiter evidence. | block | Decide dev-only acceptance vs Upstash/Vercel KV; if production-grade is required, implement durable store and tests. |
| A7 P1: Remove interactions API service-role fallback | `auth-audit.md`; no closure evidence found. | open | Fix RLS/JWT household lookup and remove service-role fallback; add interaction route regression test. |
| A8 P1: Flatten duplicate `getUser` monkey-patching in auth server client | `auth-audit.md`; no closure evidence found. | open | Refactor patching order in `src/lib/supabase/server.ts`; rerun auth helper and middleware tests. |
| A9 P1: Clean unused/noisy `AuthApiError` import | Search shows `AuthApiError` is used in `server.ts` and `client.ts`; no unused import remains for this item. | closed | None. |
| A10 P2: Add E2E auth lifecycle test | `auth-audit.md`; no Playwright auth lifecycle closure evidence. | open | Add login/signup/protected-route/logout E2E using approved test-user pattern. |
| A11 P2: Align password requirements | `supabase/config.toml` still has `minimum_password_length = 6`, `password_requirements = ""`; app schema requires stricter password. | open | Change Supabase config to match app schema, then run auth/config tests. |
| A12 P2: Enable email confirmations for production | `supabase/config.toml` still has `enable_confirmations = false`. | block | Decide launch auth policy; enable confirmations for production config or document dev-only override. |
| A13 P2: Configure CAPTCHA for signup | `supabase/config.toml` CAPTCHA section still commented. | block | Choose Turnstile/hCaptcha provider and configure secrets through approved channel. |
| A14 P2: Avoid cached service clients after key rotation | Commit pending in this closure wave; factory `shouldCache()` now only caches browser clients, and service-role client creation is verified to produce fresh clients on repeated calls. | closed | Keep key-rotation regression in `__tests__/unit/lib/supabase/factory.test.ts`; broader A4 client consolidation remains open. |

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
| M6: Standardize API error handling | `ApiErrorHandler` now covers shared helpers plus JSON API route families: interactions, Zillow random-image, couples/vibes, paid Maps proxy, remaining couples activity/notify/disputed, admin cron/ingest/vibes, health, users/search, properties/marketing, performance/metrics, maps/script, and maps/metro-boundaries. `maps/proxy-script` intentionally returns JavaScript comment bodies because it is a script endpoint, not a JSON API. | closed | Keep regression coverage in `__tests__/unit/api/error-standardization.test.ts`; handle non-JSON script endpoint semantics separately if product requirements change. |
| M7: Add AbortController to middleware `withTimeout()` | Commit pending in this closure wave; middleware no longer uses `Promise.race` for Supabase auth timeout. It now injects an AbortController-backed Supabase fetch and clears the timeout after `getUser()` returns; regression coverage in `__tests__/unit/middleware.test.ts`; RED `hm-m7-timeout-red-1778211076.service`; GREEN `hm-m7-timeout-green2-1778211243.service`; type-check `hm-m7-timeout-typecheck2-1778211248.service`. | closed | Keep middleware timeout cleanup regression coverage. |
| M8: Add timeouts to external-call routes | Partial repo-side closure: added shared `fetchWithTimeout()` helper and adopted it for Google Maps outbound fetches in geocode, places autocomplete, and maps script proxy; regression guard `__tests__/unit/api/external-timeouts.test.ts`; RED `hm-m8-maps-red-1778214203.service`; GREEN `hm-m8-maps-green-1778214314.service`; type-check `hm-m8-maps-typecheck-1778214317.service`. | open | Continue wrapping remaining admin/Zillow/OpenAI/neighborhood/property vibe external calls before closing M8. |
| M9: Remove dead server actions | Commit pending in this closure wave; `src/lib/supabase/actions.ts` now only exports the wired `signOut` server action used by `Header` and `validation/page`; dead login/signup/Google OAuth action exports were removed; regression coverage in `__tests__/unit/lib/supabase/actions.test.ts`; RED `hm-m9-actions-red-1778211419.service`; GREEN `hm-m9-actions-green-1778211490.service`; type-check `hm-m9-actions-typecheck-1778211495.service`. | closed | If login/signup/Google server actions are needed later, wire them through actual forms with tests instead of leaving dead exports. |
| M10: Consolidate duplicate rate-limit systems | Both `withRateLimit` and `apiRateLimiter` are still imported by production routes. | open | Pick one limiter abstraction and migrate all routes/tests. |
| M11: Move/guard test-only exports in production code | Closed repo-side: removed optional-user `__isMissingSupabaseConfigError`; extracted Supabase refresh recovery into shared public helper `src/lib/supabase/refresh-recovery.ts`; removed `__withRefreshRecovery` exports from client/server; SecureMapLoader reset helper remains explicitly test-env guarded. RED/partial: `hm-m11-optional-red-1778212210.service`; optional GREEN `hm-m11-optional-green-1778212243.service`; refresh GREEN `hm-m11-refresh-green2-1778212536.service`; type-check `hm-m11-refresh-typecheck2-1778212541.service`. | closed | Keep refresh recovery tests importing the shared helper; avoid reintroducing `__*` exports in production modules. |
| M12: Remove dead RPC wrapper `callRPC` | Commit pending in this closure wave; removed the duplicate exported `callRPC` from `src/lib/services/supabase-rpc-types.ts` while preserving `createTypedRPC`/`isRPCImplemented` and canonical wrapper utilities in `src/lib/services/utils/rpc-wrapper.ts`; regression coverage in `__tests__/unit/services/supabase-rpc-types-cleanup.test.ts`; RED `hm-m12-rpc-red-1778212026.service`; GREEN `hm-m12-rpc-green-1778212063.service`; type-check `hm-m12-rpc-typecheck-1778212067.service`. | closed | Keep geographic service imports on `utils/rpc-wrapper`; do not add a second exported wrapper back to the types module. |
| M13: Remove/wire dead `createZillowClient` factory | Commit pending in this closure wave; `src/lib/api/zillow-client.ts` no longer exports the unused `createZillowClient` factory while retaining used `ZillowUtils`; regression coverage in `__tests__/unit/ingestion/zillow-ingest.test.ts`; RED `hm-m13-zillow-red-1778211731.service`; GREEN `hm-m13-zillow-green-1778211761.service`; type-check `hm-m13-zillow-typecheck-1778211766.service`. | closed | Reintroduce a factory only when production routes wire to it with tests. |
| M14: Remove/wire `CouplesMiddleware` unused class | Commit pending in this closure wave; source scan showed no production imports outside `src/lib/services/couples-middleware.ts`; removed the unused wrapper class and its dedicated test, while adding a regression guard to `__tests__/unit/services/couples.test.ts`; RED `hm-m14-couples-red-1778211904.service`; GREEN `hm-m14-couples-green-1778211926.service`; type-check `hm-m14-couples-typecheck-1778211931.service`. | closed | Reintroduce only if production routes wire side effects through it with route/service tests. |
| M15: Resolve test-only geo utilities / unused coordinate utilities / stale TODOs | Closed repo-side: stale production TODO markers in `src/lib/services/properties/neighborhood.ts` were converted into explicit intentional-fallback comments with migration-coverage criteria; regression guard `__tests__/unit/services/properties-neighborhood-cleanup.test.ts`; RED `hm-m15-neighborhood-red-1778213946.service`; GREEN `hm-m15-neighborhood-green-1778213981.service`; type-check `hm-m15-neighborhood-typecheck-1778213988.service`. | closed | Keep cleanup guard; future RPC work should land as a migration-backed feature rather than stale TODO comments. |

## Vercel / local-dev / Docker matrix

| Item | Evidence present | Status | Exact next action |
| --- | --- | --- | --- |
| V1: Vercel config requires no change | `vercel-localdev-docker-decision.md` says ZERO changes; no conflicting evidence. | closed | None. |
| V2: Add `SKIP_SUPABASE_GUARD=true` bypass | `p1-repair-gates.json`; `AGENTS.md` documents commands; guard verification passed. | closed | None. |
| V3: Create sanitized `.env.prod` | Recommended in audit; no tracked evidence expected/found. | block | Create sanitized local/secret-handled `.env.prod` through approved secrets process; do not commit secrets. |
| V4: README documents Docker optional / default fast dev | Audit recommended README; `AGENTS.md` updated, remaining local-dev validation blockers not evidenced. | open | Update README in docs phase/closure lane and verify no secret leakage. |
| V5: Verify `ALLOW_REMOTE_SUPABASE` integration-runner path | Audit marked future/P2/P3; no Phase 1 closure evidence. | block | Keep held until Phase 1 blockers are resolved; if needed for Phase 0/1 test closure, create a scoped test-infra task. |
| V6: Docker optional, no Dockerfile/docker-compose needed | Audit says optional; no Docker app deployment files needed. | closed | None. |

## Closure rollup

- Closed: Auth cookie hardening, Maps auth hardening, Vercel no-op, local dev guard bypass, Docker optional decision, CORP/COOP headers, DB RLS policy overlap migration, SECURITY DEFINER search-path migration, property stats RPC, service-role-client bypass gate, part/all of schema safety constraints.
- Open: Most middleware/API hardening and dead-code cleanup; auth client consolidation; auth config hardening; DB P1/P2 performance/RLS/migration cleanup; remaining local-dev validation blockers.
- Blocked: True service-role RBAC model, production auth policy choices (email/CAPTCHA), durable rate-limiter decision, `.env.prod` secret handling, DB numeric-constraint semantics, and integration DB reset/lint environment.

## Final Phase 1 gate answer

**No — Phase 1 is not 100% complete.** It is audit-complete with multiple evidenced repairs, but remediation closure is incomplete. Phase 2/3/4/5 must remain held under the corrected strict OG gate until the open/block items above are resolved or explicitly re-scoped by Shan.
