---
title: Phase 4 TDD Harness Design
date: 2026-05-08
scope: Design document only. No code changes, no test execution, no environment started.
---

# Phase 4 TDD Harness Design

## Verdict

The repo has ~100 Lane A unit guards and ~12 Lane B integration specs, but the test suite skews heavily toward **static-analysis guards** (presence/absence checks via `readFileSync` + regex) rather than **behavioral TDD**. Phase 4 must shift from "does this code pattern exist?" to "does this code behave correctly?" — within the constraints of the current environment gate. This design defines the harness patterns, regression guard strategy, and staged rollout plan.

## 1. Current test inventory (qualitative)

### 1.1 Test shape breakdown

| Pattern                      | Count (approx.) | Examples                                                                                                                                       | What it verifies                                                                                                                             |
| ---------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Static source guard**      | ~40             | `rate-limit-coverage.test.ts`, `rollback-coverage.test.ts`, `route-error-envelope-scan.test.ts`, `admin-role-assignments-migration.test.ts`    | Source code string/regex matching. "Does `checkRateLimit` appear in the route handler?" "Does each migration have `-- DOWN:`?"               |
| **Mocked module behavioral** | ~25             | `dashboard-query-dedupe.test.ts`, `route-deadline.test.ts`, `couples-realtime-db-closure.test.ts`, `server-service-role-authorization.test.ts` | Module-level contract tested with jest.mock. "Does the loader dedupe concurrent calls?" "Does the deadline helper return 504 after timeout?" |
| **Schema/validation**        | ~10             | `schemas/api.test.ts`, `schemas/property.test.ts`, `auth-security-policy-guard.test.ts`                                                        | Zod schema shape, regex patterns, policy invariants.                                                                                         |
| **RTL component**            | ~8              | `middleware.test.ts`, `login-redirect-open-redirect-guard.test.ts`, `no-auth-traversal-smoke-guard.test.ts`, `core-flow-matrix.test.ts`        | Component rendering under jsdom with mocked Next/Supabase.                                                                                   |
| **Doc/script invariant**     | ~8              | `env-example-guard.test.ts`, `readme-local-dev.test.ts`, `security-evidence-index-freshness.test.ts`                                           | Doc-to-repo alignment, script behavior, report cross-reference correctness.                                                                  |
| **Lane B integration**       | ~12             | `auth-smoke-matrix.spec.ts`, `no-auth-live-probe.spec.ts`, `couples-stats.spec.ts`                                                             | Vitest + real Supabase + dev server. All currently skipped or environment-gated.                                                             |

### 1.2 What's strong

- **Security boundary coverage**: every API route is statically guarded for rate limiting, error envelopes, and timeout deadlines.
- **Migration hygiene**: every Phase 1 migration has rollback and reset-replay guards.
- **Auth boundary**: service-role authorization, cookie policy, signup invariants, RBAC authority table — all have static guards.
- **Surface area audit**: route inventory, SEO policy, demo-surface gating, metadata routes — all guarded.

### 1.3 What's weak

- **Behavioral depth**: only ~25% of tests verify behavior rather than source-code presence. A malicious compliant change (e.g., `checkRateLimit(req)` that always returns `ok`) passes static guards.
- **No semantic contract tests**: no test verifies that "rate limiting actually limits" — only that the function is called.
- **Stale/obsolete tests**: the `error-standardization.test.ts` 429 guard was flagged stale after M10 consolidation. Other guards (especially pre-Phase-1 cleanup guards) may be testing code patterns that no longer exist.
- **Zero green integration lane**: all Lane B/C/D suites are environment-gated. Integration coverage is theoretical until D6 is resolved.
- **No TDD workflow**: the guard pattern is post-hoc — write code, then write a guard that says "this code exists." Not test-first.

## 2. TDD harness design for Phase 4

### 2.1 Core principle: test contracts, not code shapes

The Phase 0/1 guards proved their value by preventing regressions, but the next generation must graduate from "X is in the source" to "X behaves correctly." Every Phase 4 guard should answer one of:

- **Input/output contract**: given these inputs, this function/route returns this output.
- **Side-effect contract**: given these conditions, this function causes (or prevents) this side effect.
- **Error contract**: given this failure mode, this function surfaces this error shape.
- **Race/interleaving contract**: given concurrent calls, only one underlying operation fires.

### 2.2 Guard tiers for Phase 4

#### Tier 1: Behavioral unit guards (Lane A — runnable today)

Pattern: jest.mock the boundary, test the logic inside. Already used successfully in `dashboard-query-dedupe.test.ts` and `route-deadline.test.ts`.

Template:

```typescript
/**
 * @jest-environment node
 */
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'

// Mock the service boundary — not the implementation.
jest.mock('@/lib/services/properties', () => {
  const search = jest.fn()
  return { PropertyService: jest.fn(() => ({ search })), __mock__: { search } }
})

const { search } = jest.requireMock('@/lib/services/properties').__mock__

describe('myFeature', () => {
  beforeEach(() => {
    search.mockResolvedValue({ results: [], total: 0 })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty array when search returns empty', async () => {
    // ACT: call the function under test
    // ASSERT: output matches contract
  })

  it('surfaces search failure as typed error', async () => {
    search.mockRejectedValue(new Error('upstream timeout'))
    // ASSERT: error is caught and re-wrapped with our error envelope
  })

  it('does not call search when cache is fresh', async () => {
    // ASSERT: search mock was not called
  })
})
```

Key rules for Tier 1:

- Mock at the **service/proxy boundary** (Supabase client, maps API, Zillow client), not at the function-under-test.
- Use `jest.requireMock().__mock__` to expose mock controls (established pattern in the repo).
- `resetMocks: true` in jest.config.js STRIPS module-level `jest.fn()` implementations after the first test. All mock implementations must be set in `beforeEach`.
- Prefer `it()` blocks that test one contract each. Avoid multi-assertion "this whole flow works" tests — they're fragile.
- Always include a failure-mode test alongside the happy-path test.

#### Tier 2: Integration contract guards (Lane B — environment-gated, design-only until D6 resolved)

Pattern: Vitest + local Supabase + seeded users + dev server on localhost — test the real HTTP contract, not just the internal function.

Design rules (for when the environment is available):

- Each spec tests exactly one API route family (e.g., all CRUD on `/api/interactions`).
- Seed minimal test data in `beforeAll`; clean up in `afterAll`.
- Test the HTTP contract: status codes, response bodies, headers, redirects.
- One spec per route family keeps blast radius small.
- Use `SKIP_INTEGRATION=true` as the default guard — tests skip unless the env flag is explicitly set.

#### Tier 3: E2E critical-path guards (Lane C — further-gated)

Pattern: Playwright against a running Next.js dev server. Reserved for:

- Auth lifecycle: signup -> verify -> login -> access protected page -> logout.
- Matching flow: like property -> mutual match detected -> couple created.
- Paid/external surface: gated behind explicit approval per the paid-API rule.

Design rules:

- Maximum one E2E spec per critical user journey.
- Use `testUsers[0]` (from `scripts/setup-test-users-admin.js`) as the seeded user.
- All E2E specs must skip by default unless `E2E_RUN=1` is set.
- Never run E2E against production Supabase or paid APIs without explicit human approval.

### 2.3 Phase 0/1 regression guard strategy

The Phase 0/1 closures produced ~70 guards. Phase 4 must ensure these closures don't silently regress. Strategy:

#### Category A: Guard what's closed (verify guards still pass)

The existing ~70 Lane A guards ARE the regression harness for Phase 0/1 closures. The TDD harness for Phase 4 should:

1. **Run baseline**: execute all Lane A guards and record pass/fail.
2. **Tag guards with closure IDs**: each guard file should carry a comment linking it to the closure it protects (e.g., `// Phase 1 closure: M10 rate-limit consolidation`).
3. **Guard the guards**: add a meta-test that verifies every Phase 0/1 closure has at least one corresponding guard file.

#### Category B: Upgrade static guards to behavioral where possible

Several static guards can be upgraded to Tier 1 behavioral tests without waiting for the environment:

| Current static guard                                                    | Upgrade target                                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `rate-limit-coverage.test.ts` (verifies `checkRateLimit` appears)       | Behavioral: test that `checkRateLimit(req)` returns `{ limited: true }` after N calls within the window |
| `route-error-envelope-scan.test.ts` (verifies error patterns in source) | Behavioral: test that route handlers actually emit `ApiErrorHandler.*` error shapes                     |
| `external-timeouts.test.ts` (verifies timeout registration)             | Behavioral: test that a slow mock actually triggers the timeout response                                |
| `cache-control.test.ts` (verifies header strings in source)             | Behavioral: test that the handler's NextResponse actually carries `Cache-Control: no-store`             |
| `auth-boundary-consolidation.test.ts` (verifies auth helper import)     | Behavioral: test that unauthenticated requests to protected routes return 401 with correct error shape  |

#### Category C: Environment-gated integration verification (design only)

For closures that need live Supabase/auth (D1 RBAC, D6 DB reset, D3 signup verification):

- The integration spec shape is designed in this document (Tier 2).
- Actual execution waits for the D6 environment resolution.
- The guard files exist and skip by default — they become active the moment the environment is available.

### 2.4 Stale test detection and cleanup

Phase 4 must identify and remove tests that guard against code patterns that no longer exist. Strategy:

1. **Dead-import guard**: tests that import modules removed during Phase 1 cleanup (e.g., `@/lib/supabase/factory` — removed) will fail at import time. These are self-identifying.
2. **Referenced-file guard**: tests that `readFileSync` a path that no longer exists (e.g., old migration files) will fail. Also self-identifying.
3. **Stale-concept guard**: tests that verify patterns that were intentionally replaced (e.g., `error-standardization.test.ts` 429 guard before M10 consolidation). These need manual review — the test passes but guards an obsolete code shape.
4. **Redundant guard**: two guards covering the exact same invariant. The newer one supersedes.

Cleanup process:

- Run the full Lane A suite.
- Flag every test that references a deleted file/path.
- Flag every guard that tests a code shape known to have been replaced.
- Delete or merge. Commit with `test: remove stale Phase 0/1 guards superseded by <closure>`.

### 2.5 Test file taxonomy

Proposed structure for new Phase 4 guards:

```
__tests__/
  unit/
    auth/               # Auth contract guards (Tier 1 behavioral)
      login-flow.test.ts
      signup-validation.test.ts
      session-refresh.test.ts
    matching/           # Matching logic contract guards
      mutual-like-detection.test.ts
      couple-creation.test.ts
      match-scoring.test.ts
    api/                # Per-route contract guards (existing pattern, upgraded)
      ...
    monetization/       # Monetization gate guards
      paid-feature-gating.test.ts
      tier-resolution.test.ts
    regression/         # Phase 0/1 closure regression meta-guards
      closure-guard-coverage.test.ts   # Verifies every closure has a guard
      guard-staleness-scan.test.ts     # Flags stale guards
```

The existing `__tests__/unit/` files stay where they are — no reorg needed. New Phase 4 behavioral tests go into the new subdirectories. The `regression/` directory holds meta-guards that protect the guard suite itself.

### 2.6 TDD workflow

The "real TDD workflow" from the Phase 4 mandate means:

1. **Write the test first** (RED) — define the contract before writing implementation.
2. **Write minimal code** (GREEN) — only enough to make the test pass.
3. **Refactor** (REFACTOR) — clean up while keeping the test green.
4. **Commit the pair** — test + implementation in the same commit.

For Phase 4 work within current constraints:

```
# 1. Write a Tier 1 behavioral test (RED)
# 2. Run it to confirm failure
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% \
  pnpm exec jest __tests__/unit/.../new-test.test.ts --runInBand

# 3. Implement the fix (GREEN)
# 4. Re-run to confirm pass
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% \
  pnpm exec jest __tests__/unit/.../new-test.test.ts --runInBand

# 5. Type-check
systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% \
  pnpm type-check

# 6. Commit with hooksPath bypass (per A5)
git -c core.hooksPath=/dev/null commit -m "test: add behavioral guard for <feature>"
```

This workflow is executable today — no environment gating needed for Tier 1.

## 3. High-value test targets (prioritized)

Priority order for Phase 4 test coverage, ranked by business impact and risk:

1. **Auth lifecycle** — login redirect, session validation, token refresh, logout cleanup. Currently covered only by static guards. Needs Tier 1 behavioral: mock Supabase auth, test the middleware/auth helpers.
2. **Matching logic** — mutual-like detection, couple creation, notification trigger. Core product value. Currently only static `couples-realtime-db-closure.test.ts`.
3. **API error handling** — every API route returns consistent error shapes. Currently static scan only. Needs behavioral: mock the underlying service to throw, verify the route handler wraps it correctly.
4. **Dashboard data loading** — dedupe, select typing, neighborhood filtering. Partially covered by `dashboard-query-dedupe.test.ts`. Extend to cover cache-freshness and error-fallback behavior.
5. **Monetization gates** — paid-feature gating, tier enforcement. No coverage today. Design Tier 1 guards against a mocked feature-flag/gate system.
6. **Critical pages** — dashboard, couples, property detail, settings, household. Currently only static route-policy guards. Needs RTL behavioral: render with mocked data, verify key UI elements.

## 4. Environment dependency map

How the D6 (DB reset/lint/integration environment) resolution unlocks Phase 4:

| Without D6 (today)                              | With D6 (after resolution)             |
| ----------------------------------------------- | -------------------------------------- |
| Tier 1 behavioral (mock-based) — fully runnable | Tier 1 continues to run                |
| Meta-guards for stale detection — runnable      | Meta-guards continue                   |
| Tier 2 integration specs — designed but skip    | Tier 2 specs run against real Supabase |
| Tier 3 E2E — not designed (premature)           | Tier 3 becomes designable              |
| RLS policy behavioral validation — blocked      | RLS policies tested with real roles    |
| Migration rollback execution — blocked          | Rollback verify becomes testable       |

The TDD harness is designed so that Tier 1 provides immediate value while Tier 2/3 are ready the moment the environment gate opens.

## 5. Concrete next actions (for Phase 4 implementation workers)

1. **Stale-test audit**: run all Lane A guards, identify failures from deleted modules/paths, delete or fix.
2. **Closure-guard coverage meta-test**: create `__tests__/unit/regression/closure-guard-coverage.test.ts` that reads `phase0-phase1-closure-matrix.md` and verifies each closure has at least one guard file in the repo.
3. **First Tier 1 behavioral batch**: pick the top 3 targets from section 3 (auth lifecycle, matching logic, API error handling). Write behavioral tests that mock the boundary and verify the contract.
4. **Upgrade static-to-behavioral**: convert the first 3 candidates from section 2.3 Category B.
5. **Guard tagging**: add `// Phase 0/1 closure: <id>` comments to existing guards so the coverage meta-test can map closures to guards.

## 6. Non-goals (Phase 4 does NOT do)

- Does not run integration/E2E suites (environment-gated).
- Does not re-write or re-organize existing passing guards.
- Does not add tests for Phase 2/3 features (those phases are held).
- Does not provision Docker, Supabase, or any environment (D6 is an ops decision).
- Does not hit paid APIs, production Supabase, or external dashboards.
- Does not change the jest.config.js, vitest.config.ts, or playwright config.

## Cross-references

- `reports/home-match-revival/phase0-phase1-closure-matrix.md` — what's closed, what needs guarding.
- `reports/home-match-revival/test-command-taxonomy-2026-05-08.md` — allowed command shapes.
- `reports/home-match-revival/test-suite-taxonomy-2026-05-08.md` — lane classification (A/B/C/D).
- `reports/home-match-revival/p0-p1-test-guard-index-2026-05-08.md` — existing guard inventory by surface.
- `AGENTS.md` — project commands and conventions.
