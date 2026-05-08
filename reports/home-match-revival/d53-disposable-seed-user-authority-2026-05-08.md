---
title: HomeMatch Disposable Seeded Test-User Authority
date: 2026-05-08
scope: Phase 0/1 doc slice. Names the single in-repo source of truth for local seeded test users and the disposable authority over local Supabase test data, so bounded P0/P1 workers can reason about test-account identity and reset blast radius without touching credentials.
non_goals: Does not run seeding, reset Docker or Supabase, mutate any local or remote project, print credentials, change scripts, or alter env files.
---

# HomeMatch Disposable Seeded Test-User Authority, 2026-05-08

## Verdict

The repo already has one authoritative seeder for local test users, one authoritative DB seed file, one authoritative Playwright fixture for primary test-user identity, and one disposability contract: every local Supabase reset wipes those accounts and recreates them from the same script. No worker should invent new test users, copy passwords into reports, or seed remote Supabase from a bounded lane.

This report is documentation only. No commands run beyond the file reads needed to write it.

## Source of truth

| Concern | Authoritative file | What it owns |
| --- | --- | --- |
| Local test-user identity (emails + worker accounts) | `scripts/setup-test-users-admin.js` | Hard-coded list of local test users (`test1@example.com`, `test2@example.com`, `test3@example.com`, plus `test-worker-0..7@example.com`), plus the special-case `test3@example.com` non-onboarded profile and the `dev-100014` gallery-like seed for `test1@example.com`. |
| Local DB row fixtures | `supabase/seed.sql` | Neighborhoods, properties, and other static rows applied by `supabase db reset`. |
| Playwright primary user identity | `__tests__/fixtures/config.ts` | The `users.user1` / `users.user2` objects consumed by `__tests__/fixtures/auth.ts` and by tests under `__tests__/e2e/`. Emails here MUST stay aligned with the seeder's first two accounts. |
| Local-only auth-lifecycle wrapper | `scripts/run-local-seeded-auth-lifecycle.js` | Refuses non-loopback Supabase URLs, pins `SUPABASE_URL`, and delegates user creation to the seeder above. |
| One-time E2E setup helper | `scripts/setup-test-users.js` and `pnpm run test:setup-users` | `pnpm run test:setup-users` is the documented developer entry point; it execs `setup-test-users-admin.js`. |

Workers must read identity from these files, not from prior chat output, not from other reports, and not from environment dumps. If a future test needs another fixture user, the change goes through `scripts/setup-test-users-admin.js` first.

## What "disposable" means here

`scripts/setup-test-users-admin.js` is built to be re-run safely against an approved local Supabase. For each account it:

1. Calls `supabase.auth.admin.listUsers()` and deletes the prior account by id if present.
2. Recreates the user with `auth.admin.createUser({ email, password, email_confirm: true })`.
3. Force-confirms the email via `auth.admin.updateUserById`.
4. Upserts the matching `user_profiles` row (with `test3@example.com` deliberately left non-onboarded with `household_id = null`).
5. Upserts the `dev-100014` gallery property and a `test1@example.com → dev-100014` like, so any UI gallery test starts with one liked photo-forward listing.

Any of the following commands are also part of the disposability contract — they are expected to wipe and rebuild the local test dataset:

| Command | What it disposes |
| --- | --- |
| `pnpm dlx supabase@latest db reset` | Drops and recreates the local Postgres, replays migrations, then runs `supabase/seed.sql`. |
| `pnpm run db:reset` (`scripts/dev-supabase-reset.js`) | Wraps `supabase start` + `supabase db reset` with retries; leaves the stack ready for re-seeding. |
| `pnpm run test:db:reset` (`scripts/infrastructure-working.js reset-db`) | The integration-test variant; same destructive intent against the local stack. |
| `pnpm run test:setup-users` | Re-runs the seeder above; safe to repeat between resets. |
| `pnpm run test:integration` (`scripts/run-integration-tests.js`) | Resets DB, seeds users, starts dev server, runs Vitest, then tears down. |

The seeder treats those eleven accounts as ephemeral fixtures, not real users. Anyone running these commands consents to losing all rows tied to those accounts. Production / shared / non-loopback Supabase is explicitly out of scope: `setup-test-users-admin.js` refuses non-local URLs unless `ALLOW_REMOTE_SUPABASE=true` (or `SUPABASE_ALLOW_REMOTE=true`) is set explicitly, and `run-local-seeded-auth-lifecycle.js` hard-fails on non-loopback URLs even with that override.

## Worker rules (Phase 0/1)

1. Reference the seeder by path; never copy emails into reports without naming the file.
2. Never print, log, screenshot, or commit the seeder's default passwords. Use `SETUP_TEST_USERS_REDACT_OUTPUT=true` if a future task ever needs to surface seeder output.
3. Do not introduce new "test-only" accounts elsewhere; extend `scripts/setup-test-users-admin.js` and `__tests__/fixtures/config.ts` together.
4. Do not run any of the disposable commands above from a worker. They mutate Docker / local Supabase state, which is operator-approved territory (see `reports/home-match-revival/test-suite-taxonomy-2026-05-08.md`, Lanes B–D).
5. Treat remote Supabase as off-limits. Even credential-redacted seeding against remote requires explicit Shan approval (see `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`).

## Cross-references

- `reports/home-match-revival/test-suite-taxonomy-2026-05-08.md` — Lane B/C/D gating that already implies these reset commands are out of bounds for workers.
- `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md` — prior approved remote seed run; documents the redaction discipline this report formalizes.
- `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md` — auth-lifecycle plan that consumes the seeded `test1@example.com` account.
- `docs/TESTING.md` and `docs/testing/fixtures.md` — developer-facing docs that already point at `pnpm run test:setup-users` and `__tests__/fixtures/config.ts`; this report is the worker-facing companion that names them as the source of truth.

## Closure note

No source files were modified, no tests were executed, no environment was started, no remote system was contacted, and no credentials were printed.
