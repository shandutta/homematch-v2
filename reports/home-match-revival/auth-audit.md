# Auth Architecture Audit — HomeMatch v2

**Date**: 2026-05-07  
**Auditor**: Hermes Analyst (run 136, attempt 15)  
**Scope**: Supabase Auth, Next.js middleware, DB tables, frontend flows, tests, RLS policies

---

## Architecture Overview

HomeMatch uses **Supabase Auth** with the `@supabase/ssr` package and Next.js 15 App Router. The auth boundary is enforced at three layers:

1. **Middleware** (`middleware.ts`) — checks every request, redirects unauthenticated users from protected routes to `/login`
2. **API auth helper** (`src/lib/api/auth.ts`) — `requireUserFromRequest()` for route handlers
3. **Database RLS** (28+ policies) — row-level security on all user-data tables

Four Supabase client variants:

- **Browser client** (`client.ts`) — `createBrowserClient`, PKCE, localStorage + cookies
- **Server client** (`server.ts` → `createClient()`) — SSR with cookie store
- **API client** (`server.ts` → `createApiClient()`) — reads cookies from `NextRequest`
- **Service role client** (`service-role-client.ts`) — admin operations, gated by authorization check

---

## Strengths (Keep)

| Area                       | What works well                                                                       | Why                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Auth flow type**         | PKCE everywhere (server, browser, API, middleware)                                    | Industry standard for SPAs; no client secret exposure             |
| **Refresh token handling** | `withRefreshRecovery()` wrapper clears stale sessions on invalid refresh token        | Prevents infinite redirect loops; matches Supabase best practices |
| **Redirect safety**        | `getSafeRedirectPath()` validates redirect targets (no `//`, `://`, non-`/` prefixes) | Prevents open redirect attacks                                    |
| **Security headers**       | CSP, HSTS, X-Frame-Options, XSS-Protection, Referrer-Policy, Permissions-Policy       | Comprehensive defense-in-depth                                    |
| **API auth consistency**   | `requireUserFromRequest()` returns typed `{user, response}` union                     | No route handler can forget the 401 check                         |
| **RLS coverage**           | All 6 user-data tables have RLS enabled with row-level ownership policies             | Database-level enforcement independent of application             |
| **Bearer token fallback**  | API client auto-injects Authorization header as bearer token into `getUser()`         | Enables native mobile / headless API consumers                    |
| **Service role gating**    | `createServiceClient()` in `server.ts` checks admin role before returning             | Prevents accidental service role exposure                         |
| **Rate limiting**          | In-memory limiter on interactions API (per-user) and maps API (per-IP)                | Protects expensive endpoints                                      |
| **Cookie naming**          | `getSupabaseAuthStorageKey()` derives host-specific key from project URL fingerprint  | Multi-environment isolation without env vars                      |
| **Auth config guard**      | Middleware redirects protected routes to `/login` when Supabase env is missing        | Graceful degradation                                              |
| **Test mode**              | Middleware skips auth for API routes in test mode; rate limiter bypass                | No test flakiness from auth/rate-limiting                         |

---

## Issues and Recommendations

### P0 — Fix immediately

| #   | Issue                                           | Location                                        | Recommendation                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cookies are `httpOnly: false`**               | `middleware.ts:162` and `server.ts:136`         | The `setAll` handler sets `httpOnly: false` to "allow client-side to read cookie for session hydration." This exposes the auth token to XSS. The Supabase browser client stores the session in `localStorage` under the storageKey — it doesn't need cookie access. **Set `httpOnly: true`**. |
| 2   | **Maps autocomplete has no auth**               | `src/app/api/maps/places/autocomplete/route.ts` | Only IP-based rate limiting. The Google Places API costs money per call. **Add `requireUserFromRequest()` or at minimum a shared secret token header.**                                                                                                                                       |
| 3   | **Service role authorization is a placeholder** | `server.ts:290-307`                             | `checkServiceRoleAuthorization()` comment says "This is a placeholder - implement your actual admin check logic." Currently any user with `role === 'admin'` in `user_profiles` gets service role. **Implement proper RBAC — either Supabase custom claims or a separate admin table.**       |

### P1 — Fix before production launch

| #   | Issue                                                | Location                                   | Recommendation                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | **Dual client creation paths**                       | `server.ts` vs `factory.ts`                | Two parallel implementations for creating Supabase clients. The factory has a `FEATURE_UNIFIED_CLIENT_FACTORY` flag and `MockSupabaseClientFactory` for tests, but most code uses the direct `server.ts`/`client.ts` imports. **Pick one path and consolidate. The factory has better test support.** |
| 5   | **Factory `createServerClientAsync()` is a stub**    | `factory.ts:92-95`                         | Throws "Use createServerClient() for async server contexts." The private method is dead code but the class has `createServerClient()` public — confusing naming. **Remove the stub.**                                                                                                                 |
| 6   | **In-memory rate limiter**                           | `src/lib/utils/rate-limit.ts`              | Uses a `Map` — resets on every cold start. On Vercel serverless, this means no effective rate limiting. **Consider Upstash Redis or Vercel KV, or accept this as a dev convenience.**                                                                                                                 |
| 7   | **Interactions API uses service role fallback**      | `src/app/api/interactions/route.ts:78-108` | Tries to fetch `household_id` via normal client, falls back to service role if RLS blocks it. This is a workaround for a data model issue. **Fix the RLS policy or add a `household_id` column to the auth JWT claims, then remove service role fallback.**                                           |
| 8   | **Auth `server.ts` has duplicate code**              | `server.ts:234-243`                        | `createApiClient` monkey-patches `getUser` again even though `withRefreshRecovery` already wrapped it. The bear token monkey-patch is on top of the recovery wrapper — two layers of function replacement. **Hard to reason about. Flatten the patching order.**                                      |
| 9   | **Missing `createServerClient` AuthApiError import** | `server.ts:2`                              | `AuthApiError` is imported but not used in `error instanceof AuthApiError` check — it's used inside `withRefreshRecovery` which checks `error instanceof AuthApiError` correctly. OK but unused import is noise.                                                                                      |

### P2 — Nice to have

| #   | Issue                                            | Location                             | Recommendation                                                                                                                                                                                             |
| --- | ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | **No E2E auth tests**                            | Test suite                           | Unit tests cover `requireUserFromRequest` and middleware config guard. No Playwright/E2E test for login→dashboard→protected route flow. **Add a Playwright test for the happy path.**                      |
| 11  | **Password requirements mismatch**               | `config.toml:147` vs `auth.ts:18-21` | Config says `minimum_password_length = 6`, schema requires 8+ with uppercase/lowercase/number. **Set config to `password_requirements = "lower_upper_letters_digits"` and `minimum_password_length = 8`.** |
| 12  | **Email confirmations disabled**                 | `config.toml:181`                    | `enable_confirmations = false` — users can sign in without verifying email. **Enable for production.**                                                                                                     |
| 13  | **CAPTCHA not configured**                       | `config.toml:168-172`                | Captcha section is commented out. **Enable Turnstile or hCaptcha for signup.**                                                                                                                             |
| 14  | **Factory `shouldCache` caches SERVICE clients** | `factory.ts:261-265`                 | Service role client is cached (singleton in Map). If the service role key rotates, the cache holds the stale client. Low risk but worth noting.                                                            |

---

## RLS Policy Audit

All 6 tables with user data have proper RLS:

| Table                        | Policies                                                         | Verdict |
| ---------------------------- | ---------------------------------------------------------------- | ------- |
| `user_profiles`              | SELECT/UPDATE/INSERT own row + `supabase_auth_admin` full access | Correct |
| `households`                 | SELECT/UPDATE for members only                                   | Correct |
| `neighborhoods`              | Public SELECT                                                    | Correct |
| `properties`                 | Public SELECT (is_active=true)                                   | Correct |
| `user_property_interactions` | SELECT/INSERT/UPDATE own rows + DELETE policy (added later)      | Correct |
| `saved_searches`             | CRUD own rows                                                    | Correct |

**Missing**: No policy on `household_invitations` table (exists in DB types but no RLS policy found in migrations). If this table stores invitation tokens, it should have RLS.

---

## Deletion / Migration Map

### Can delete (dead code / unused)

| Item                                                 | Reason                                      |
| ---------------------------------------------------- | ------------------------------------------- |
| `factory.ts:92-95` (`createServerClientAsync`)       | Dead stub                                   |
| `factory.ts:346-366` (`createClientWithFeatureFlag`) | Feature flag is always off; fallback throws |
| `standalone.ts`                                      | Not audited — check if imported anywhere    |

### Can consolidate (merge)

| From                                | Into                              | Reason                                           |
| ----------------------------------- | --------------------------------- | ------------------------------------------------ |
| `server.ts` (direct `createClient`) | `factory.ts`                      | Dual code paths; factory has better test support |
| `client.ts` (direct `createClient`) | `factory.ts`                      | Same as above                                    |
| `service-role-client.ts`            | `server.ts` `createServiceClient` | Factory already wraps this                       |

### Must fix (no delete option)

| Item                              | Action                             |
| --------------------------------- | ---------------------------------- |
| `middleware.ts` cookie `httpOnly` | Change to `true`                   |
| Maps autocomplete auth            | Add `requireUserFromRequest`       |
| Service role auth check           | Replace placeholder with real RBAC |

---

## Test Coverage

| File                                  | Tests                                                                         | Coverage                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/api/auth.ts`                 | `auth.test.ts` — 4 tests covering bearer token, cookie fallback, unauthorized | Good                                                                              |
| `middleware.ts`                       | `middleware.test.ts` — 3 tests for missing-env guard                          | Thin — no tests for authenticated flow, redirect logic, or refresh token recovery |
| `src/lib/supabase/optional-user.ts`   | `optional-user.test.ts`                                                       | Present but not reviewed                                                          |
| `src/lib/routing/protected-routes.ts` | `protected-routes.test.ts`                                                    | Present but not reviewed                                                          |

**Gap**: No integration tests for the full auth lifecycle (signup → verify → login → dashboard → logout). No test for middleware with actual Supabase cookies.

---

## Verdict: KEEP Supabase Auth

Supabase Auth is well-integrated. The fundamental architecture (PKCE, RLS, middleware boundary, consistent API auth helper) is sound. The issues are all fixable configuration and code cleanup items — none require replacing the auth provider.

**Replace would only be justified if**: migrating to a self-hosted auth solution for cost/control reasons, or switching to a different BaaS entirely. Neither applies to this project.
