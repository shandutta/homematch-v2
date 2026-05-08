# P0 auth credential recovery and tiny probe plan — 2026-05-08

Task: t_88eacee6
Generated: 2026-05-08T14:03:06+00:00
Scope: read-only credential/source inspection plus approved tiny no-auth live probe. No secrets printed. No paid/prod mutation run.

## Decision

NO-GO for seeded auth lifecycle and API auth smoke right now.

GO only for the existing no-auth live probe wrapper. I ran it once and it safely skipped because no local app server was listening at `http://127.0.0.1:3000`.

The blocker is not missing repo knowledge. The blocker is environment safety: `.env.local` exists but points at a non-local Supabase URL, `pnpm run guard:supabase` blocks it, `.env.prod` is absent, and the current shell has no signed-in 1Password account/helper available to recover non-prod secrets without manual auth.

## What I confirmed

### Seeded local users

Source of truth: `scripts/setup-test-users-admin.js`.

Seed users defined there:

- `test1@example.com`
- `test2@example.com`
- `test3@example.com`
- `test-worker-0@example.com` through `test-worker-7@example.com`

Passwords are present in the script/docs as local/dev seed defaults, but are intentionally not copied here. `AGENTS.md` says to treat `scripts/setup-test-users-admin.js` as the source of truth and not store plaintext creds in `.env.local`, `.env.test.local`, or `/home/shan/.codex/config.toml`.

Behavioral notes from the seed script:

- Loads `.env.local`, then optionally `.env.test.local`.
- Uses `SUPABASE_URL`, defaulting to `http://127.0.0.1:54200`.
- Uses `SUPABASE_LOCAL_PROXY_TARGET` if set as the admin target.
- Requires `SUPABASE_SERVICE_ROLE_KEY`.
- Refuses non-local Supabase unless `ALLOW_REMOTE_SUPABASE=true` or `SUPABASE_ALLOW_REMOTE=true`.
- Deletes/recreates each seed user, confirms email, upserts `user_profiles`, and seeds one gallery like for the primary user.
- This is a destructive auth/user setup script and should only run against local/dev Supabase.

### Local seeded auth lifecycle wrapper

Source: `scripts/run-local-seeded-auth-lifecycle.js`.

It is the right wrapper for the browser auth lifecycle once local Supabase is safe. Guardrails:

- Refuses non-local `LOCAL_SUPABASE_URL` / `SUPABASE_LOCAL_PROXY_TARGET`.
- Sets `LOCAL_SEEDED_AUTH_LIFECYCLE=true`.
- Forces `PLAYWRIGHT_WORKERS=1`.
- Forces `NEXT_PUBLIC_TEST_MODE=true`.
- Pins `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` to the local URL.
- Forces `ALLOW_REMOTE_SUPABASE=false` and `SUPABASE_ALLOW_REMOTE=false`.
- Runs `scripts/setup-test-users-admin.js`, then Playwright spec `__tests__/e2e/auth-lifecycle-local-seeded.spec.ts`.

Important caveat: the wrapper pins URLs, but `scripts/setup-test-users-admin.js` still needs a service-role key matching the local Supabase instance. If `.env.local` has a remote service key, export local Supabase keys from `supabase status -o env` first so dotenv does not override them.

### Env-key presence only

`.env.local` exists and contains:

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`.env.local` does not contain:

- `SUPABASE_LOCAL_PROXY`
- `SUPABASE_LOCAL_PROXY_TARGET`
- `LOCAL_SUPABASE_URL`
- `ALLOW_REMOTE_SUPABASE`
- `SUPABASE_ALLOW_REMOTE`
- `TEST_USER_1_EMAIL` / `TEST_USER_1_PASSWORD`
- `TEST_USER_2_EMAIL` / `TEST_USER_2_PASSWORD`
- `TEST_USER_3_EMAIL` / `TEST_USER_3_PASSWORD`
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`

`.env.test.local` does not exist.

`.env.prod`, `.env.production`, and `.env.vercel` do not exist.

`.env.example` documents the required Supabase keys and optional local proxy keys.

### Current guard state

Command run:

`pnpm run guard:supabase`

Result: failed safely.

Guard output said `.env.local` looks like production because of `SUPABASE_URL_HOST` and `SUPABASE_HOST_PATTERN`. That means normal `pnpm dev`, `pnpm dev:db`, and `pnpm dev:integration` should not be run against the current `.env.local` unless the operator deliberately sets a local/proxy Supabase URL or uses the documented read-only guard skip.

### 1Password/helper availability

Command checks found:

- `op` CLI is installed at `/usr/bin/op`.
- `op whoami` returned no account found in this shell.
- `$HOME/bin/op_auth` was not executable/present in this shell.
- `$HOME/bin/auth-op-keepalive.sh` was not executable/present in this shell.

Conclusion: this worker cannot recover non-prod secrets from 1Password without a human/operator auth step or a different shell/profile where the helper exists. Do not ask future workers to print secrets. Have them export values directly into the shell/env or write a local-only env file outside tracked git if needed.

## Tiny probe actually run

Command run:

`pnpm test:no-auth-live-probes`

Result: exit 0, safe skip.

Output summary:

`[p0-no-auth-live-probes] SKIP: no local app server responded at http://127.0.0.1:3000; start the local app before running live probes.`

This wrapper is safe by design:

- Refuses non-local base URLs.
- Does not start a server.
- Does not use credentials, tokens, cookies, admin keys, cron secrets, or external API keys.
- Uses only a tiny local request matrix once a local app responds.

## Smallest safe execution sequence

### 0. Local no-auth probes

Safe once a local app server is already running:

`pnpm test:no-auth-live-probes`

If no server is running, it exits 0 with SKIP. No credentials needed.

### 1. Local seeded auth lifecycle

Do not run against current `.env.local` as-is.

Smallest safe sequence:

1. Start or verify local Supabase.

`pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime`

2. Export local Supabase env without printing values. Use `supabase status -o env` as the source, map `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` if needed.

3. Pin local URL and run the guarded wrapper:

`LOCAL_SUPABASE_URL=http://127.0.0.1:54200 pnpm test:e2e:auth-lifecycle:local`

Only proceed if the exported service-role key matches the local Supabase instance. If auth returns 401/403 at seed time, stop and refresh local keys from `supabase status -o env`.

### 2. API auth smoke

Only after the local seeded auth lifecycle is green.

Smallest safe API smoke shape:

1. Start local app against the same local Supabase env.

`SUPABASE_URL=http://127.0.0.1:54200 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54200 pnpm dev:integration`

2. In a separate shell, acquire a local user token without printing it, using `test1@example.com` and the local seed password from `scripts/setup-test-users-admin.js`.

3. Probe exactly one protected read route with bearer auth, for example:

`curl -sS -o /tmp/homematch-api-auth-smoke.json -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3000/api/couples/stats`

Expected outcome: HTTP 200 if the seeded user/session and API auth boundary are healthy. If it returns 401, the token/session is invalid. If it returns 5xx, inspect server logs before adding more probes.

Do not run remote test-user creation. Do not set `ALLOW_REMOTE_SUPABASE=true` for this sequence.

## Blockers to clear

1. Replace or override current `.env.local` Supabase values with local/proxy values before any auth lifecycle or API auth smoke.
2. Provide local Supabase service-role and anon keys from `supabase status -o env` or a signed-in 1Password/helper path, without printing them.
3. Start the local app before live no-auth probes if a real pass/fail is needed instead of safe skip.
4. Add `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` only if intentionally running the opt-in production credential check. That path currently cannot run because `.env.prod` is absent and `.env.local` lacks those keys. It should remain out of scope for this P0 local recovery unless explicitly approved.

## Bottom line

Use the repo’s existing wrappers. They are mostly the right shape. The next safe operator step is credential/environment recovery, not more probing: get local Supabase env into the shell without printing secrets, then run `pnpm test:e2e:auth-lifecycle:local`, then one bearer-token API smoke against localhost.
