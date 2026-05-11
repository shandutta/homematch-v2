# Remote Supabase Test Seed and Auth Probe

Generated: 2026-05-08T15:36:00Z
Task: `t_f4adcfd7`
Repo: `/home/shan/projects/homematch-v2`
Branch: `autonomy/6h-business-hardening`

## Target

| Target                      | Value                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase host               | `lpwlbbowavozpywnpamn.supabase.co`                                                                                                          |
| Supabase project ref        | `lpwlbbowavozpywnpamn`                                                                                                                      |
| App probe domain            | `http://127.0.0.1:3100` local Next.js dev server, configured against the remote Supabase project                                            |
| Existing port 3000 listener | Not HomeMatch. It was a Vite process from `/home/shan/hermes-workspace`, so HomeMatch probes were moved to port 3100.                       |
| Vercel metadata             | No repo-local `.vercel` project metadata found and the local `vercel` CLI was not authenticated; no Vercel dashboard/API changes were made. |

## Secret handling

- Used existing `.env.local` values already present in the repo workspace.
- Verified presence and target metadata only: Supabase URL host/project ref and key presence/length checks.
- Did not print Supabase anon key, service-role key, bearer tokens, user passwords, 1Password session tokens, or raw `.env.local` contents.
- 1Password was not needed for this run because `.env.local` already contained the needed remote Supabase values.

## Seeded/verified users and fixtures

Seed command used `scripts/setup-test-users-admin.js` with remote override and redacted output. It deletes/recreates only the script's test accounts, then upserts matching `user_profiles` and the gallery seed fixture.

Seeded auth users verified by email:

- `test1@example.com`
- `test2@example.com`
- `test3@example.com`
- `test-worker-0@example.com`
- `test-worker-1@example.com`
- `test-worker-2@example.com`
- `test-worker-3@example.com`
- `test-worker-4@example.com`
- `test-worker-5@example.com`
- `test-worker-6@example.com`
- `test-worker-7@example.com`

Fixture verified:

- Property seed `zpid=dev-100014`, address `908 Gallery Ln`, San Francisco, CA
- `test1@example.com` has a seeded like for that gallery property

## Commands run

All commands were run from `/home/shan/projects/homematch-v2`. Secret-bearing env values and bearer tokens were passed through process env or loaded from `.env.local`; values are redacted here.

```bash
# Workspace/resource precheck
free -h
df -h /
git status --short
git branch --show-current

# Secret-safe env metadata check: printed only host, present/missing, and lengths
python3 - <<'PY'
# parsed .env.local and printed only Supabase host plus key presence/length metadata
PY

# Seed remote Supabase test users/fixtures with credential output redacted
SETUP_TEST_USERS_REDACT_OUTPUT=true \
ALLOW_REMOTE_SUPABASE=true \
AUTH_READY_ATTEMPTS=3 \
AUTH_READY_DELAY_MS=1000 \
node scripts/setup-test-users-admin.js

# Start low-scope local app server against remote Supabase on a non-conflicting port
SKIP_SUPABASE_GUARD=true \
NEXT_PUBLIC_TEST_MODE=false \
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3100 \
pnpm exec next dev --hostname 127.0.0.1 --port 3100

# API auth smoke: script signed in test1@example.com, kept bearer token in env, and ran the existing Vitest matrix
API_AUTH_SMOKE_RUN=1 \
API_AUTH_SMOKE_TOKEN='[redacted bearer token]' \
TEST_API_URL=http://127.0.0.1:3100 \
pnpm exec vitest run __tests__/integration/api/auth-smoke-matrix.spec.ts

# Manual low-memory Playwright probe: one Chromium instance, one page, no parallel browser swarm
node - <<'NODE'
// opened /login, signed in test1@example.com, traversed protected pages, printed only paths/text excerpts
NODE

# Final seed verification: admin listUsers/profile/property checks, printed only emails and non-secret fixture metadata
node - <<'NODE'
// loaded .env.local, used service role client, printed project ref, seeded emails, profile count, and fixture metadata only
NODE
```

## Pass/fail matrix

| Area                               | Probe                                                                            | Result        | Evidence                                                                                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resource pressure                  | `free -h`, `df -h /`                                                             | PASS          | 15 GiB RAM, 13 GiB available, 2 GiB swap free, root filesystem 19% used.                                                                                                                                                   |
| Supabase credential metadata       | `.env.local` metadata parse                                                      | PASS          | `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` point at `lpwlbbowavozpywnpamn.supabase.co`; service-role and anon keys present.                                                                                             |
| Remote Supabase admin reachability | `setup-test-users-admin.js` auth readiness                                       | PASS          | Auth service ready after 1 attempt.                                                                                                                                                                                        |
| Remote test-user seed              | `setup-test-users-admin.js`                                                      | PASS          | 11 expected test auth users verified by email; 11 matching profiles verified. Password output was redacted.                                                                                                                |
| Gallery fixture seed               | admin verification                                                               | PASS          | `dev-100014` / `908 Gallery Ln` exists; setup also attempts/upserts a test1 like.                                                                                                                                          |
| Local HomeMatch app server         | Next dev on `127.0.0.1:3100`                                                     | PASS          | `/login` returns 200; `/api/couples/activity?limit=1&offset=0` returns 401 anonymously.                                                                                                                                    |
| Existing app port assumption       | Probe `127.0.0.1:3000`                                                           | FAIL/AVOIDED  | Port 3000 was a Vite process from `/home/shan/hermes-workspace`; an initial smoke against it failed with anonymous 200 instead of 401, proving it was not the target HomeMatch server.                                     |
| API auth smoke matrix              | Existing `__tests__/integration/api/auth-smoke-matrix.spec.ts` against port 3100 | PASS          | 3 tests passed. Anonymous/authenticated statuses: `/api/couples/activity?limit=1&offset=0` 401/200; `/api/couples/mutual-likes?includeProperties=false` 401/200; `/api/couples/stats` 401/404.                             |
| UI login lifecycle                 | Manual single-page Chromium probe                                                | PASS          | `test1@example.com` login succeeds and lands on `/dashboard` or returns to `/couples` after form submission.                                                                                                               |
| Authenticated route traversal      | Manual single-page Chromium probe                                                | PASS          | Authenticated `/dashboard`, `/couples`, `/settings`, and `/profile` all load without redirecting to `/login`; `/settings` shows account email `test1@example.com`; `/profile` shows `test1@example.com`.                   |
| Anonymous protected route behavior | Curl and manual Chromium probes                                                  | PARTIAL/ISSUE | Anonymous `/settings` and `/profile` issue 307 redirects to `/login`; anonymous `/dashboard` and `/couples` return 200. If `/dashboard` and `/couples` should be strictly private, this remains a routing/auth-policy gap. |
| Browser console errors             | Manual single-page Chromium probe                                                | PASS          | No browser console errors observed in the final protected-route traversal.                                                                                                                                                 |

## Cleanup / reseed instructions

To reseed the same remote test users and fixtures, run from the repo root with the same approved remote Supabase env loaded:

```bash
SETUP_TEST_USERS_REDACT_OUTPUT=true \
ALLOW_REMOTE_SUPABASE=true \
node scripts/setup-test-users-admin.js
```

The script deletes and recreates only these test users before re-upserting profiles: `test1@example.com`, `test2@example.com`, `test3@example.com`, and `test-worker-0@example.com` through `test-worker-7@example.com`.

Manual cleanup, if needed, should be limited to those auth users plus the `dev-100014` test fixture/like. Do not run broad production-data deletes unless Shan separately approves them.

## Remaining blockers / follow-ups

1. Vercel project/domain metadata is not available locally through `.vercel` or an authenticated `vercel` CLI session. This did not block local-app-to-remote-Supabase auth closure, but a future Vercel-specific probe needs either repo linkage or an authenticated Vercel token/session.
2. Anonymous `/dashboard` and `/couples` return 200 on the local Next.js app, while `/settings` and `/profile` redirect to `/login`. Decide whether `/dashboard` and `/couples` are intentionally public/soft-gated or should be added to strict protected-route enforcement.
3. Existing `auth-lifecycle-local-seeded.spec.ts` is intentionally local-Supabase-only. This run used a manual remote-safe Playwright probe instead of changing the harness. If remote Supabase lifecycle closure becomes recurring, add an explicit `ALLOW_REMOTE_*` harness path with loud test-environment safeguards and redacted token handling.
