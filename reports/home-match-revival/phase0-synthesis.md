# Phase 0 Synthesis: Home Match Revival Baseline

**Generated:** 2026-05-07 12:15 PDT
**Artifacts reviewed:** repo-snapshot.json, routes-and-endpoints.json, command-baseline.json, startup-baseline.json, browser-traversal.json, api-probe-matrix.json
**Go/No-Go verdict:** CONDITIONAL GO

---

## Executive Summary

Home Match v2 is a **healthy codebase** — 1541/1541 unit tests pass, zero lint/type errors, production build clean, server responds on port 3000. The stack is modern (Next.js 15, React 19, Supabase, Vercel AI SDK + OpenRouter, Google Maps) and well-structured at 890 tracked files. Phase 0 uncovered no regressions.

However, Phase 0 revealed **two P0 blockers** that must be fixed before Phase 1, and **six significant gaps** in verification coverage. The 6-hour sprint was gated more by Hermes dispatcher throughput (2 workers exceeded 15m SLA) than by code quality issues. The Phase 1-3 plan is sound; launch it after the two blockers below are resolved.

---

## Phase 0 Coverage Summary

| Dimension                  | Coverage                             | Verdict                 |
| -------------------------- | ------------------------------------ | ----------------------- |
| Repo structure & config    | 100% — 890 files, all configs mapped | Complete                |
| Route & endpoint inventory | 100% — 29 pages, 28 APIs, 5 layouts  | Complete                |
| Local command quality      | 83% — 5/6 pass (integration skipped) | Healthy                 |
| Server startup             | Pass — root 200, health DB-connected | Working (with fallback) |
| Browser traversal          | 7% — 2/29 pages verified             | Incomplete              |
| API live probing           | 14% — 4/28 endpoints probed          | Incomplete              |
| Auth flow verification     | 0% — no login/signup traversal       | Not verified            |
| Integration testing        | 0% — requires local Supabase         | Blocked                 |

---

## Top 10 Defects

### 1. [CRITICAL] `pnpm dev` guard blocks local development with no bypass

**Affected:** Every developer who clones the repo.
**Root cause:** `scripts/guard-supabase-env.js` compares `.env.local` against `.env.prod` and blocks startup when Supabase env vars match production. There is no `SKIP_SUPABASE_GUARD`, `LOCAL_DEV`, or `ALLOW_PRODUCTION_SUPABASE` escape hatch. The `allowHosts` set only includes `127.0.0.1`, `localhost`, `supabase.local`, and `dev.homematch.pro`.
**Impact:** Workers had to bypass with raw `next dev`. Every Phase 1-3 task will need a running dev server and will hit this.
**Fix:** Add `process.env.SKIP_SUPABASE_GUARD === 'true'` check at top of guard script. Document in AGENTS.md.

### 2. [CRITICAL] Maps geocode/autocomplete accept unauthenticated POSTs — billing risk

**Affected:** `/api/maps/geocode`, `/api/maps/places/autocomplete`
**Root cause:** These endpoints have NO user authentication — only IP-based rate limiting via `rate-limiter-flexible`. Search confirmed zero `requireUserFromRequest` calls anywhere in `src/app/api/maps/`. These endpoints proxy to paid Google Maps APIs, meaning any unauthenticated caller can burn through the Google Maps quota.
**Impact:** Potential financial abuse. Google Maps API billing is per-request.
**Fix:** Add `requireUserFromRequest()` to both endpoints. These are called from authenticated pages (couples matching, property search) so the change should be non-breaking for real users.

### 3. [HIGH] Integration test suite is dead — cannot run without local Supabase

**Affected:** Entire integration test suite (Vitest, count unknown).
**Root cause:** `.env.local` points at production Supabase (`lpwlbbowavozpywnpamn.supabase.co`). Integration tests require `http://127.0.0.1:54200`. The `ALLOW_REMOTE_SUPABASE` env var is mentioned in findings but no worker confirmed it works in practice.
**Impact:** 0 integration coverage during revival. Unknown how much of the Vitest suite passes.
**Fix:** Either add `ALLOW_REMOTE_SUPABASE=true` support to `scripts/run-integration-tests.js` (allowing tests against cloud with safeguards), or spin up `supabase start` and run integration tests as a Phase 1 prerequisite.

### 4. [HIGH] API probe coverage: 14% — 24 endpoints untested

**Affected:** 24/28 API routes marked "code-expectation-only."
**Root cause:** P0.6 worker was overly conservative — several user-auth read endpoints (couples/activity, couples/mutual-likes, couples/stats, properties/vibes) needed only a test user session cookie to probe safely. The worker stalled on auth bootstrapping and the orchestrator preserved a conservative matrix.
**Impact:** Unknown whether these endpoints return 200, 500, or hang. Couples/matching endpoints in particular are core to the product.
**Fix:** Create a Phase 0.x probe harness: `scripts/create-test-user.js` → get session cookie → curl all user-auth read endpoints. This can run in under 5 minutes.

### 5. [MEDIUM] Browser traversal incomplete — 2/29 pages, no auth flow

**Affected:** All authenticated pages (dashboard, couples, properties, settings, profile).
**Root cause:** P0.5 worker got stuck on broad traversal and exceeded 15m SLA. Only landing page and cookie banner were verified.
**Impact:** We don't know if authenticated pages render. The app could fail after login and we wouldn't know.
**Fix:** Quick manual smoke test: login → dashboard → couples → properties/[id]. If passes, document in startup-baseline.json and move on. Full traversal belongs in Phase 2.

### 6. [MEDIUM] Docker dependency is undocumented but required

**Affected:** Local Supabase CLI, integration tests.
**Root cause:** No `docker-compose.yml` exists, but `scripts/ensure-docker.js` and `supabase/config.toml` require Docker for local Supabase. Without Docker, a developer cannot run integration tests or a local database.
**Impact:** Hidden dependency. First-time contributors will hit this with a cryptic error.
**Fix:** Document Docker as a prerequisite in README.md. OR remove the dependency by supporting remote Supabase in dev mode.

### 7. [MEDIUM] Test suite is large (368 files, 1541 tests) but untriaged

**Affected:** Test quality, maintenance burden, CI speed.
**Root cause:** 368 test files is substantial for a Next.js app. Likely includes tests for deleted code, redundant coverage, or tests that pass vacuously. No triage has been done.
**Impact:** Unknown test quality. Bloat slows CI and creates maintenance drag.
**Fix:** P4 task should prioritize: (a) delete tests for dead code, (b) identify gap areas (auth, matching, monetization), (c) establish coverage thresholds.

### 8. [LOW-MEDIUM] 5 cron-secret admin endpoints are fully opaque

**Affected:** `/api/admin/generate-neighborhood-vibes`, `generate-vibes`, `generate-vibes-zillow`, `ingest/zillow`, `status-refresh`
**Root cause:** All use `x-cron-secret` header authentication. No audit of secret strength, rotation policy, or what happens if the secret leaks. These endpoints trigger LLM calls (OpenRouter), Zillow API calls (RapidAPI), and DB mutations.
**Impact:** If cron secret is weak or leaked, attacker can trigger expensive operations.
**Fix:** Phase 1 auth audit should verify: (a) secret length/complexity, (b) rotation mechanism, (c) whether it's stored in 1Password or env only.

### 9. [LOW] No `.env.prod` file means guard falls back to weaker heuristics

**Affected:** `scripts/guard-supabase-env.js`
**Root cause:** The guard would be stronger with a `.env.prod` baseline for exact comparison. Without it, it uses a hardcoded fallback host list (`lpwlbbowavozpywnpamn.supabase.co`) and regex-based detection, which is less precise.
**Impact:** Lower confidence in guard accuracy. A dev pointing at a different Supabase project could be falsely blocked or falsely allowed.
**Fix:** `cp .env.local .env.prod` (sanitize secrets) to establish production baseline. Or document that `.env.prod` should be created per-environment.

### 10. [LOW] Two worker SLA failures suggest Phase 1+ tasks need chunking

**Affected:** P0.5 (browser traversal) and P0.6 (API probe) — both exceeded 15-minute artifact SLA.
**Root cause:** Broad traversal tasks are too large for a 15-minute window. The dispatcher's SLA is fine for focused tasks but too tight for "traverse everything" or "probe everything" assignments.
**Impact:** Phase 2 (full UX traversal) and Phase 3 (LLM pipeline review) may hit the same wall if not chunked into subtasks.
**Fix:** Phase 2 should be decomposed into per-page or per-section tasks. Phase 3 should split LLM audit from ingest pipeline review. Each subtask should complete an artifact in <10 minutes.

---

## Go / No-Go Decision

**VERDICT: CONDITIONAL GO for Phase 1.**

The codebase is fundamentally sound. Phase 0 demonstrated:

- Zero regressions in 1541 unit tests
- Clean lint + type-check
- Successful production build
- Responsive dev server
- Full route/endpoint inventory

**Phase 1 gates (must complete first):**

1. **Fix `pnpm dev` guard** — add `SKIP_SUPABASE_GUARD=true` bypass. Without this, every Phase 1 worker will burn time on the same workaround.
2. **Harden maps endpoints** — add `requireUserFromRequest()` to geocode and autocomplete. This is a billing-risk bug, not an enhancement.

**Recommended but not blocking:**

3. Integration test runner fix (ALLOW_REMOTE_SUPABASE or local Supabase start)
4. Auth flow smoke test (login → dashboard, 2 minutes manual)

---

## Unblock / Refactor Recommendations

### Immediate (before Phase 1 dispatch)

| #   | Action                                                        | Time   | Owner                   |
| --- | ------------------------------------------------------------- | ------ | ----------------------- |
| 1   | Add `SKIP_SUPABASE_GUARD=true` to guard script                | 5 min  | ops                     |
| 2   | Add `requireUserFromRequest()` to maps geocode + autocomplete | 15 min | backend-eng             |
| 3   | Auth flow smoke test (login → dashboard)                      | 5 min  | frontend-eng or analyst |
| 4   | Create `.env.prod` from `.env.local` (sanitize secrets)       | 2 min  | ops                     |

### Phase 1 pre-work (during Phase 1 kickoff)

| #   | Action                                                                | Time   | Delegates to                 |
| --- | --------------------------------------------------------------------- | ------ | ---------------------------- |
| 5   | Fix integration test runner — ALLOW_REMOTE_SUPABASE or supabase start | 30 min | P1 ops task (t_b08f7ec4)     |
| 6   | Create test-user probe harness for API read endpoints                 | 20 min | P1 backend task (t_124c4ac0) |
| 7   | Docker dependency decision — document or remove                       | 15 min | P1 ops task (t_b08f7ec4)     |

### Phase 2+ adjustments

| #   | Action                                             | Why                               |
| --- | -------------------------------------------------- | --------------------------------- |
| 8   | Chunk browser traversal into per-section tasks     | Avoid 15m SLA timeout             |
| 9   | Split P3 (LLM audit vs ingest pipeline)            | Different scopes, different tools |
| 10  | P4: prioritize test triage before adding new tests | Delete dead coverage first        |

---

## Phase 1 Readiness Assessment

The Phase 1 task graph (auth audit, DB audit, middleware/API audit, Vercel/local/Docker decision) is well-scoped and has the right assignees. The auth audit (t_9bc5020e) directly addresses defect #8 (cron secrets) and should incorporate findings from defects #1-2. The Docker decision task (t_b08f7ec4) should incorporate defect #6.

**Risk:** Phase 1 backend tasks (DB audit, API audit) will need to read code extensively but won't need a running server. The Vercel/local dev task will need the guard fixed first (gate #1 above).

**Recommendation:** Fix gates #1-2, then launch Phase 1. If gates aren't fixed within 30 minutes, launch Phase 1 anyway but tag t_b08f7ec4 as needing to fix the guard first.

---

## Appendix: Artifact Cross-Reference

| Artifact                  | Lines     | Key Data                                |
| ------------------------- | --------- | --------------------------------------- |
| repo-snapshot.json        | 199       | Full stack, 890 files, all configs      |
| routes-and-endpoints.json | 616       | 29 pages, 28 APIs, auth/rate taxonomies |
| command-baseline.json     | 80        | 5/6 pass, 1541 tests, build clean       |
| startup-baseline.json     | 35        | Guard blocks pnpm dev, fallback works   |
| browser-traversal.json    | 33        | 2 pages verified, SLA timeout           |
| api-probe-matrix.json     | 329       | 4 live-candidates, 24 code-only         |
| phase0-synthesis.md       | this file | Synthesis, top 10, gate decision        |
