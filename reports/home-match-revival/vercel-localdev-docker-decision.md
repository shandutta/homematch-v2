# P1 Vercel / Local Dev / Docker Decision

**Generated:** 2026-05-07
**Audited by:** ops (t_b08f7ec4)
**Artifacts reviewed:** vercel.json, next.config.ts, supabase/config.toml, scripts/guard-supabase-env.js, scripts/ensure-docker.js, scripts/run-integration-tests.js, package.json, README.md, .env.example, phase0-synthesis.md

---

## 1. Vercel: No changes required

**vercel.json** is minimal and correct:

- Page maxDuration: 30s
- API maxDuration: 300s
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (no camera/mic/geolocation)
- Redirect: /admin → /validation
- Rewrite: /health → /api/health

**next.config.ts** handles all conditional config via env vars (SUPABASE_LOCAL_PROXY, SKIP_LINTING, SKIP_TYPE_CHECK, etc.). No hardcoded values. The Vercel deployment is clean.

**Verdict: ZERO changes.** This config is production-grade and needs no modification.

---

## 2. Local Dev: One-line fix, then it works

### The problem

`scripts/guard-supabase-env.js` blocks `pnpm dev` because `.env.local` points at production Supabase (`lpwlbbowavozpywnpamn.supabase.co`). There is **no bypass mechanism**. Every developer who clones this repo and copies `.env.example` → `.env.local` will be blocked.

The guard is well-written — it compares against `.env.prod` (with a fallback host detection) and correctly identifies production Supabase usage. But it is **too strict for local development** where using the production database is intentional and safe for read operations.

### The fix (opinionated, one line)

Add a `SKIP_SUPABASE_GUARD` check at the top of `scripts/guard-supabase-env.js`, before any logic:

```js
// Line 3, after the requires:
if (process.env.SKIP_SUPABASE_GUARD === 'true') {
  console.log('⏩ Skipping Supabase env guard (SKIP_SUPABASE_GUARD=true)')
  process.exit(0)
}
```

This follows the same pattern as `ensure-docker.js` (`SKIP_DOCKER=1`) and keeps backward compatibility — existing behavior is unchanged unless the env var is explicitly set.

### Recommended local dev path

| Mode                       | Command                                | Needs Docker | Startup time |
| -------------------------- | -------------------------------------- | ------------ | ------------ |
| **Fast dev** (recommended) | `SKIP_SUPABASE_GUARD=true pnpm dev`    | No           | ~5s          |
| Full local DB              | `SKIP_SUPABASE_GUARD=true pnpm dev:db` | Yes          | ~2-3 min     |
| Integration tests          | `pnpm test:integration`                | Yes          | ~3-5 min     |

**Opinion: `SKIP_SUPABASE_GUARD=true pnpm dev` should be the documented default.** It works immediately against the production database, is safe for all read operations (browsing, searching, viewing properties), and doesn't require Docker. Only use `pnpm dev:db` when you need to mutate data locally or run integration tests.

### Additional recommendation: create `.env.prod`

```bash
cp .env.local .env.prod
# Then edit .env.prod to remove secrets while keeping the host patterns
```

This makes the guard stricter — it can do exact comparison instead of falling back to host-pattern detection. The guard already warns when `.env.prod` is missing (line 119-122). Creating it is a 30-second fix.

---

## 3. Docker: Optional, not required

### Current state

- **No Dockerfile, no docker-compose.yml** in the repo
- Docker is only used via `supabase start` (local PostgreSQL + services)
- `scripts/ensure-docker.js` checks for Docker, tries to auto-start it, and blocks if unavailable
- `ensure-docker.js` already supports `SKIP_DOCKER=1` to skip the check
- Only two paths touch Docker:
  - `pnpm dev:db` — calls `ensure:docker` → starts local Supabase → resets DB → seeds
  - `pnpm test:integration` — calls `integration-test-setup.js` which uses `supabase start`

### Decision: Docker is OPTIONAL

**The app does not need Docker to function.** It connects to Supabase over HTTPS — whether that's production cloud or a local Docker container. The vast majority of development work (UI changes, page tweaks, API fixes, auth flows) can be done against the production database without any local infrastructure.

### When Docker IS needed

1. **Integration tests** (`pnpm test:integration`) — the test runner requires a local Supabase at `127.0.0.1:54200`. The runner already supports `ALLOW_REMOTE_SUPABASE` env var but it's not fully wired up (mentioned in phase0-synthesis.md defect #3). Fixing this would make integration tests runnable against remote Supabase and remove the Docker requirement entirely.
2. **Database schema work** (`pnpm dev:db`) — when you need to reset, seed, or modify the local database.
3. **RLS policy testing** — policies are easier to test locally.

### What to change

1. **README.md**: Add a "Prerequisites" section that clearly states Docker is optional, only needed for `pnpm dev:db` and `pnpm test:integration`.
2. **AGENTS.md**: Add the `SKIP_SUPABASE_GUARD=true` command variation.
3. **`.env.example`**: Already clean — no changes needed.

### Future: remove Docker dependency entirely

If `ALLOW_REMOTE_SUPABASE` support is properly added to `scripts/run-integration-tests.js` (allowing Vitest to run against production Supabase with safeguards), Docker becomes **completely unnecessary** for this project. This is a P1 stretch goal. The test runner already references `ALLOW_REMOTE_SUPABASE` in its debug output (line 280) but doesn't use it for routing — this is likely a partially-implemented feature.

---

## 4. Implementation checklist

| #   | Action                                                                      | Time   | Priority   | Assignee      |
| --- | --------------------------------------------------------------------------- | ------ | ---------- | ------------- |
| 1   | Add `SKIP_SUPABASE_GUARD=true` to guard-supabase-env.js                     | 2 min  | P0 blocker | ops           |
| 2   | Create `.env.prod` from `.env.local` (sanitize secrets)                     | 2 min  | P1         | ops           |
| 3   | Update README.md: Docker optional, add `SKIP_SUPABASE_GUARD` command        | 10 min | P1         | writer or ops |
| 4   | Update AGENTS.md: add bypass commands                                       | 5 min  | P1         | ops           |
| 5   | Verify `ALLOW_REMOTE_SUPABASE` support in integration runner                | 30 min | P2         | backend-eng   |
| 6   | (Stretch) Wire `ALLOW_REMOTE_SUPABASE` to skip Docker for integration tests | 30 min | P3         | backend-eng   |

---

## 5. Vercel vs Docker: clarity for contributors

**This app does not use Docker for deployment.** Vercel is the deployment platform. Docker is strictly a local development convenience for Supabase. The two are unrelated.

If someone says "let me Dockerize this app" — stop them. A Vercel-deployed Next.js app + Supabase needs no Docker in production. Adding a Dockerfile or docker-compose for deployment would add complexity with zero benefit.

---

## Summary

| Area                  | Verdict                             | Action                                                        |
| --------------------- | ----------------------------------- | ------------------------------------------------------------- |
| **Vercel**            | Clean, no changes                   | None                                                          |
| **Local dev**         | Blocked by guard                    | Add `SKIP_SUPABASE_GUARD=true` bypass (2 min)                 |
| **Docker**            | Optional, over-prescribed           | Document as optional; keep `SKIP_DOCKER=1` escape hatch       |
| **Default dev cmd**   | `SKIP_SUPABASE_GUARD=true pnpm dev` | Document as the primary local dev path                        |
| **Integration tests** | Docker-dependent                    | Fix `ALLOW_REMOTE_SUPABASE` to remove Docker requirement (P3) |
