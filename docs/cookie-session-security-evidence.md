# Cookie/session security evidence index

Scope: P0/P1 static evidence only. This report maps the current cookie/session security controls, helper usage, and remaining live-auth validation gates without using live sessions, credentials, or secret values.

## Executive status

- P0: Supabase auth cookies refreshed by middleware/server helpers are forced to `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, and production-only `secure: true` through `buildSupabaseSessionCookieOptions`.
- P0: Protected page routing has an anonymous fast path: if the expected Supabase auth cookie is absent, protected pages redirect to `/login?redirectTo=...` without calling Supabase.
- P0: API routes bypass middleware auth checks and own auth inside handlers, preventing middleware from treating API auth differently from route-local bearer/cookie validation.
- P1: Browser, server, API, and middleware clients share hostname/project-derived auth storage naming through `getSupabaseAuthStorageKey`, reducing accidental cross-host/project cookie collisions.
- P1: Refresh-token failures and Supabase auth timeouts degrade to unauthenticated flows rather than crashing middleware or repeatedly replaying stale cookies.

## Cookie/session settings map

| Area | Source | Current setting/evidence | Gate |
| --- | --- | --- | --- |
| Shared refreshed-cookie options | `src/lib/supabase/cookie-options.ts` | `buildSupabaseSessionCookieOptions` preserves Supabase options but defaults `maxAge` to 7 days, `path` to `/`, `sameSite` to `lax`, forces `secure` when `NODE_ENV === 'production'`, and forces `httpOnly: true`. | P0 |
| Middleware refreshed cookies | `middleware.ts` | Middleware calls `supabaseResponse.cookies.set(name, value, buildSupabaseSessionCookieOptions(options))` inside Supabase `setAll`, so refreshed auth cookies inherit the shared hardened options. | P0 |
| Server Component/server-action cookies | `src/lib/supabase/server.ts` | Server client `setAll` writes through `cookieStore.set(..., buildSupabaseSessionCookieOptions(options))`; Server Component write failures are intentionally swallowed per Supabase SSR guidance because middleware refresh owns session renewal. | P0 |
| Browser Supabase client | `src/lib/supabase/client.ts` | Browser client sets cookie/storage name to the shared auth storage key, `path: '/'`, `sameSite: 'lax'`, and enables `autoRefreshToken`/`persistSession`. Browser-visible state remains expected for Supabase client operation; refreshed server cookies are hardened server-side. | P1 |
| Middleware cookie name | `middleware.ts` + `src/lib/supabase/storage-keys.ts` | Expected cookie is `sb-${hostSlug}-${projectFingerprint}-auth-token`, derived from hostname, Supabase URL hostname/path, and anon-key prefix slug. | P1 |
| Server/API cookie name | `src/lib/supabase/server.ts` | Server contexts derive hostname from `headers().get('host')`; API contexts derive from `request.headers.get('host')`, keeping cookie lookup aligned with middleware/browser clients. | P1 |
| Invalid refresh-token cleanup | `middleware.ts` + `src/lib/supabase/auth-helpers.ts` | Errors with `refresh_token_not_found`, `invalid_refresh_token`, or matching messages are treated as unauthenticated, and matching `sb-*-auth-token` cookies are deleted from the response. | P0 |
| Auth timeout cleanup | `middleware.ts` | Supabase auth fetch uses `AbortController` via `createSupabaseTimeoutFetch` and treats timeout/abort as unauthenticated. | P1 |

## Helper usage index

| Helper/control | Primary sources | Observed usage |
| --- | --- | --- |
| `buildSupabaseSessionCookieOptions` | `src/lib/supabase/cookie-options.ts`, `middleware.ts`, `src/lib/supabase/server.ts` | Used by both middleware and server Supabase `setAll`; covered by unit tests under `__tests__/unit/middleware.test.ts`, `__tests__/unit/lib/supabase/cookie-options.test.ts`, and `__tests__/unit/lib/supabase/server-cookie-options.test.ts`. |
| `getSupabaseAuthStorageKey` | `src/lib/supabase/storage-keys.ts` | Used by browser, server, API, middleware, login form, and auth e2e setup to keep cookie/storage names aligned. |
| `requireUserFromRequest` | `src/lib/api/auth.ts` | Central route auth boundary; 22 source/test files reference it. App API usage includes maps geocode/autocomplete, property/neighborhood vibes, interactions/reset, users avatar/search, and couples activity/check-mutual/disputed/mutual-likes/notify/stats. |
| `createApiClient` | `src/lib/supabase/server.ts` | API-specific Supabase client reads request cookies and optional bearer auth, disables auto-refresh/persistence, and lets route handlers set response cookies explicitly if needed. |
| `withRefreshRecovery` | `src/lib/supabase/refresh-recovery.ts` | Wraps browser/server/API clients so invalid refresh-token errors clear stale local session state and return null session/user instead of bubbling brittle auth errors. |
| `src/middleware.ts` re-export | `src/middleware.ts` | Re-exports root middleware/config so Next discovers middleware for the `src/app` tree. Unit coverage asserts the protected-route guard is exposed through this entrypoint. |

## Current static validation evidence

- `__tests__/unit/middleware.test.ts` covers missing Supabase env behavior, API fast path, anonymous protected-page redirects, src-directory middleware entrypoint, matcher exclusions, timeout implementation, and hardened refreshed-cookie options.
- `__tests__/unit/lib/supabase/cookie-options.test.ts` and `__tests__/unit/lib/supabase/server-cookie-options.test.ts` cover shared cookie option behavior and server client adoption of the shared helper.
- `__tests__/unit/lib/api/auth.test.ts` and `__tests__/unit/api/auth-boundary-consolidation.test.ts` cover bearer-token fallback and consolidated unauthorized response behavior for API routes.
- Static scan during this report found the expected helper references; no live auth session, credential, or production cookie was read.

## Remaining live-auth validation gates

These are intentionally not executed in this Phase 0/1 report because they require a live browser/auth session or deployment cookie observation.

1. P0 live browser cookie gate: in a production-like HTTPS deployment, log in with an approved test account and verify the Supabase auth cookie emitted after middleware refresh has `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and the expected hostname/project-specific `sb-...-auth-token` name.
2. P0 anonymous protected-route gate: with no auth cookies, request `/dashboard`, `/couples`, `/profile`, and `/settings`; verify each returns a 307/redirect to `/login` with a safe same-origin `redirectTo` value and no Supabase auth call is needed for the anonymous path.
3. P0 stale-cookie gate: inject a stale/invalid Supabase refresh cookie in a non-production test deployment and verify middleware deletes matching `sb-*-auth-token` cookies and treats the request as unauthenticated.
4. P1 authenticated auth-route gate: with a valid auth cookie, request `/login?redirectTo=/dashboard`; verify middleware calls `auth.getUser()` and redirects to the safe redirect target or `/dashboard`.
5. P1 API auth boundary gate: call representative protected API routes with bearer token, cookie-only session, and no auth; verify `requireUserFromRequest` accepts valid auth and returns the standardized unauthorized response for missing/invalid auth.
6. P1 timeout/failure gate: temporarily lower `MIDDLEWARE_SUPABASE_TIMEOUT_MS` in a staging/dev deployment and verify middleware degrades to unauthenticated without orphaned Supabase auth work.

## Follow-up notes

- Keep future cookie/session changes routed through `buildSupabaseSessionCookieOptions` and `getSupabaseAuthStorageKey`; avoid per-route cookie option forks.
- API routes should continue to use `createApiClient(request)` plus `requireUserFromRequest` instead of open-coding `supabase.auth.getUser()`.
- Live validation evidence should record only attributes/status codes and never raw cookie values, JWTs, refresh tokens, test-user credentials, or screenshots containing session material.
