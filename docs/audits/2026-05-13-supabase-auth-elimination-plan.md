# Supabase auth elimination — migration plan

**Date:** 2026-05-13
**Decision (user, this session):** Eliminate Supabase auth entirely. Clerk is the sole identity provider going forward.
**Status:** plan only — no code in this commit. Implementation will land in a follow-up branch.

---

## Why

Per the 2026-05-13 backend audit, the dual-auth surface (Clerk in middleware + Supabase RLS keyed on `auth.uid()`) is the codebase's largest source of complexity. Symptoms:

- `auth.uid()` returns NULL for Clerk-authenticated requests (no Supabase session). PR #37 (HOUSEHOLD-001) was a 4-fix cluster fixing the consequences across `/api/households`, `/api/households/invitations`, `/settings`, `/api/users/me`. Each follow-on feature needs its own bespoke "Clerk-aware" RPC.
- `withRefreshRecovery`, `isInvalidRefreshTokenError`, and the dynamic-host cookie machinery exist only because two parallel sessions can each go stale independently.
- Service-role usage was over-broad (A3 audit finding) precisely because route handlers had no other escape hatch when the anon-key client returned 0 rows for a Clerk user.

Eliminating Supabase auth removes all of the above. RLS continues to gate writes — but it gates against `current_setting('request.jwt.claim.sub', true)` (or a custom claim we set), not Supabase's `auth.uid()`. Reads default to service-role with route-local Clerk verification.

## Scope of removal

### Files that go away entirely

- `src/lib/supabase/refresh-recovery.ts`
- `src/lib/supabase/auth-helpers.ts` (only consumer: refresh-recovery)
- `src/app/login/` (all of it; Clerk owns `/sign-in`)
- `src/app/api/auth/*` (Supabase auth callbacks)
- `legacySupabaseMiddleware` block in `middleware.ts` (~250 lines)
- `middleware.ts` cookie-domain juggling (`hasSupabasePublicConfig`, `cookieName`, `getSupabaseAuthStorageKey`)

### Files that simplify

- `src/lib/supabase/server.ts` — `createClient()` and `createApiClient()` drop the cookie/auth-header/bearer-token machinery. Both become thin `createServerClient` wrappers without the `withRefreshRecovery` overlay or `cookieOptions.name` host indirection.
- `src/lib/supabase/cookie-options.ts` — entire file dies (no Supabase session = no cookie).
- `src/lib/supabase/storage-keys.ts` — entire file dies.
- `middleware.ts` — collapses to: nonce mint, Clerk auth (with timeout from M3), security headers + request-id (A6) + CSP (M1). Probably 100 lines total instead of 510.
- All API routes drop the `requireUserFromRequest` → `isLikelyClerkUserId` → `ensureUserProfileForCurrentClerkUser` ceremony. Replaced by a single `getClerkUserOrFail()` that returns `{ userId, profileId }` or throws `401`.

### RLS rewrite

Every policy that uses `auth.uid()` needs to switch to a Clerk-derived identity. Two patterns:

1. **Service-role + route-local check (preferred for most reads).** Route verifies the Clerk session, looks up `user_profiles.id` via `clerk_user_id`, queries with the service-role client scoped by that ID. Same pattern PR #37 used.
2. **Clerk JWT propagated to PostgREST (advanced).** Set `request.jwt.claim.clerk_user_id` from a JWT-validating function in PostgREST. RLS policies become `clerk_user_id = current_setting('request.jwt.claim.clerk_user_id', true)`. More work to set up; eliminates the service-role round-trip on reads.

**Recommendation: pattern 1 for the migration; consider pattern 2 as a follow-up perf win.**

## Phased plan

### Phase 0 — pre-work (no user-visible change)

- [ ] Capture a Vercel runtime-log baseline of error rates by route. Need a "before" so the migration's effect is measurable.
- [ ] Confirm `auth.users` is not referenced by any FK we still need. PR #37 already dropped the household-invitations FKs. Identify any others.
- [ ] Identify every code path that calls `supabase.auth.*` and tag with the Clerk-equivalent.

### Phase 1 — read paths (low risk)

- [ ] Switch every `createClient()` server-component read to use `getClerkUserOrFail()` + service-role with the appropriate `approvedCapability`. The capability allowlist in `src/lib/supabase/server.ts` already supports `clerk-profile-read`, `clerk-household-write`, etc. Add ones that are missing as they come up.
- [ ] Drop `withRefreshRecovery` from both client constructors. Server reads no longer have a session to recover.
- [ ] **Test:** every protected page renders under a fresh Clerk session.

### Phase 2 — write paths

- [ ] For every write that previously relied on `auth.uid()` in an RLS policy, write a `*_for_user_id(p_user_id, ...)` SECURITY DEFINER RPC (PR #37 / HOUSEHOLD-001 set the precedent). API route resolves the Clerk session → user_profiles.id, then calls the RPC under service-role.
- [ ] Drop the `auth.users` FK on `user_profiles.id` (PR #35 already did this; verify no other FKs to `auth.users` remain on app tables).
- [ ] **Test:** every interaction (like/dislike/skip), invite create/accept, household join, settings update.

### Phase 3 — middleware collapse

- [ ] Delete `legacySupabaseMiddleware`. Replace with a single Clerk-aware path.
- [ ] If `isClerkProtectedRoute(req)` matches and `clerkUserId` is null → redirect to `/sign-in?redirectTo=…`.
- [ ] Drop the cookie-domain machinery, hostname-specific cookie names, refresh-token detection.
- [ ] **Test:** every unauthenticated visit to a protected route lands on `/sign-in` with the right redirect query.

### Phase 4 — file removal

- [ ] Delete the files listed under "Files that go away entirely".
- [ ] Delete `/api/auth/*`.
- [ ] Drop the `@supabase/ssr` dependency if no other module imports it. (`@supabase/supabase-js` stays for the service-role client.)
- [ ] Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` from required env vars. The anon key isn't needed when no client-side or RLS-bound calls are made; only the service-role key matters.

### Phase 5 — DB cleanup

- [ ] Drop every RLS policy that references `auth.uid()`. (They become unreachable after Phase 1+2.)
- [ ] Drop the `admin_role_assignments` table — the admin-runtime authorization fallback was already removed in A3.
- [ ] Truncate `auth.users` once no rows are needed for legacy lookup. (Keep the table; Supabase needs it but no rows.)

## What this migration does NOT touch

- Supabase Postgres (the database) — keeps everything. Rows, indexes, RPCs, PostGIS, all stay.
- Supabase Storage — `avatars` bucket and any future buckets — stay. Storage RLS policies need the Clerk-aware rewrite (same as table RLS).
- Supabase Realtime — stays if used. Channels need a Clerk-derived identity.

## Migration gotchas to plan for

- **Existing user_profiles rows keyed off legacy Supabase auth.users.id.** PR #37 already handled this — `user_profiles.id` is no longer FK'd to `auth.users.id`. Confirm nothing else depends on the link.
- **Supabase email-link confirmation flows.** Anything that relied on Supabase sending the email (sign-up confirmation, password reset, magic link) is already gone — Clerk owns those.
- **Local dev.** `pnpm dev` against local Supabase still needs the anon key for direct DB queries. The elimination doesn't change that — anon key stays in `.env.local`, just isn't used for auth.
- **Race during the rollout.** Phase 1 + 2 must land before Phase 3 (middleware collapse). Otherwise, in-flight users with a Supabase session lose access mid-session. Coordinate with Vercel deploy windows.

## Time estimate

- Phase 0: half a day
- Phase 1: 1 day
- Phase 2: 2-3 days (most of the surface)
- Phase 3: half a day
- Phase 4 + 5: half a day
- Soak time + bug fixes: 2 days

**Total: ~1.5 weeks** for a careful incremental rollout. Could compress to 3-4 days if behind a feature flag with a kill switch.

## Open questions

1. Does Clerk support exporting the existing user list to a portable format we'd want to preserve? (We're past the "cutover" decision but if Clerk-as-source-of-truth has data we need elsewhere, plan extraction now.)
2. Do we want to keep the `admin_role_assignments` table for ops (e.g., feature-flagging admins) even though it's no longer auth-gating?
3. Pattern 1 (service-role + route check) vs Pattern 2 (Clerk JWT in PostgREST claims) — start with Pattern 1, evaluate Pattern 2 after a month?
