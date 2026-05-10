# D9 — Local Seeded Auth Lifecycle Harness Readiness Guard

- Date: 2026-05-08
- Branch: `claude/d9-auth-harness-1731`
- Worker: bounded HomeMatch P0/P1 worker (no installs, no live Supabase, no remote mutation)

## Why

`scripts/run-local-seeded-auth-lifecycle.js` is the only sanctioned wrapper for
the local seeded auth lifecycle smoke (`pnpm test:e2e:auth-lifecycle:local`).
The wrapper already had safe-default skip behavior, single-worker enforcement,
and loopback URL normalization (commit 7c513d7). But its readiness contract was
only enforced statically — the existing tests asserted that certain strings
appeared in the source, not that the wrapper actually behaves safely when
invoked with no local server/session, no service role key, and no documentation
crumb to follow.

This slice closes three readiness gaps without expanding scope:

1. **Documented setup pointer in every skip/error message.** Operators who hit
   the safe-default skip should see exactly which command(s) to run before
   retrying, instead of vague "start the local server" hints.
2. **Behavioral proof of safe skip.** Spawn the wrapper in a hermetic env (no
   `SUPABASE_SERVICE_ROLE_KEY`, no `.env*` inheritance) and assert it exits 0
   with the documented `SKIP:` line — never reaching network probes, the seed
   step, or Playwright.
3. **Behavioral proof of strict failure.** With
   `LOCAL_SEEDED_AUTH_LIFECYCLE_STRICT=true`, the same hermetic invocation must
   exit 1 with `ERROR:` on stderr — same documented hint, no secret-shaped
   leakage.

## What changed

### `scripts/run-local-seeded-auth-lifecycle.js`

- Added a `SETUP_DOCS_HINT` constant pointing at `docs/SETUP_GUIDE.md`,
  `pnpm dlx supabase@latest start` (with the documented service exclusions),
  and `pnpm test:setup-users` (which delegates to
  `scripts/setup-test-users-admin.js`).
- `failOrSkip()` now appends the hint to every skip/error message so the
  operator can copy/paste the next step from the wrapper output alone.
- No new env reads, no new logging of env values, no new network IO.

### `__tests__/unit/scripts/run-local-seeded-auth-lifecycle.test.ts`

Extended the existing static guard suite with four additional cases:

- **Static — documented setup pointer.** Asserts the source contains
  `SETUP_DOCS_HINT`, `pnpm test:setup-users`,
  `scripts/setup-test-users-admin.js`, and `docs/SETUP_GUIDE.md`.
- **Static — no secret interpolation in logs.** For each of
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the three `TEST_USER_*_PASSWORD`
  variables, asserts no `${...process.env.<name>...}` template interpolation
  appears anywhere in the script.
- **Behavioral — safe skip.** Spawns `node scripts/run-local-seeded-auth-lifecycle.js`
  with a hermetic env (only `PATH`, `HOME`, `LOCAL_SUPABASE_URL`,
  `BASE_URL`). Asserts:
  - exit code 0
  - stdout contains `[local-seeded-auth-lifecycle] SKIP:`
  - stdout contains `SUPABASE_SERVICE_ROLE_KEY is absent`
  - stdout contains `pnpm test:setup-users` and `docs/SETUP_GUIDE.md`
  - combined stdout/stderr contains no JWT-shaped strings (`/\beyJ[A-Za-z0-9_-]{10,}/`)
  - combined stdout/stderr contains none of the seeded-user default passwords
- **Behavioral — strict failure.** Same hermetic invocation with
  `LOCAL_SEEDED_AUTH_LIFECYCLE_STRICT=true`. Asserts exit 1, stderr contains
  `[local-seeded-auth-lifecycle] ERROR:` and `pnpm test:setup-users`, and no
  JWT-shaped string appears.

The hermetic spawn does not inherit the parent test process env, so no real
secrets are ever in scope for the wrapper's child process — the secret-leak
assertion is a defense-in-depth check, not a load-bearing one.

## What this is _not_

- Not a fix for the underlying lifecycle smoke (`auth-lifecycle-local-seeded.spec.ts`),
  which still requires a real local Supabase + Next.js dev server to exercise
  end-to-end. That is out of scope here and remains documented in the existing
  P0/P1 closure plan.
- Not a change to the wrapper's network probes, single-worker enforcement, or
  remote-Supabase refusal — those were already in place and stay green via the
  pre-existing four guards.
- Not a change to `scripts/setup-test-users-admin.js`, which retains its own
  remote-Supabase guard and `SETUP_TEST_USERS_REDACT_OUTPUT` opt-in for log
  redaction.

## Verification

Targeted Jest suite, run under `systemd-run --quiet --user --scope` with memory
and CPU quotas:

```
PASS __tests__/unit/scripts/run-local-seeded-auth-lifecycle.test.ts
  ✓ defaults missing prerequisites to skip instead of infrastructure startup or remote mutation
  ✓ refuses non-local app and Supabase URLs before seeding users
  ✓ checks for an existing local app and local Supabase before launching Playwright
  ✓ runs the lifecycle with a single worker against normalized loopback URLs
  ✓ points operators at the documented seeded-user setup in skip/error output
  ✓ never interpolates secret-shaped env values into log output
  ✓ skips safely with exit 0 and a documented setup pointer when the local session is absent
  ✓ exits non-zero in strict mode without leaking secret-shaped values

Tests: 8 passed, 8 total
```

`pnpm type-check` was also run under `systemd-run` after the edits and passed
without errors against the touched test file.

## Next obvious slice (not done here)

- Wire a similar safe-skip + documented-pointer pattern into the integration
  variant once `scripts/run-local-seeded-auth-lifecycle.js` graduates to
  driving against a real Supabase stack in CI; today it remains local-only by
  design.
- Cross-link this guard from `docs/TESTING.md` so operators land on the same
  doc the wrapper now points to.
