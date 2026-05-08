# P1 anonymous public-page fast-path closure

Task: t_06b0f222
Timestamp: 2026-05-08T09:57Z
Repo: /home/shan/projects/homematch-v2
Branch: autonomy/6h-business-hardening
Commit: this commit

## Closure summary

Closed the Phase 1 anonymous public-page middleware fast path. Middleware now checks the host-scoped Supabase auth cookie name before constructing the Supabase SSR client; requests without that cookie return or redirect through the cheap path with security headers preserved.

## Behavior covered

- `/about` with no Supabase auth cookie returns normally with security headers and does not call `createServerClient` or `auth.getUser`.
- `/login` with no Supabase auth cookie returns normally with security headers and does not call `createServerClient` or `auth.getUser`.
- `/dashboard?tab=liked` with no Supabase auth cookie redirects to `/login?redirectTo=...` without constructing a Supabase middleware client.
- `/login` with a correctly named Supabase auth cookie still constructs the Supabase client, calls `auth.getUser`, and redirects an authenticated user to `/dashboard`.
- Protected pages with a Supabase auth cookie still use Supabase auth and redirect unauthenticated users to login.
- `/api/*` fast path behavior remains covered and unchanged.

## Files changed

- `middleware.ts`
- `__tests__/unit/middleware.test.ts`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p1-anonymous-public-page-fast-path-closure-2026-05-08.md`

## Verification

RED:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/middleware.test.ts --runInBand
```

Expected failures were observed for the new anonymous public-page assertions because `/about`, anonymous `/dashboard`, and anonymous `/login` still constructed the Supabase middleware client.

GREEN:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/middleware.test.ts --runInBand
```

Result: PASS, 13/13 tests.

Type check:

```bash
systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check
```

Result: PASS.

## Scope notes

This slice intentionally did not optimize the root page's `getOptionalServerUser()` call; prior scout t_3e40db28 called that a separate optional follow-up, not required to close the middleware fast-path item.
